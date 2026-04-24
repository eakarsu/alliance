const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');

// GET /api/partners
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
      whereClause = `WHERE pe.entity_name ILIKE $1 OR pe.entity_type ILIKE $1 OR pe.geography ILIKE $1`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM partner_entities pe ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT pe.*,
       (SELECT COUNT(*) FROM products p WHERE p.owner_entity_id = pe.id) AS products_count,
       (SELECT COUNT(*) FROM opportunities o WHERE o.billing_entity_id = pe.id) AS opportunities_count
       FROM partner_entities pe
       ${whereClause}
       ORDER BY pe.created_at DESC
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
    console.error('List partners error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/partners/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM partner_entities WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partner entity not found' });
    }

    const products = await pool.query(
      'SELECT id, product_name, category, status FROM products WHERE owner_entity_id = $1',
      [id]
    );

    const opportunities = await pool.query(
      'SELECT id, opportunity_name, estimated_total_value, win_probability FROM opportunities WHERE billing_entity_id = $1',
      [id]
    );

    const revenueShares = await pool.query(
      `SELECT ors.*, o.opportunity_name, u.full_name AS beneficiary_name
       FROM opportunity_revenue_shares ors
       LEFT JOIN opportunities o ON ors.opportunity_id = o.id
       LEFT JOIN users u ON ors.beneficiary_user_id = u.id
       WHERE ors.beneficiary_entity_id = $1`,
      [id]
    );

    res.json({
      ...result.rows[0],
      products: products.rows,
      opportunities: opportunities.rows,
      revenue_shares: revenueShares.rows,
    });
  } catch (err) {
    console.error('Get partner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/partners
router.post('/', auth, async (req, res) => {
  try {
    const { entity_name, entity_type, billing_capability, active_status, geography, website, contact_email, notes } = req.body;

    if (!entity_name) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    const result = await pool.query(
      `INSERT INTO partner_entities (entity_name, entity_type, billing_capability, active_status, geography, website, contact_email, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [entity_name, entity_type, billing_capability, active_status !== false, geography, website, contact_email, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create partner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/partners/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { entity_name, entity_type, billing_capability, active_status, geography, website, contact_email, notes } = req.body;

    const result = await pool.query(
      `UPDATE partner_entities SET entity_name=$1, entity_type=$2, billing_capability=$3, active_status=$4,
       geography=$5, website=$6, contact_email=$7, notes=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [entity_name, entity_type, billing_capability, active_status, geography, website, contact_email, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partner entity not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update partner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/partners/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM partner_entities WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partner entity not found' });
    }

    res.json({ message: 'Partner entity deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete partner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
