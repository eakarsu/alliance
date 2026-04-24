const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { productFilter, canAccessRecord } = require('../middleware/dataFilter');
const { requireWriteAccess, requireOwnershipOrRole } = require('../middleware/writeAccess');

// GET /api/products
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
      whereClause += ` AND (p.product_name ILIKE $${paramIdx} OR p.category ILIKE $${paramIdx} OR p.maturity_level ILIKE $${paramIdx} OR pe.entity_name ILIKE $${paramIdx})`;
      paramIdx++;
    }

    // Role-based data filtering using centralized productFilter
    const filter = productFilter(req.user.role, req.user.id, paramIdx);
    whereClause += filter.clause;
    params.push(...filter.params);
    paramIdx = filter.nextParam;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p LEFT JOIN partner_entities pe ON p.owner_entity_id = pe.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT p.*, pe.entity_name AS owner_entity_name, u.full_name AS owner_name
       FROM products p
       LEFT JOIN partner_entities pe ON p.owner_entity_id = pe.id
       LEFT JOIN users u ON p.owner_user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
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
    console.error('List products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, pe.entity_name AS owner_entity_name, u.full_name AS owner_name
       FROM products p
       LEFT JOIN partner_entities pe ON p.owner_entity_id = pe.id
       LEFT JOIN users u ON p.owner_user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // C1: Data filtering for detail endpoint
    const hasAccess = await canAccessRecord(pool, 'products', 'p', productFilter, id, req.user.role, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this product' });
    }

    const capabilities = await pool.query(
      `SELECT pc.*, c.capability_name, c.category
       FROM product_capabilities pc
       LEFT JOIN capabilities c ON pc.capability_id = c.id
       WHERE pc.product_id = $1`,
      [id]
    );

    const markets = await pool.query(
      'SELECT * FROM product_markets WHERE product_id = $1',
      [id]
    );

    const opportunities = await pool.query(
      `SELECT op.opportunity_name, op.estimated_total_value, opp.role_in_deal
       FROM opportunity_products opp
       LEFT JOIN opportunities op ON opp.opportunity_id = op.id
       WHERE opp.product_id = $1`,
      [id]
    );

    res.json({
      ...result.rows[0],
      capabilities: capabilities.rows,
      markets: markets.rows,
      opportunities: opportunities.rows,
    });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products
router.post('/', auth, requireWriteAccess('products'), async (req, res) => {
  try {
    const { product_name, category, owner_entity_id, owner_user_id, maturity_level, demo_available,
      recurring_model, white_label_possible, reseller_possible, implementation_required,
      compliance_risk_level, status, notes } = req.body;

    if (!product_name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const result = await pool.query(
      `INSERT INTO products (product_name, category, owner_entity_id, owner_user_id, maturity_level,
       demo_available, recurring_model, white_label_possible, reseller_possible, implementation_required,
       compliance_risk_level, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [product_name, category, owner_entity_id, owner_user_id || req.user.id, maturity_level,
        demo_available || false, recurring_model || false, white_label_possible || false,
        reseller_possible || false, implementation_required || false, compliance_risk_level, status || 'active', notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', auth, requireWriteAccess('products'), requireOwnershipOrRole('products', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, category, owner_entity_id, owner_user_id, maturity_level, demo_available,
      recurring_model, white_label_possible, reseller_possible, implementation_required,
      compliance_risk_level, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE products SET product_name=$1, category=$2, owner_entity_id=$3, owner_user_id=$4,
       maturity_level=$5, demo_available=$6, recurring_model=$7, white_label_possible=$8,
       reseller_possible=$9, implementation_required=$10, compliance_risk_level=$11, status=$12,
       notes=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [product_name, category, owner_entity_id, owner_user_id, maturity_level, demo_available,
        recurring_model, white_label_possible, reseller_possible, implementation_required,
        compliance_risk_level, status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/:id/request-demo
router.post('/:id/request-demo', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { opportunity_id, notes } = req.body;

    const product = await pool.query('SELECT product_name, owner_user_id FROM products WHERE id = $1', [id]);
    if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    // Create an activity for the demo request
    const result = await pool.query(
      `INSERT INTO activities (related_type, related_id, activity_type, owner_user_id, summary, next_step, private_flag)
       VALUES ('product', $1, 'demo', $2, $3, 'Schedule demo', false) RETURNING *`,
      [id, req.user.id, `Demo requested for ${product.rows[0].product_name}${opportunity_id ? ` (Opportunity #${opportunity_id})` : ''}. ${notes || ''}`]
    );

    // Notify product owner
    if (product.rows[0].owner_user_id) {
      const { createNotification } = require('../utils/notify');
      await createNotification({
        userId: product.rows[0].owner_user_id,
        type: 'demo_requested',
        title: 'Demo Requested',
        message: `${req.user.full_name || 'A user'} requested a demo for "${product.rows[0].product_name}"`,
        entityType: 'product',
        entityId: parseInt(id)
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Request demo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', auth, requireWriteAccess('products'), requireOwnershipOrRole('products', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
