const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');

// GET /api/referrals/my-referrals
// List leads where the current user is the source owner and source_type = 'referral'
router.get('/my-referrals', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads l
       WHERE l.source_owner_user_id = $1 AND l.source_type = 'referral'`,
      [req.user.id]
    );

    const dataResult = await pool.query(
      `SELECT l.*, o.org_name,
       c.first_name || ' ' || c.last_name AS contact_name,
       op.id AS opportunity_id, op.opportunity_name, op.estimated_total_value AS opportunity_value,
       s.stage_name AS opportunity_stage
       FROM leads l
       LEFT JOIN organizations o ON l.organization_id = o.id
       LEFT JOIN contacts c ON l.contact_id = c.id
       LEFT JOIN opportunities op ON op.lead_id = l.id
       LEFT JOIN stages s ON op.stage_id = s.id
       WHERE l.source_owner_user_id = $1 AND l.source_type = 'referral'
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('List my referrals error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/referrals/submit-lead
// Simplified lead creation for referral partners
router.post('/submit-lead', auth, async (req, res) => {
  try {
    const { lead_name, organization_id, contact_id, geography, vertical, need_type, estimated_value, notes, relationship_strength, intro_type } = req.body;

    if (!lead_name) {
      return res.status(400).json({ error: 'Lead name is required' });
    }

    const enrichedNotes = [notes, relationship_strength ? `Relationship: ${relationship_strength}` : '', intro_type ? `Intro type: ${intro_type}` : ''].filter(Boolean).join('. ');

    const result = await pool.query(
      `INSERT INTO leads (lead_name, organization_id, contact_id, geography, vertical, need_type,
       estimated_value, source_owner_user_id, source_type, status, conflict_flag, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'referral', 'new', false, $9)
       RETURNING *`,
      [lead_name, organization_id, contact_id, geography, vertical, need_type, estimated_value, req.user.id, enrichedNotes || null]
    );

    // Fetch the created lead with joined org/contact names for the response
    const lead = await pool.query(
      `SELECT l.*, o.org_name, c.first_name || ' ' || c.last_name AS contact_name
       FROM leads l
       LEFT JOIN organizations o ON l.organization_id = o.id
       LEFT JOIN contacts c ON l.contact_id = c.id
       WHERE l.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(lead.rows[0]);
  } catch (err) {
    console.error('Submit referral lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/referrals/status-tracker
// Track referral leads through the pipeline with linked opportunity info
router.get('/status-tracker', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads l
       WHERE l.source_owner_user_id = $1 AND l.source_type = 'referral'`,
      [req.user.id]
    );

    const dataResult = await pool.query(
      `SELECT l.id AS lead_id, l.lead_name, l.status AS lead_status, l.estimated_value,
       l.created_at AS lead_created_at,
       o.org_name,
       op.id AS opportunity_id, op.opportunity_name, op.estimated_total_value AS opportunity_value,
       op.expected_close_date,
       s.stage_name, s.is_closed_won
       FROM leads l
       LEFT JOIN organizations o ON l.organization_id = o.id
       LEFT JOIN opportunities op ON op.lead_id = l.id
       LEFT JOIN stages s ON op.stage_id = s.id
       WHERE l.source_owner_user_id = $1 AND l.source_type = 'referral'
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('Status tracker error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/referrals/payout-summary
// Revenue shares for the current user across all opportunities
router.get('/payout-summary', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM opportunity_revenue_shares ors
       WHERE ors.beneficiary_user_id = $1`,
      [req.user.id]
    );

    const dataResult = await pool.query(
      `SELECT ors.*, op.opportunity_name, op.estimated_total_value AS opportunity_value,
       s.stage_name, s.is_closed_won,
       o.org_name AS account_name,
       pe.entity_name AS beneficiary_entity_name
       FROM opportunity_revenue_shares ors
       LEFT JOIN opportunities op ON ors.opportunity_id = op.id
       LEFT JOIN stages s ON op.stage_id = s.id
       LEFT JOIN organizations o ON op.account_org_id = o.id
       LEFT JOIN partner_entities pe ON ors.beneficiary_entity_id = pe.id
       WHERE ors.beneficiary_user_id = $1
       ORDER BY ors.id DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    // Calculate totals across all matching records (not just current page)
    const totalsResult = await pool.query(
      `SELECT
       COALESCE(SUM(ors.calc_amount), 0) AS total_calc_amount,
       COALESCE(SUM(CASE WHEN ors.payout_status = 'paid' THEN ors.calc_amount ELSE 0 END), 0) AS total_paid,
       COALESCE(SUM(CASE WHEN ors.payout_status = 'pending' THEN ors.calc_amount ELSE 0 END), 0) AS total_pending,
       COALESCE(SUM(CASE WHEN s.is_closed_won = true THEN ors.calc_amount ELSE 0 END), 0) AS total_closed_won
       FROM opportunity_revenue_shares ors
       LEFT JOIN opportunities op ON ors.opportunity_id = op.id
       LEFT JOIN stages s ON op.stage_id = s.id
       WHERE ors.beneficiary_user_id = $1`,
      [req.user.id]
    );

    res.json({
      data: dataResult.rows,
      totals: totalsResult.rows[0],
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('Payout summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/referrals/review-lead/:id
router.put('/review-lead/:id', auth, async (req, res) => {
  try {
    // Governance check: only founding_orchestrator or partner owners can review referral leads
    const allowedReviewRoles = ['founding_orchestrator', 'enterprise_partner', 'product_experience_lead', 'product_partner', 'pmo_coordinator'];
    if (!allowedReviewRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only governance or partner owners can review referral leads' });
    }

    const { id } = req.params;
    const { status, assigned_owner_user_id, notes } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be accepted or rejected' });
    }

    const lead = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (lead.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

    const updateFields = {
      status: status === 'accepted' ? 'qualified' : 'disqualified',
      source_owner_user_id: assigned_owner_user_id || lead.rows[0].source_owner_user_id,
    };

    await pool.query(
      `UPDATE leads SET status = $1, source_owner_user_id = $2, notes = COALESCE(notes, '') || E'\n[Referral Review: ${status}] ' || $3, updated_at = NOW() WHERE id = $4`,
      [updateFields.status, updateFields.source_owner_user_id, notes || '', id]
    );

    // Notify the referral submitter
    const { createNotification } = require('../utils/notify');
    if (lead.rows[0].source_owner_user_id) {
      await createNotification({
        userId: lead.rows[0].source_owner_user_id,
        type: 'referral_reviewed',
        title: `Referral ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
        message: `Your referral lead "${lead.rows[0].lead_name}" has been ${status}`,
        entityType: 'lead',
        entityId: parseInt(id)
      });
    }

    res.json({ message: `Lead ${status}`, id: parseInt(id) });
  } catch (err) {
    console.error('Review referral lead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
