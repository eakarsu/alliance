const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { isFullAccess, proposalFilter, canAccessRecord } = require('../middleware/dataFilter');
const { requireWriteAccess } = require('../middleware/writeAccess');

// GET /api/proposals
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE pr.proposal_number ILIKE $1 OR pr.approval_status ILIKE $1 OR o.opportunity_name ILIKE $1`;
    }

    // Role-based filtering: proposals linked to accessible opportunities
    if (!isFullAccess(req.user.role)) {
      const role = req.user.role;
      params.push(req.user.id);
      const p = params.length;
      const directRoles = `(o.deal_owner_user_id = $${p} OR o.source_owner_user_id = $${p} OR o.sponsor_user_id = $${p} OR o.technical_partner_user_id = $${p} OR o.product_owner_user_id = $${p} OR o.delivery_owner_user_id = $${p} OR o.id IN (SELECT opportunity_id FROM opportunity_roles WHERE user_id = $${p}))`;
      if (role === 'pmo_coordinator') {
        whereClause += (whereClause ? ' AND' : 'WHERE') + ` (${directRoles} OR o.id IN (SELECT opportunity_id FROM projects WHERE delivery_manager_user_id = $${p}))`;
      } else {
        // solution_architect + partner roles: direct roles + opportunity_roles
        whereClause += (whereClause ? ' AND' : 'WHERE') + ` ${directRoles}`;
      }
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM proposals pr LEFT JOIN opportunities o ON pr.opportunity_id = o.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT pr.*, o.opportunity_name, o.account_org_id,
       org.org_name AS account_name
       FROM proposals pr
       LEFT JOIN opportunities o ON pr.opportunity_id = o.id
       LEFT JOIN organizations org ON o.account_org_id = org.id
       ${whereClause}
       ORDER BY pr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
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
    console.error('List proposals error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/proposals/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pr.*, o.opportunity_name, o.account_org_id, o.deal_owner_user_id,
       org.org_name AS account_name, u.full_name AS deal_owner_name
       FROM proposals pr
       LEFT JOIN opportunities o ON pr.opportunity_id = o.id
       LEFT JOIN organizations org ON o.account_org_id = org.id
       LEFT JOIN users u ON o.deal_owner_user_id = u.id
       WHERE pr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // C1: Data filtering - check access via linked opportunity
    if (!isFullAccess(req.user.role) && result.rows[0].opportunity_id) {
      const { opportunityFilter, canAccessRecord } = require('../middleware/dataFilter');
      const hasAccess = await canAccessRecord(pool, 'opportunities', 'op', opportunityFilter, result.rows[0].opportunity_id, req.user.role, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this proposal' });
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get proposal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/proposals
router.post('/', auth, requireWriteAccess('proposals'), async (req, res) => {
  try {
    const { opportunity_id, proposal_number, proposal_date, currency, one_time_amount,
      recurring_amount, implementation_amount, support_amount, discount_amount,
      document_url, approval_status } = req.body;

    if (!opportunity_id) {
      return res.status(400).json({ error: 'Opportunity ID is required' });
    }

    const result = await pool.query(
      `INSERT INTO proposals (opportunity_id, proposal_number, proposal_date, currency, one_time_amount,
       recurring_amount, implementation_amount, support_amount, discount_amount, document_url, approval_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [opportunity_id, proposal_number, proposal_date, currency || 'USD', one_time_amount,
        recurring_amount, implementation_amount, support_amount, discount_amount,
        document_url, approval_status || 'draft']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create proposal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/proposals/:id
router.put('/:id', auth, requireWriteAccess('proposals'), async (req, res) => {
  try {
    const { id } = req.params;
    const { opportunity_id, proposal_number, proposal_date, currency, one_time_amount,
      recurring_amount, implementation_amount, support_amount, discount_amount,
      document_url, approval_status } = req.body;

    const result = await pool.query(
      `UPDATE proposals SET opportunity_id=$1, proposal_number=$2, proposal_date=$3, currency=$4,
       one_time_amount=$5, recurring_amount=$6, implementation_amount=$7, support_amount=$8,
       discount_amount=$9, document_url=$10, approval_status=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [opportunity_id, proposal_number, proposal_date, currency, one_time_amount,
        recurring_amount, implementation_amount, support_amount, discount_amount,
        document_url, approval_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update proposal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/proposals/:id
router.delete('/:id', auth, requireWriteAccess('proposals'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM proposals WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({ message: 'Proposal deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete proposal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
