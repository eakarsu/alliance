const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { leadFilter, canAccessRecord } = require('../middleware/dataFilter');
const { requireWriteAccess, requireOwnershipOrRole } = require('../middleware/writeAccess');

// GET /api/leads
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (l.lead_name ILIKE $${paramIdx} OR l.geography ILIKE $${paramIdx} OR l.vertical ILIKE $${paramIdx} OR l.status ILIKE $${paramIdx} OR o.org_name ILIKE $${paramIdx})`;
      paramIdx++;
    }

    // Role-based data filtering
    const filter = leadFilter(req.user.role, req.user.id, paramIdx);
    whereClause += filter.clause;
    params.push(...filter.params);
    paramIdx = filter.nextParam;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads l LEFT JOIN organizations o ON l.organization_id = o.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT l.*, o.org_name, u.full_name AS source_owner_name, s.full_name AS sponsor_name,
       c.first_name || ' ' || c.last_name AS contact_name
       FROM leads l
       LEFT JOIN organizations o ON l.organization_id = o.id
       LEFT JOIN users u ON l.source_owner_user_id = u.id
       LEFT JOIN users s ON l.sponsor_user_id = s.id
       LEFT JOIN contacts c ON l.contact_id = c.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('List leads error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/leads/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT l.*, o.org_name, u.full_name AS source_owner_name, s.full_name AS sponsor_name,
       c.first_name || ' ' || c.last_name AS contact_name, c.email AS contact_email
       FROM leads l
       LEFT JOIN organizations o ON l.organization_id = o.id
       LEFT JOIN users u ON l.source_owner_user_id = u.id
       LEFT JOIN users s ON l.sponsor_user_id = s.id
       LEFT JOIN contacts c ON l.contact_id = c.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // C1: Data filtering for detail endpoint
    const hasAccess = await canAccessRecord(pool, 'leads', 'l', leadFilter, id, req.user.role, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this lead' });
    }

    const assignments = await pool.query(
      `SELECT la.*, u.full_name AS assigned_user_name
       FROM lead_assignments la
       LEFT JOIN users u ON la.assigned_user_id = u.id
       WHERE la.lead_id = $1`,
      [id]
    );

    const activities = await pool.query(
      `SELECT a.*, u.full_name AS owner_name
       FROM activities a LEFT JOIN users u ON a.owner_user_id = u.id
       WHERE a.related_type = 'lead' AND a.related_id = $1
       ORDER BY a.activity_date DESC LIMIT 10`,
      [id]
    );

    res.json({
      ...result.rows[0],
      assignments: assignments.rows,
      activities: activities.rows,
    });
  } catch (err) {
    console.error('Get lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leads
router.post('/', auth, requireWriteAccess('leads'), async (req, res) => {
  try {
    const { lead_name, source_type, source_owner_user_id, sponsor_user_id, organization_id, contact_id,
      geography, vertical, need_type, estimated_value, confidence_score, visibility_level, status, protected_until, conflict_flag } = req.body;

    if (!lead_name) {
      return res.status(400).json({ error: 'Lead name is required' });
    }

    // Auto-detect conflict: same org + geography
    let autoConflict = conflict_flag || false;
    if (organization_id && geography) {
      const conflictCheck = await pool.query(
        `SELECT id FROM leads WHERE organization_id = $1 AND geography = $2 AND status NOT IN ('disqualified', 'converted')`,
        [organization_id, geography]
      );
      if (conflictCheck.rows.length > 0) autoConflict = true;
    }

    // Set protected window: 90 days from creation for the source owner
    const protectedUntil = protected_until || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const result = await pool.query(
      `INSERT INTO leads (lead_name, source_type, source_owner_user_id, sponsor_user_id, organization_id, contact_id,
       geography, vertical, need_type, estimated_value, confidence_score, visibility_level, status, protected_until, conflict_flag)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [lead_name, source_type, source_owner_user_id || req.user.id, sponsor_user_id, organization_id, contact_id,
        geography, vertical, need_type, estimated_value, confidence_score, visibility_level, status || 'new', protectedUntil, autoConflict]
    );

    // Notify governance if conflict detected
    if (autoConflict) {
      const { notifyUsers, getUsersByRole } = require('../utils/notify');
      const govUsers = await getUsersByRole('founding_orchestrator');
      await notifyUsers({
        userIds: govUsers,
        type: 'conflict_detected',
        title: 'Lead Conflict Detected',
        message: `New lead "${lead_name}" has a potential conflict (same org + geography)`,
        entityType: 'lead',
        entityId: result.rows[0].id
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/leads/:id
router.put('/:id', auth, requireWriteAccess('leads'), requireOwnershipOrRole('leads', ['source_owner_user_id', 'sponsor_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const { lead_name, source_type, source_owner_user_id, sponsor_user_id, organization_id, contact_id,
      geography, vertical, need_type, estimated_value, confidence_score, visibility_level, status, protected_until, conflict_flag } = req.body;

    // Get old visibility to enforce governance-only changes
    const oldLead = await pool.query('SELECT visibility_level FROM leads WHERE id = $1', [id]);

    // Block direct visibility changes for non-governance users - must use visibility approval queue
    const { isFullAccess: isFullAccessCheck } = require('../middleware/dataFilter');
    const effectiveVisibility = (!isFullAccessCheck(req.user.role) && visibility_level && oldLead.rows.length > 0 && oldLead.rows[0].visibility_level !== visibility_level)
      ? oldLead.rows[0].visibility_level  // revert to old value for non-governance
      : visibility_level;

    const visibilityBlocked = (!isFullAccessCheck(req.user.role) && visibility_level && oldLead.rows.length > 0 && oldLead.rows[0].visibility_level !== visibility_level);

    const result = await pool.query(
      `UPDATE leads SET lead_name = $1, source_type = $2, source_owner_user_id = $3, sponsor_user_id = $4,
       organization_id = $5, contact_id = $6, geography = $7, vertical = $8, need_type = $9,
       estimated_value = $10, confidence_score = $11, visibility_level = $12, status = $13,
       protected_until = $14, conflict_flag = $15, updated_at = NOW()
       WHERE id = $16 RETURNING *`,
      [lead_name, source_type, source_owner_user_id, sponsor_user_id, organization_id, contact_id,
        geography, vertical, need_type, estimated_value, confidence_score, effectiveVisibility, status,
        protected_until, conflict_flag, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      ...result.rows[0],
      ...(visibilityBlocked ? { visibility_change_blocked: 'Visibility changes require governance approval. Please submit a visibility request.' } : {})
    });
  } catch (err) {
    console.error('Update lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leads/:id/convert - Convert lead to opportunity
router.post('/:id/convert', auth, requireWriteAccess('leads'), async (req, res) => {
  try {
    const { id } = req.params;
    const { opportunity_name, deal_type, pipeline_id, stage_id, deal_path_id,
      deal_owner_user_id, estimated_total_value, expected_close_date, notes,
      technical_partner_user_id, product_owner_user_id, delivery_owner_user_id } = req.body;

    // Get the lead
    const leadResult = await pool.query(
      `SELECT l.*, o.org_name FROM leads l LEFT JOIN organizations o ON l.organization_id = o.id WHERE l.id = $1`,
      [id]
    );
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const lead = leadResult.rows[0];

    // C4: Check user is source_owner, sponsor, or full access
    const { isFullAccess } = require('../middleware/dataFilter');
    if (!isFullAccess(req.user.role) && req.user.role !== 'pmo_coordinator' && req.user.role !== 'solution_architect') {
      if (lead.source_owner_user_id !== req.user.id && lead.sponsor_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the source owner or sponsor can convert this lead' });
      }
    }

    if (lead.status === 'converted') {
      return res.status(400).json({ error: 'Lead has already been converted' });
    }

    // Auto-detect conflict: same org + geography
    let conflictFlag = false;
    if (lead.organization_id && lead.geography) {
      const conflictCheck = await pool.query(
        `SELECT id FROM leads WHERE organization_id = $1 AND geography = $2 AND id != $3 AND status != 'disqualified'`,
        [lead.organization_id, lead.geography, id]
      );
      if (conflictCheck.rows.length > 0) conflictFlag = true;
    }

    const oppName = opportunity_name || `${lead.lead_name} - Opportunity`;

    // Create the opportunity
    const oppResult = await pool.query(
      `INSERT INTO opportunities (opportunity_name, lead_id, account_org_id, deal_owner_user_id,
       source_owner_user_id, sponsor_user_id, pipeline_id, stage_id, deal_type,
       estimated_total_value, expected_close_date, visibility_level, conflict_flag, notes,
       technical_partner_user_id, product_owner_user_id, delivery_owner_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [oppName, id, lead.organization_id, deal_owner_user_id || req.user.id,
       lead.source_owner_user_id, lead.sponsor_user_id, pipeline_id || 1, stage_id || 1,
       deal_type, estimated_total_value || lead.estimated_value, expected_close_date,
       lead.visibility_level, conflictFlag, notes,
       technical_partner_user_id, product_owner_user_id, delivery_owner_user_id]
    );

    const opportunity = oppResult.rows[0];

    // Auto-create opportunity_roles entries for each provided role
    const roleEntries = [
      { user_id: lead.source_owner_user_id, role: 'source_owner' },
      { user_id: deal_owner_user_id || req.user.id, role: 'deal_owner' },
      { user_id: technical_partner_user_id, role: 'technical_partner' },
      { user_id: product_owner_user_id, role: 'product_owner' },
      { user_id: delivery_owner_user_id, role: 'delivery_owner' },
    ].filter(r => r.user_id);

    for (const entry of roleEntries) {
      await pool.query(
        'INSERT INTO opportunity_roles (opportunity_id, user_id, role_in_opportunity) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [opportunity.id, entry.user_id, entry.role]
      );
    }

    // Link deal path if provided
    if (deal_path_id) {
      await pool.query(
        `INSERT INTO opportunity_paths (opportunity_id, deal_path_id, primary_flag) VALUES ($1, $2, true)`,
        [opportunity.id, deal_path_id]
      );
    }

    // Auto-create revenue share for referral partners
    if (lead.source_type === 'referral' && lead.source_owner_user_id) {
      await pool.query(
        `INSERT INTO opportunity_revenue_shares (opportunity_id, beneficiary_user_id, share_type, share_percent, share_basis, payout_status)
         VALUES ($1, $2, 'referral_fee', 10.00, 'total_value', 'pending')
         ON CONFLICT DO NOTHING`,
        [opportunity.id, lead.source_owner_user_id]
      );
    }

    // Update lead status to converted
    await pool.query(
      `UPDATE leads SET status = 'converted', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Audit log
    const { logAudit } = require('../utils/auditLog');
    await logAudit({
      actorUserId: req.user.id,
      actionType: 'lead_conversion',
      entityType: 'lead',
      entityId: parseInt(id),
      newValue: { opportunity_id: opportunity.id },
      ipAddress: req.ip,
    });

    // Notify stakeholders about conversion
    const { createNotification } = require('../utils/notify');
    const stakeholders = new Set([lead.source_owner_user_id, lead.sponsor_user_id].filter(Boolean));
    for (const uid of stakeholders) {
      if (uid !== req.user.id) {
        await createNotification({
          userId: uid,
          type: 'lead_converted',
          title: 'Lead Converted to Opportunity',
          message: `"${lead.lead_name}" has been converted to opportunity "${opportunity.opportunity_name}"`,
          entityType: 'opportunity',
          entityId: opportunity.id
        });
      }
    }

    res.status(201).json({ lead_id: parseInt(id), opportunity: opportunity });
  } catch (err) {
    console.error('Convert lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', auth, requireWriteAccess('leads'), requireOwnershipOrRole('leads', ['source_owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
