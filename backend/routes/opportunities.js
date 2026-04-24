const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { opportunityFilter, canAccessRecord, isFullAccess } = require('../middleware/dataFilter');
const { requireWriteAccess, requireOwnershipOrRole } = require('../middleware/writeAccess');

// GET /api/opportunities
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
      whereClause += ` AND (op.opportunity_name ILIKE $${paramIdx} OR o.org_name ILIKE $${paramIdx} OR op.deal_type ILIKE $${paramIdx})`;
      paramIdx++;
    }

    // Role-based data filtering
    const filter = opportunityFilter(req.user.role, req.user.id, paramIdx);
    whereClause += filter.clause;
    params.push(...filter.params);
    paramIdx = filter.nextParam;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM opportunities op LEFT JOIN organizations o ON op.account_org_id = o.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT op.*, o.org_name AS account_name, u.full_name AS deal_owner_name,
       s.stage_name, p.pipeline_name, pe.entity_name AS billing_entity_name
       FROM opportunities op
       LEFT JOIN organizations o ON op.account_org_id = o.id
       LEFT JOIN users u ON op.deal_owner_user_id = u.id
       LEFT JOIN stages s ON op.stage_id = s.id
       LEFT JOIN pipelines p ON op.pipeline_id = p.id
       LEFT JOIN partner_entities pe ON op.billing_entity_id = pe.id
       ${whereClause}
       ORDER BY op.created_at DESC
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
    console.error('List opportunities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/opportunities/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT op.*, o.org_name AS account_name, u.full_name AS deal_owner_name,
       su.full_name AS source_owner_name, sp.full_name AS sponsor_name,
       s.stage_name, p.pipeline_name, pe.entity_name AS billing_entity_name,
       tp.full_name AS technical_partner_name, po.full_name AS product_owner_name,
       do2.full_name AS delivery_owner_name
       FROM opportunities op
       LEFT JOIN organizations o ON op.account_org_id = o.id
       LEFT JOIN users u ON op.deal_owner_user_id = u.id
       LEFT JOIN users su ON op.source_owner_user_id = su.id
       LEFT JOIN users sp ON op.sponsor_user_id = sp.id
       LEFT JOIN stages s ON op.stage_id = s.id
       LEFT JOIN pipelines p ON op.pipeline_id = p.id
       LEFT JOIN partner_entities pe ON op.billing_entity_id = pe.id
       LEFT JOIN users tp ON op.technical_partner_user_id = tp.id
       LEFT JOIN users po ON op.product_owner_user_id = po.id
       LEFT JOIN users do2 ON op.delivery_owner_user_id = do2.id
       WHERE op.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // C1: Data filtering for detail endpoint
    const hasAccess = await canAccessRecord(pool, 'opportunities', 'op', opportunityFilter, id, req.user.role, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this opportunity' });
    }

    const products = await pool.query(
      `SELECT opp.*, pr.product_name, pr.category
       FROM opportunity_products opp
       LEFT JOIN products pr ON opp.product_id = pr.id
       WHERE opp.opportunity_id = $1`,
      [id]
    );

    const revenueShares = await pool.query(
      `SELECT ors.*, u.full_name AS beneficiary_name, pe.entity_name AS beneficiary_entity_name
       FROM opportunity_revenue_shares ors
       LEFT JOIN users u ON ors.beneficiary_user_id = u.id
       LEFT JOIN partner_entities pe ON ors.beneficiary_entity_id = pe.id
       WHERE ors.opportunity_id = $1`,
      [id]
    );

    const proposals = await pool.query(
      'SELECT * FROM proposals WHERE opportunity_id = $1 ORDER BY proposal_date DESC',
      [id]
    );

    const activities = await pool.query(
      `SELECT a.*, u.full_name AS owner_name FROM activities a LEFT JOIN users u ON a.owner_user_id = u.id
       WHERE a.related_type = 'opportunity' AND a.related_id = $1 ORDER BY a.activity_date DESC LIMIT 10`,
      [id]
    );

    // Per-opportunity roles
    const oppRoles = await pool.query(
      `SELECT orr.*, u.full_name AS user_name
       FROM opportunity_roles orr
       LEFT JOIN users u ON orr.user_id = u.id
       WHERE orr.opportunity_id = $1
       ORDER BY orr.role_in_opportunity`,
      [id]
    );

    res.json({
      ...result.rows[0],
      products: products.rows,
      revenue_shares: revenueShares.rows,
      proposals: proposals.rows,
      activities: activities.rows,
      opportunity_roles: oppRoles.rows,
    });
  } catch (err) {
    console.error('Get opportunity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/opportunities
router.post('/', auth, requireWriteAccess('opportunities'), async (req, res) => {
  try {
    const { opportunity_name, lead_id, account_org_id, deal_owner_user_id, source_owner_user_id, sponsor_user_id,
      pipeline_id, stage_id, deal_type, billing_entity_id, estimated_total_value, recurring_value, one_time_value,
      expected_close_date, visibility_level, compliance_review_status, win_probability, notes,
      technical_partner_user_id, product_owner_user_id, delivery_owner_user_id } = req.body;

    if (!opportunity_name) {
      return res.status(400).json({ error: 'Opportunity name is required' });
    }

    // Validate all 6 required opportunity roles per document Section 2
    const missingRoles = [];
    if (!deal_owner_user_id) missingRoles.push('deal_owner');
    if (!source_owner_user_id) missingRoles.push('source_owner');
    if (!sponsor_user_id) missingRoles.push('sponsor');
    if (!technical_partner_user_id) missingRoles.push('technical_partner');
    if (!product_owner_user_id) missingRoles.push('product_owner');
    if (!delivery_owner_user_id) missingRoles.push('delivery_owner');
    if (missingRoles.length > 0) {
      return res.status(400).json({
        error: `All 6 opportunity roles are required: ${missingRoles.join(', ')} missing`,
        missing_roles: missingRoles
      });
    }

    // M1: Check protected window conflicts
    let autoConflict = false;
    if (account_org_id) {
      const protectedLeads = await pool.query(
        `SELECT id, source_owner_user_id, lead_name FROM leads
         WHERE organization_id = $1 AND protected_until > NOW()
         AND source_owner_user_id != $2 AND status NOT IN ('disqualified', 'converted')`,
        [account_org_id, deal_owner_user_id || req.user.id]
      );
      if (protectedLeads.rows.length > 0) {
        autoConflict = true;
      }
    }

    const result = await pool.query(
      `INSERT INTO opportunities (opportunity_name, lead_id, account_org_id, deal_owner_user_id, source_owner_user_id,
       sponsor_user_id, pipeline_id, stage_id, deal_type, billing_entity_id, estimated_total_value, recurring_value,
       one_time_value, expected_close_date, visibility_level, compliance_review_status, win_probability, notes,
       technical_partner_user_id, product_owner_user_id, delivery_owner_user_id, conflict_flag)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [opportunity_name, lead_id, account_org_id, deal_owner_user_id || req.user.id, source_owner_user_id,
        sponsor_user_id, pipeline_id, stage_id, deal_type, billing_entity_id, estimated_total_value, recurring_value,
        one_time_value, expected_close_date, visibility_level, compliance_review_status, win_probability, notes,
        technical_partner_user_id, product_owner_user_id, delivery_owner_user_id, autoConflict]
    );

    // M1: Notify governance if protected window conflict detected
    if (autoConflict) {
      const { notifyUsers, getUsersByRole } = require('../utils/notify');
      const govUsers = await getUsersByRole('founding_orchestrator');
      await notifyUsers({
        userIds: govUsers,
        type: 'conflict_detected',
        title: 'Protected Window Conflict',
        message: `New opportunity "${opportunity_name}" conflicts with a protected lead on the same organization`,
        entityType: 'opportunity',
        entityId: result.rows[0].id
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create opportunity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/opportunities/:id
router.put('/:id', auth, requireWriteAccess('opportunities'), requireOwnershipOrRole('opportunities', ['deal_owner_user_id', 'source_owner_user_id', 'sponsor_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const { opportunity_name, lead_id, account_org_id, deal_owner_user_id, source_owner_user_id, sponsor_user_id,
      pipeline_id, stage_id, deal_type, billing_entity_id, estimated_total_value, recurring_value, one_time_value,
      expected_close_date, visibility_level, compliance_review_status, win_probability, notes,
      technical_partner_user_id, product_owner_user_id, delivery_owner_user_id } = req.body;

    // Get old stage and visibility to detect transitions
    const oldOpp = await pool.query('SELECT stage_id, visibility_level FROM opportunities WHERE id = $1', [id]);

    // Block direct visibility changes for non-governance users - must use visibility approval queue
    const effectiveVisibility = (!isFullAccess(req.user.role) && visibility_level && oldOpp.rows.length > 0 && oldOpp.rows[0].visibility_level !== visibility_level)
      ? oldOpp.rows[0].visibility_level  // revert to old value for non-governance
      : visibility_level;

    const visibilityBlocked = (!isFullAccess(req.user.role) && visibility_level && oldOpp.rows.length > 0 && oldOpp.rows[0].visibility_level !== visibility_level);

    const result = await pool.query(
      `UPDATE opportunities SET opportunity_name=$1, lead_id=$2, account_org_id=$3, deal_owner_user_id=$4,
       source_owner_user_id=$5, sponsor_user_id=$6, pipeline_id=$7, stage_id=$8, deal_type=$9,
       billing_entity_id=$10, estimated_total_value=$11, recurring_value=$12, one_time_value=$13,
       expected_close_date=$14, visibility_level=$15, compliance_review_status=$16, win_probability=$17,
       notes=$18, technical_partner_user_id=$19, product_owner_user_id=$20, delivery_owner_user_id=$21,
       updated_at=NOW()
       WHERE id=$22 RETURNING *`,
      [opportunity_name, lead_id, account_org_id, deal_owner_user_id, source_owner_user_id, sponsor_user_id,
        pipeline_id, stage_id, deal_type, billing_entity_id, estimated_total_value, recurring_value, one_time_value,
        expected_close_date, effectiveVisibility, compliance_review_status, win_probability, notes,
        technical_partner_user_id, product_owner_user_id, delivery_owner_user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Automated payout trigger: if stage changed to Closed Won, recalculate revenue shares
    if (stage_id && oldOpp.rows.length > 0 && oldOpp.rows[0].stage_id !== stage_id) {
      const newStage = await pool.query('SELECT is_closed_won FROM stages WHERE id = $1', [stage_id]);
      if (newStage.rows.length > 0 && newStage.rows[0].is_closed_won) {
        // Recalculate all revenue share amounts based on estimated_total_value
        const oppValue = result.rows[0].estimated_total_value || 0;
        await pool.query(
          `UPDATE opportunity_revenue_shares
           SET calc_amount = ROUND((share_percent / 100.0) * $1, 2),
               payout_status = 'pending'
           WHERE opportunity_id = $2 AND share_percent IS NOT NULL`,
          [oppValue, id]
        );

        const { logAudit } = require('../utils/auditLog');
        await logAudit({
          actorUserId: req.user.id,
          actionType: 'closed_won_payout_trigger',
          entityType: 'opportunity',
          entityId: parseInt(id),
          newValue: { stage_id, estimated_total_value: oppValue },
          ipAddress: req.ip,
        });

        // Notify all opportunity role holders about Closed Won
        const { notifyUsers } = require('../utils/notify');
        const roleHolders = await pool.query('SELECT DISTINCT user_id FROM opportunity_roles WHERE opportunity_id = $1', [id]);
        const roleUserIds = roleHolders.rows.map(r => r.user_id).filter(uid => uid !== req.user.id);
        if (roleUserIds.length > 0) {
          await notifyUsers({
            userIds: roleUserIds,
            type: 'opportunity_closed_won',
            title: 'Opportunity Closed Won!',
            message: `"${result.rows[0].opportunity_name}" has been marked as Closed Won (Value: ${oppValue})`,
            entityType: 'opportunity',
            entityId: parseInt(id)
          });
        }

        // Auto-create ops pool record
        const existingPool = await pool.query('SELECT id FROM ops_pool WHERE opportunity_id = $1', [id]);
        if (existingPool.rows.length === 0) {
          const poolPercent = 5.00; // Default 5% ops pool
          const poolAmount = Math.round((poolPercent / 100) * oppValue * 100) / 100;
          await pool.query(
            'INSERT INTO ops_pool (opportunity_id, pool_percent, pool_amount) VALUES ($1, $2, $3)',
            [id, poolPercent, poolAmount]
          );
        }

        // Auto-create project if none exists
        const existingProject = await pool.query(
          'SELECT id FROM projects WHERE opportunity_id = $1', [id]
        );
        if (existingProject.rows.length === 0) {
          const projName = `${result.rows[0].opportunity_name} - Delivery`;
          const supportEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
          const autoProject = await pool.query(
            `INSERT INTO projects (project_name, opportunity_id, project_owner_user_id,
             delivery_manager_user_id, technical_lead_user_id, status, budget, support_end_date)
             VALUES ($1, $2, $3, $4, $5, 'planning', $6, $7) RETURNING *`,
            [projName, id,
             result.rows[0].delivery_owner_user_id || req.user.id,
             result.rows[0].delivery_owner_user_id,
             result.rows[0].technical_partner_user_id,
             result.rows[0].estimated_total_value,
             supportEnd]
          );

          await logAudit({
            actorUserId: req.user.id,
            actionType: 'auto_project_creation',
            entityType: 'project',
            entityId: autoProject.rows[0].id,
            newValue: { opportunity_id: parseInt(id), project_name: projName },
            ipAddress: req.ip,
          });

          // M5: Auto-link agreements from opportunity to project via activity notes
          await pool.query(
            `INSERT INTO activities (related_type, related_id, activity_type, owner_user_id, summary, private_flag)
             SELECT 'project', $1, 'admin', $2, 'Agreement #' || a.id || ' (' || COALESCE(a.agreement_name, 'Untitled') || ') linked from opportunity', false
             FROM agreements a WHERE a.related_type = 'opportunity' AND a.related_id = $3`,
            [autoProject.rows[0].id, req.user.id, id]
          );
        }
      }
    }

    res.json({
      ...result.rows[0],
      ...(visibilityBlocked ? { visibility_change_blocked: 'Visibility changes require governance approval. Please submit a visibility request.' } : {})
    });
  } catch (err) {
    console.error('Update opportunity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/opportunities/:id/create-project - Convert won opportunity to project
router.post('/:id/create-project', auth, requireWriteAccess('projects'), async (req, res) => {
  try {
    const { id } = req.params;
    const { project_name, project_owner_user_id, delivery_manager_user_id,
      technical_lead_user_id, start_date, target_end_date, budget, notes } = req.body;

    const oppResult = await pool.query(
      `SELECT op.*, s.is_closed_won, s.stage_name, o.org_name
       FROM opportunities op
       LEFT JOIN stages s ON op.stage_id = s.id
       LEFT JOIN organizations o ON op.account_org_id = o.id
       WHERE op.id = $1`,
      [id]
    );
    if (oppResult.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const opp = oppResult.rows[0];

    // C4: Verify user has a role on this opportunity
    if (!isFullAccess(req.user.role)) {
      const hasAccess = await canAccessRecord(pool, 'opportunities', 'op', opportunityFilter, id, req.user.role, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You must have a role on this opportunity to create a project' });
      }
    }

    // Check if project already exists
    const existingProject = await pool.query(
      'SELECT id FROM projects WHERE opportunity_id = $1', [id]
    );
    if (existingProject.rows.length > 0) {
      return res.status(400).json({ error: 'A project already exists for this opportunity', project_id: existingProject.rows[0].id });
    }

    const projName = project_name || `${opp.opportunity_name} - Delivery`;

    const projectResult = await pool.query(
      `INSERT INTO projects (project_name, opportunity_id, project_owner_user_id,
       delivery_manager_user_id, technical_lead_user_id, start_date, target_end_date,
       budget, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'planning',$9) RETURNING *`,
      [projName, id, project_owner_user_id || req.user.id,
       delivery_manager_user_id, technical_lead_user_id,
       start_date, target_end_date, budget || opp.estimated_total_value, notes]
    );

    const { logAudit } = require('../utils/auditLog');
    await logAudit({
      actorUserId: req.user.id,
      actionType: 'opportunity_to_project',
      entityType: 'opportunity',
      entityId: parseInt(id),
      newValue: { project_id: projectResult.rows[0].id },
      ipAddress: req.ip,
    });

    // M5: Auto-link agreements from opportunity to project via activity notes
    await pool.query(
      `INSERT INTO activities (related_type, related_id, activity_type, owner_user_id, summary, private_flag)
       SELECT 'project', $1, 'admin', $2, 'Agreement #' || a.id || ' (' || COALESCE(a.agreement_name, 'Untitled') || ') linked from opportunity', false
       FROM agreements a WHERE a.related_type = 'opportunity' AND a.related_id = $3`,
      [projectResult.rows[0].id, req.user.id, id]
    );

    res.status(201).json({ opportunity_id: parseInt(id), project: projectResult.rows[0] });
  } catch (err) {
    console.error('Create project from opportunity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/opportunities/:id/invite-role
router.post('/:id/invite-role', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role_in_opportunity } = req.body;
    if (!user_id || !role_in_opportunity) {
      return res.status(400).json({ error: 'user_id and role_in_opportunity are required' });
    }
    // Check opportunity exists
    const opp = await pool.query('SELECT id, opportunity_name, deal_owner_user_id, source_owner_user_id FROM opportunities WHERE id = $1', [id]);
    if (opp.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });

    // C4: Only deal_owner, source_owner, or founding_orchestrator can invite roles
    if (!isFullAccess(req.user.role)) {
      const oppRow = opp.rows[0];
      if (oppRow.deal_owner_user_id !== req.user.id && oppRow.source_owner_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the deal owner, source owner, or founding orchestrator can invite roles' });
      }
    }

    // Add role
    const result = await pool.query(
      'INSERT INTO opportunity_roles (opportunity_id, user_id, role_in_opportunity) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
      [id, user_id, role_in_opportunity]
    );

    // Notify the invited user
    const { createNotification } = require('../utils/notify');
    await createNotification({
      userId: parseInt(user_id),
      type: 'opportunity_role_assigned',
      title: 'New Opportunity Role Assigned',
      message: `You've been assigned as ${role_in_opportunity} on "${opp.rows[0].opportunity_name}"`,
      entityType: 'opportunity',
      entityId: parseInt(id)
    });

    res.status(201).json(result.rows[0] || { message: 'Role already exists' });
  } catch (err) {
    console.error('Invite role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/opportunities/:id/request-review
router.post('/:id/request-review', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { review_type, notes } = req.body;

    // C4: Verify user has a role on this opportunity
    if (!isFullAccess(req.user.role)) {
      const hasAccess = await canAccessRecord(pool, 'opportunities', 'op', opportunityFilter, id, req.user.role, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You must have a role on this opportunity to request a review' });
      }
    }

    // Update compliance_review_status to 'pending'
    await pool.query(
      `UPDATE opportunities SET compliance_review_status = 'pending', notes = COALESCE(notes, '') || E'\n[Review Requested: ${review_type || 'technical'}] ' || $1, updated_at = NOW() WHERE id = $2`,
      [notes || '', id]
    );

    // Notify solution architects
    const { notifyUsers, getUsersByRole } = require('../utils/notify');
    const saUsers = await getUsersByRole('solution_architect');
    await notifyUsers({
      userIds: saUsers,
      type: 'review_requested',
      title: 'Technical Review Requested',
      message: `Opportunity #${id} needs ${review_type || 'technical'} review`,
      entityType: 'opportunity',
      entityId: parseInt(id)
    });

    res.json({ message: 'Review requested', opportunity_id: parseInt(id) });
  } catch (err) {
    console.error('Request review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/opportunities/:id
router.delete('/:id', auth, requireWriteAccess('opportunities'), requireOwnershipOrRole('opportunities', ['deal_owner_user_id', 'source_owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM opportunities WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json({ message: 'Opportunity deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete opportunity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
