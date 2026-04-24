const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { organizationFilter, canAccessOrganization } = require('../middleware/dataFilter');
const { requireWriteAccess, requireOwnershipOrRole } = require('../middleware/writeAccess');

// GET /api/organizations
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
      whereClause += ` AND (o.org_name ILIKE $${paramIdx} OR o.country ILIKE $${paramIdx} OR o.industry ILIKE $${paramIdx} OR o.org_type ILIKE $${paramIdx})`;
      paramIdx++;
    }

    // Role-based data filtering
    const filter = organizationFilter(req.user.role, req.user.id, paramIdx);
    whereClause += filter.clause;
    params.push(...filter.params);
    paramIdx = filter.nextParam;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM organizations o ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT o.*, u.full_name AS owner_name,
       (SELECT COUNT(*) FROM contacts c WHERE c.organization_id = o.id) AS contacts_count
       FROM organizations o
       LEFT JOIN users u ON o.owner_user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
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
    console.error('List organizations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/organizations/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT o.*, u.full_name AS owner_name
       FROM organizations o
       LEFT JOIN users u ON o.owner_user_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // C1: Data filtering for detail endpoint
    const hasAccess = await canAccessOrganization(pool, id, req.user.role, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    const contacts = await pool.query(
      'SELECT id, first_name, last_name, title, email FROM contacts WHERE organization_id = $1',
      [id]
    );

    const leads = await pool.query(
      'SELECT id, lead_name, status, estimated_value FROM leads WHERE organization_id = $1',
      [id]
    );

    const opportunities = await pool.query(
      'SELECT id, opportunity_name, estimated_total_value, win_probability FROM opportunities WHERE account_org_id = $1',
      [id]
    );

    const agreements = await pool.query(
      `SELECT id, agreement_type, status, start_date, end_date FROM agreements WHERE related_type = 'organization' AND related_id = $1`,
      [id]
    );

    res.json({
      ...result.rows[0],
      contacts: contacts.rows,
      leads: leads.rows,
      opportunities: opportunities.rows,
      agreements: agreements.rows,
    });
  } catch (err) {
    console.error('Get organization error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/organizations
router.post('/', auth, requireWriteAccess('organizations'), async (req, res) => {
  try {
    const { org_name, org_type, country, website, industry, employee_count, owner_user_id, visibility_level, notes } = req.body;

    if (!org_name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const result = await pool.query(
      `INSERT INTO organizations (org_name, org_type, country, website, industry, employee_count, owner_user_id, visibility_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [org_name, org_type, country, website, industry, employee_count, owner_user_id || req.user.id, visibility_level, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create organization error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/organizations/:id
router.put('/:id', auth, requireWriteAccess('organizations'), requireOwnershipOrRole('organizations', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const { org_name, org_type, country, website, industry, employee_count, owner_user_id, visibility_level, notes } = req.body;

    const result = await pool.query(
      `UPDATE organizations SET org_name = $1, org_type = $2, country = $3, website = $4, industry = $5,
       employee_count = $6, owner_user_id = $7, visibility_level = $8, notes = $9, updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [org_name, org_type, country, website, industry, employee_count, owner_user_id, visibility_level, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update organization error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/organizations/:id
router.delete('/:id', auth, requireWriteAccess('organizations'), requireOwnershipOrRole('organizations', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM organizations WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ message: 'Organization deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete organization error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
