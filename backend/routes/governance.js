const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/auditLog');
const { rolePageAccess } = require('../middleware/roleAccess');

// Helper: check if user's role has access to a specific sub-resource
function hasAccess(role, resource) {
  const pages = rolePageAccess[role];
  return pages && pages.includes(resource);
}

// GET /api/governance/conflict-queue
// Accessible to: founding_orchestrator, pmo_coordinator, solution_architect, partner owners (conflict-queue)
router.get('/conflict-queue', auth, async (req, res) => {
  if (!hasAccess(req.user.role, 'conflict-queue') && !hasAccess(req.user.role, 'governance')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const opResult = await pool.query(
      `SELECT op.id, 'opportunity' AS entity_type, op.opportunity_name AS name,
       op.conflict_flag, op.visibility_level, op.notes,
       op.created_at, op.updated_at,
       u.full_name AS deal_owner_name, su.full_name AS source_owner_name,
       sp.full_name AS sponsor_name, o.org_name AS account_name
       FROM opportunities op
       LEFT JOIN users u ON op.deal_owner_user_id = u.id
       LEFT JOIN users su ON op.source_owner_user_id = su.id
       LEFT JOIN users sp ON op.sponsor_user_id = sp.id
       LEFT JOIN organizations o ON op.account_org_id = o.id
       WHERE op.conflict_flag = true
       ORDER BY op.updated_at DESC`
    );

    const leadResult = await pool.query(
      `SELECT l.id, 'lead' AS entity_type, l.lead_name AS name,
       l.conflict_flag, l.visibility_level,
       l.created_at, l.updated_at,
       u.full_name AS source_owner_name, sp.full_name AS sponsor_name,
       o.org_name AS account_name
       FROM leads l
       LEFT JOIN users u ON l.source_owner_user_id = u.id
       LEFT JOIN users sp ON l.sponsor_user_id = sp.id
       LEFT JOIN organizations o ON l.organization_id = o.id
       WHERE l.conflict_flag = true
       ORDER BY l.updated_at DESC`
    );

    const combined = [...opResult.rows, ...leadResult.rows]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    const total = combined.length;
    const paginated = combined.slice(offset, offset + limit);

    if (req.user.role !== 'founding_orchestrator') {
      // Summary view: strip sensitive fields for non-governance roles
      const summaryData = paginated.map(item => {
        const { notes, visibility_level, ...rest } = item;
        return rest;
      });
      return res.json({ data: summaryData, total, page, limit, totalPages: Math.ceil(total / limit), access_mode: 'summary' });
    }

    res.json({ data: paginated, total, page, limit, totalPages: Math.ceil(total / limit), access_mode: 'full' });
  } catch (err) {
    console.error('Conflict queue error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/governance/conflict-queue/:type/:id/resolve
router.put('/conflict-queue/:type/:id/resolve', auth, async (req, res) => {
  if (!hasAccess(req.user.role, 'conflict-queue') && !hasAccess(req.user.role, 'governance')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { type, id } = req.params;
    const { resolution_notes, resolution_type, assigned_owner_user_id, co_sell_flag } = req.body;

    if (!['opportunity', 'lead'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "opportunity" or "lead"' });
    }
    if (!resolution_notes) {
      return res.status(400).json({ error: 'resolution_notes is required' });
    }

    const table = type === 'opportunity' ? 'opportunities' : 'leads';

    // For leads, check if the lead is still in its protected window
    let protectedWindowNote = '';
    if (type === 'lead') {
      const leadCheck = await pool.query(
        'SELECT protected_until, source_owner_user_id FROM leads WHERE id = $1',
        [id]
      );
      if (leadCheck.rows.length > 0 && leadCheck.rows[0].protected_until) {
        const protectedUntil = new Date(leadCheck.rows[0].protected_until);
        if (protectedUntil > new Date()) {
          protectedWindowNote = ` [Note: Lead is still in protected window until ${protectedUntil.toISOString().split('T')[0]}. Source owner has priority.]`;
        }
      }
    }

    // Build the resolution note with structured data
    let fullResolutionNote = resolution_notes + protectedWindowNote;
    if (resolution_type) {
      fullResolutionNote = `[${resolution_type}] ${fullResolutionNote}`;
    }
    if (co_sell_flag) {
      fullResolutionNote += ' [Co-sell arrangement established]';
    }

    const result = await pool.query(
      `UPDATE ${table}
       SET conflict_flag = false,
           notes = COALESCE(notes, '') || E'\n[Conflict Resolved] ' || $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [fullResolutionNote, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `${type} not found` });
    }

    // If assigned_owner_user_id provided and type is opportunity, update deal_owner_user_id
    if (assigned_owner_user_id && type === 'opportunity') {
      await pool.query(
        'UPDATE opportunities SET deal_owner_user_id = $1, updated_at = NOW() WHERE id = $2',
        [assigned_owner_user_id, id]
      );
    }

    // If assigned_owner_user_id provided and type is lead, update source_owner_user_id
    if (assigned_owner_user_id && type === 'lead') {
      await pool.query(
        'UPDATE leads SET source_owner_user_id = $1, updated_at = NOW() WHERE id = $2',
        [assigned_owner_user_id, id]
      );
    }

    await logAudit({
      actorUserId: req.user.id,
      actionType: 'conflict_resolution',
      entityType: type,
      entityId: parseInt(id),
      newValue: { resolution_notes, resolution_type, assigned_owner_user_id, co_sell_flag },
      ipAddress: req.ip,
    });

    // Notify affected users about conflict resolution
    const { createNotification } = require('../utils/notify');
    const affected = result.rows[0];
    const notifyTargets = new Set();
    if (type === 'opportunity') {
      if (affected.deal_owner_user_id) notifyTargets.add(affected.deal_owner_user_id);
      if (affected.source_owner_user_id) notifyTargets.add(affected.source_owner_user_id);
    } else {
      if (affected.source_owner_user_id) notifyTargets.add(affected.source_owner_user_id);
    }
    if (assigned_owner_user_id) notifyTargets.add(parseInt(assigned_owner_user_id));
    notifyTargets.delete(req.user.id);
    for (const uid of notifyTargets) {
      await createNotification({
        userId: uid,
        type: 'conflict_resolved',
        title: 'Conflict Resolved',
        message: `Conflict on ${type} "${affected.opportunity_name || affected.lead_name}" has been resolved${resolution_type ? ` (${resolution_type})` : ''}`,
        entityType: type,
        entityId: parseInt(id)
      });
    }

    // Re-fetch after potential ownership update
    const updated = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);

    res.json({ data: updated.rows[0] });
  } catch (err) {
    console.error('Resolve conflict error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/governance/visibility-requests
// Only governance role (founding_orchestrator) can manage visibility approvals
router.get('/visibility-requests', auth, async (req, res) => {
  if (!hasAccess(req.user.role, 'visibility-approvals') && !hasAccess(req.user.role, 'governance')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'pending';

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM visibility_requests WHERE status = $1', [status]
    );

    const result = await pool.query(
      `SELECT vr.*,
       u.full_name AS requester_name,
       r.full_name AS reviewer_name
       FROM visibility_requests vr
       LEFT JOIN users u ON vr.requested_by_user_id = u.id
       LEFT JOIN users r ON vr.reviewed_by_user_id = r.id
       WHERE vr.status = $1
       ORDER BY vr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page, limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('List visibility requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/governance/visibility-requests
router.post('/visibility-requests', auth, async (req, res) => {
  try {
    const { entity_type, entity_id, requested_visibility, reason } = req.body;

    if (!entity_type || !entity_id || !requested_visibility) {
      return res.status(400).json({ error: 'entity_type, entity_id, and requested_visibility are required' });
    }

    const table = entity_type === 'opportunity' ? 'opportunities' : 'leads';
    const entityResult = await pool.query(`SELECT visibility_level FROM ${table} WHERE id = $1`, [entity_id]);

    if (entityResult.rows.length === 0) {
      return res.status(404).json({ error: `${entity_type} not found` });
    }

    const result = await pool.query(
      `INSERT INTO visibility_requests
       (requested_by_user_id, entity_type, entity_id, current_visibility, requested_visibility, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, entity_type, entity_id, entityResult.rows[0].visibility_level, requested_visibility, reason]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Create visibility request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/governance/visibility-requests/:id/review
router.put('/visibility-requests/:id/review', auth, async (req, res) => {
  if (!hasAccess(req.user.role, 'visibility-approvals') && !hasAccess(req.user.role, 'governance')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
    }

    const result = await pool.query(
      `UPDATE visibility_requests
       SET status = $1, reviewed_by_user_id = $2, reviewed_at = NOW(), review_notes = $3
       WHERE id = $4 RETURNING *`,
      [status, req.user.id, review_notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visibility request not found' });
    }

    const request = result.rows[0];

    if (status === 'approved') {
      const table = request.entity_type === 'opportunity' ? 'opportunities' : 'leads';
      await pool.query(
        `UPDATE ${table} SET visibility_level = $1, updated_at = NOW() WHERE id = $2`,
        [request.requested_visibility, request.entity_id]
      );
    }

    await logAudit({
      actorUserId: req.user.id,
      actionType: 'visibility_review',
      entityType: request.entity_type,
      entityId: request.entity_id,
      newValue: { status, review_notes, requested_visibility: request.requested_visibility },
      ipAddress: req.ip,
    });

    // Notify the requester about the decision
    const { createNotification } = require('../utils/notify');
    await createNotification({
      userId: request.requested_by_user_id,
      type: 'visibility_reviewed',
      title: `Visibility Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your visibility request for ${request.entity_type} #${request.entity_id} was ${status}${review_notes ? ': ' + review_notes : ''}`,
      entityType: request.entity_type,
      entityId: request.entity_id
    });

    res.json({ data: request });
  } catch (err) {
    console.error('Review visibility request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/governance/overview
// Governance-level roles get full data; PMO/SA get summary (conflict counts only)
router.get('/overview', auth, async (req, res) => {
  if (!hasAccess(req.user.role, 'governance')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM opportunities WHERE conflict_flag = true) AS opp_conflicts,
        (SELECT COUNT(*) FROM leads WHERE conflict_flag = true) AS lead_conflicts,
        (SELECT COUNT(*) FROM visibility_requests WHERE status = 'pending') AS pending_visibility
    `);

    const isSummaryRole = req.user.role === 'pmo_coordinator' || req.user.role === 'solution_architect';

    if (isSummaryRole) {
      // Summary mode: only conflict counts, no visibility breakdown or recent actions
      return res.json({
        data: {
          ...stats.rows[0],
          total_conflicts: parseInt(stats.rows[0].opp_conflicts) + parseInt(stats.rows[0].lead_conflicts),
        },
        access_mode: 'summary',
      });
    }

    const visBreakdown = await pool.query(
      `SELECT visibility_level, COUNT(*) AS count FROM opportunities GROUP BY visibility_level ORDER BY visibility_level`
    );

    const recentActions = await pool.query(
      `SELECT vr.id, vr.status AS action_result, vr.entity_type, vr.entity_id,
       vr.reviewed_at, vr.review_notes, u.full_name AS reviewer_name
       FROM visibility_requests vr
       LEFT JOIN users u ON vr.reviewed_by_user_id = u.id
       WHERE vr.status IN ('approved', 'rejected')
       ORDER BY vr.reviewed_at DESC LIMIT 10`
    );

    res.json({
      data: {
        ...stats.rows[0],
        total_conflicts: parseInt(stats.rows[0].opp_conflicts) + parseInt(stats.rows[0].lead_conflicts),
        visibility_breakdown: visBreakdown.rows,
        recent_actions: recentActions.rows,
      },
      access_mode: 'full',
    });
  } catch (err) {
    console.error('Governance overview error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
