const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { isFullAccess, isPartnerRole, isRestricted } = require('../middleware/dataFilter');

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    // Build role-specific filters
    let oppFilter = '';
    let leadFilter = '';
    let projectFilter = '';
    let activityFilter = '';
    let contactFilter = '';
    let orgFilter = '';
    let productFilter = '';
    const filterParams = [];

    if (!isFullAccess(role)) {
      filterParams.push(userId);
      const p = filterParams.length;

      if (role === 'pmo_coordinator') {
        // PMO: contacts/orgs/leads no filter (tam), delivery-related opportunities, all projects (tam)
        contactFilter = ''; // tam access
        orgFilter = ''; // tam access
        leadFilter = ''; // tam access
        oppFilter = ` AND (o.id IN (SELECT opportunity_id FROM projects WHERE delivery_manager_user_id = $${p}) OR o.id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${p}))`;
        projectFilter = ''; // tam access
        activityFilter = ''; // tam access
        productFilter = `WHERE (id IN (SELECT product_id FROM opportunity_products WHERE opportunity_id IN (SELECT opportunity_id FROM projects WHERE delivery_manager_user_id = $${p})) OR id IN (SELECT product_id FROM opportunity_products WHERE opportunity_id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${p})))`;
      } else if (role === 'solution_architect') {
        // SA: contacts/orgs/leads no filter (tam), assigned opportunities (gorevli), related projects (ilgili)
        contactFilter = ''; // tam access
        orgFilter = ''; // tam access
        leadFilter = ''; // tam access
        oppFilter = ` AND o.id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${p})`;
        projectFilter = ` AND (pj.project_owner_user_id = $${p} OR pj.delivery_manager_user_id = $${p} OR pj.technical_lead_user_id = $${p})`;
        activityFilter = ''; // tam access
        productFilter = ''; // tam access (solution_architect sees all products)
      } else if (isRestricted(role)) {
        // Restricted external: very limited dashboard - only shared items
        contactFilter = `WHERE 1=0`; // no contacts
        orgFilter = `WHERE 1=0`; // no orgs
        oppFilter = ` AND 1=0`; // no opportunities
        leadFilter = ` AND 1=0`; // no leads
        projectFilter = ` AND 1=0`; // no projects
        activityFilter = ` AND (a.owner_user_id = $${p} OR (a.related_type = 'product' AND a.related_id IN (SELECT entity_id FROM shared_items WHERE shared_with_user_id = $${p} AND entity_type = 'product')))`;
        productFilter = `WHERE id IN (SELECT entity_id FROM shared_items WHERE shared_with_user_id = $1 AND entity_type = 'product')`;
      } else {
        // Partner roles: filtered access
        contactFilter = `WHERE owner_user_id = $1 OR id IN (SELECT contact_id FROM relationship_links WHERE known_by_user_id = $1)`;
        orgFilter = `WHERE owner_user_id = $1`;
        oppFilter = ` AND (o.deal_owner_user_id = $${p} OR o.source_owner_user_id = $${p} OR o.sponsor_user_id = $${p} OR o.id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${p}))`;
        leadFilter = ` AND (l.source_owner_user_id = $${p} OR l.sponsor_user_id = $${p} OR l.id IN (SELECT lead_id FROM lead_assignments WHERE assigned_user_id = $${p}))`;
        projectFilter = ` AND (pj.project_owner_user_id = $${p} OR pj.delivery_manager_user_id = $${p} OR pj.technical_lead_user_id = $${p})`;
        activityFilter = ` AND (a.owner_user_id = $${p} OR a.private_flag = false)`;
        productFilter = `WHERE owner_user_id = $1`;
      }
    }

    // Counts - role-filtered
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM contacts ${contactFilter}) AS contacts_count,
        (SELECT COUNT(*) FROM organizations ${orgFilter}) AS organizations_count,
        (SELECT COUNT(*) FROM leads l WHERE 1=1 ${leadFilter}) AS leads_count,
        (SELECT COUNT(*) FROM opportunities o WHERE 1=1 ${oppFilter}) AS opportunities_count,
        (SELECT COUNT(*) FROM products ${productFilter}) AS products_count,
        (SELECT COUNT(*) FROM projects pj WHERE 1=1 ${projectFilter}) AS projects_count,
        (SELECT COUNT(*) FROM partner_entities) AS partners_count,
        (SELECT COUNT(*) FROM agreements) AS agreements_count,
        (SELECT COUNT(*) FROM activities a WHERE 1=1 ${activityFilter}) AS activities_count,
        (SELECT COUNT(*) FROM risks) AS risks_count,
        (SELECT COUNT(*) FROM proposals) AS proposals_count,
        (SELECT COUNT(*) FROM users) AS users_count
    `, filterParams);

    const pipelineValue = await pool.query(`
      SELECT COALESCE(SUM(o.estimated_total_value), 0) AS total_pipeline_value
      FROM opportunities o
      WHERE o.stage_id NOT IN (SELECT id FROM stages WHERE is_closed_lost = true)
      ${oppFilter}
    `, filterParams);

    const wonValue = await pool.query(`
      SELECT COALESCE(SUM(o.estimated_total_value), 0) AS total_won_value
      FROM opportunities o
      JOIN stages s ON o.stage_id = s.id
      WHERE s.is_closed_won = true
      ${oppFilter}
    `, filterParams);

    const recentActivities = await pool.query(`
      SELECT a.*, u.full_name AS owner_name
      FROM activities a
      LEFT JOIN users u ON a.owner_user_id = u.id
      WHERE 1=1 ${activityFilter}
      ORDER BY a.activity_date DESC
      LIMIT 10
    `, activityFilter ? filterParams : []);

    const recentLeads = await pool.query(`
      SELECT l.*, u.full_name AS source_owner_name, o.org_name
      FROM leads l
      LEFT JOIN users u ON l.source_owner_user_id = u.id
      LEFT JOIN organizations o ON l.organization_id = o.id
      WHERE 1=1 ${leadFilter}
      ORDER BY l.created_at DESC
      LIMIT 10
    `, leadFilter ? filterParams : []);

    // Risks: restricted sees none, partners see own, PMO/SA see related, governance sees all
    let riskFilter = '';
    let riskParams = [];
    if (isRestricted(role)) {
      riskFilter = ' AND 1=0';
    } else if (!isFullAccess(role)) {
      if (role === 'pmo_coordinator') {
        riskFilter = ` AND (r.related_type = 'project' OR r.owner_user_id = $1)`;
        riskParams = [userId];
      } else if (role === 'solution_architect') {
        riskFilter = ` AND (r.risk_type = 'technical' OR r.owner_user_id = $1)`;
        riskParams = [userId];
      } else {
        riskFilter = ` AND r.owner_user_id = $1`;
        riskParams = [userId];
      }
    }

    const openRisks = await pool.query(`
      SELECT r.*, u.full_name AS owner_name
      FROM risks r
      LEFT JOIN users u ON r.owner_user_id = u.id
      WHERE r.status = 'open' ${riskFilter}
      ORDER BY CASE r.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, r.created_at DESC
      LIMIT 10
    `, riskParams);

    const opportunitiesByStage = await pool.query(`
      SELECT s.stage_name, COUNT(o.id) AS count, COALESCE(SUM(o.estimated_total_value), 0) AS value
      FROM stages s
      LEFT JOIN opportunities o ON o.stage_id = s.id ${oppFilter ? `AND (1=1 ${oppFilter})` : ''}
      GROUP BY s.id, s.stage_name, s.stage_order
      ORDER BY s.stage_order
    `, filterParams);

    // Role-specific extra data
    const extra = {};

    // Governance: conflict counts, pending visibility requests
    if (role === 'founding_orchestrator') {
      const conflicts = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM opportunities WHERE conflict_flag = true) AS opp_conflicts,
          (SELECT COUNT(*) FROM leads WHERE conflict_flag = true) AS lead_conflicts,
          (SELECT COUNT(*) FROM visibility_requests WHERE status = 'pending') AS pending_visibility
      `);
      extra.governance = conflicts.rows[0];
    }

    // Technical: opportunities needing review, delivery risks
    if (role === 'solution_architect') {
      const techData = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM opportunities WHERE compliance_review_status = 'pending' OR compliance_review_status IS NULL) AS needs_review,
          (SELECT COUNT(*) FROM risks WHERE risk_type = 'technical' AND status = 'open') AS tech_risks
      `);
      extra.technical = techData.rows[0];
    }

    // PMO: project status summary, overdue milestones
    if (role === 'pmo_coordinator') {
      const pmoData = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM projects WHERE status = 'in_progress') AS active_projects,
          (SELECT COUNT(*) FROM project_milestones WHERE status = 'pending' AND due_date < NOW()) AS overdue_milestones,
          (SELECT COUNT(*) FROM risks WHERE related_type = 'project' AND status = 'open') AS project_risks
      `);
      extra.pmo = pmoData.rows[0];
    }

    // Partners: my revenue shares
    if (isPartnerRole(role)) {
      const payoutData = await pool.query(`
        SELECT
          COALESCE(SUM(calc_amount), 0) AS total_payout,
          COUNT(*) AS total_shares,
          COUNT(CASE WHEN payout_status = 'pending' THEN 1 END) AS pending_payouts
        FROM opportunity_revenue_shares
        WHERE beneficiary_user_id = $1
      `, [userId]);
      extra.partner = payoutData.rows[0];
    }

    // My opportunity roles
    if (!isRestricted(role)) {
      const myRoles = await pool.query(`
        SELECT orr.role_in_opportunity, op.opportunity_name, op.id AS opportunity_id
        FROM opportunity_roles orr
        JOIN opportunities op ON orr.opportunity_id = op.id
        WHERE orr.user_id = $1
        ORDER BY op.created_at DESC LIMIT 5
      `, [userId]);
      extra.my_opportunity_roles = myRoles.rows;
    }

    res.json({
      counts: counts.rows[0],
      total_pipeline_value: pipelineValue.rows[0].total_pipeline_value,
      total_won_value: wonValue.rows[0].total_won_value,
      recent_activities: recentActivities.rows,
      recent_leads: recentLeads.rows,
      open_risks: openRisks.rows,
      opportunities_by_stage: opportunitiesByStage.rows,
      role_data: extra,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/financial-overview (governance only)
router.get('/financial-overview', auth, async (req, res) => {
  try {
    if (req.user.role !== 'founding_orchestrator') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Total revenue by partner
    const byPartner = await pool.query(`
      SELECT u.full_name, u.role,
        COALESCE(SUM(ors.calc_amount), 0) AS total_share,
        COUNT(DISTINCT ors.opportunity_id) AS deal_count,
        COUNT(CASE WHEN ors.payout_status = 'paid' THEN 1 END) AS paid_count,
        COUNT(CASE WHEN ors.payout_status = 'pending' THEN 1 END) AS pending_count
      FROM users u
      LEFT JOIN opportunity_revenue_shares ors ON ors.beneficiary_user_id = u.id
      GROUP BY u.id, u.full_name, u.role
      HAVING COUNT(ors.id) > 0
      ORDER BY total_share DESC
    `);

    // Ops pool summary
    const opsPool = await pool.query(`
      SELECT COALESCE(SUM(pool_amount), 0) AS total_pool,
        COUNT(*) AS pool_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count
      FROM ops_pool
    `);

    // Total pipeline and won
    const totals = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN s.is_closed_won = true THEN o.estimated_total_value ELSE 0 END), 0) AS total_won,
        COALESCE(SUM(CASE WHEN s.is_closed_won IS NOT true AND s.is_closed_lost IS NOT true THEN o.estimated_total_value ELSE 0 END), 0) AS total_pipeline,
        COALESCE(SUM(ors.calc_amount), 0) AS total_distributed
      FROM opportunities o
      LEFT JOIN stages s ON o.stage_id = s.id
      LEFT JOIN opportunity_revenue_shares ors ON ors.opportunity_id = o.id
    `);

    res.json({
      by_partner: byPartner.rows,
      ops_pool: opsPool.rows[0],
      totals: totals.rows[0],
    });
  } catch (err) {
    console.error('Financial overview error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
