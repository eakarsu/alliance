const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { riskFilter, canAccessRecord } = require('../middleware/dataFilter');
const { requireWriteAccess, requireOwnershipOrRole } = require('../middleware/writeAccess');

// GET /api/risks
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
      whereClause += ` AND (r.risk_type ILIKE $${paramIdx} OR r.severity ILIKE $${paramIdx} OR r.status ILIKE $${paramIdx} OR r.related_type ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx})`;
      paramIdx++;
    }

    // Role-based data filtering
    const filter = riskFilter(req.user.role, req.user.id, paramIdx);
    whereClause += filter.clause;
    params.push(...filter.params);
    paramIdx = filter.nextParam;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM risks r LEFT JOIN users u ON r.owner_user_id = u.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT r.*, u.full_name AS owner_name
       FROM risks r
       LEFT JOIN users u ON r.owner_user_id = u.id
       ${whereClause}
       ORDER BY CASE r.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, r.created_at DESC
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
    console.error('List risks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/risks/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, u.full_name AS owner_name
       FROM risks r
       LEFT JOIN users u ON r.owner_user_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    // C1: Data filtering for detail endpoint
    const hasAccess = await canAccessRecord(pool, 'risks', 'r', riskFilter, id, req.user.role, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this risk' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get risk error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/risks
router.post('/', auth, requireWriteAccess('risks'), async (req, res) => {
  try {
    const { related_type, related_id, risk_type, severity, status, owner_user_id, mitigation_notes } = req.body;

    if (!risk_type || !severity) {
      return res.status(400).json({ error: 'Risk type and severity are required' });
    }

    const result = await pool.query(
      `INSERT INTO risks (related_type, related_id, risk_type, severity, status, owner_user_id, mitigation_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [related_type, related_id, risk_type, severity, status || 'open', owner_user_id || req.user.id, mitigation_notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create risk error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/risks/:id
router.put('/:id', auth, requireWriteAccess('risks'), requireOwnershipOrRole('risks', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const { related_type, related_id, risk_type, severity, status, owner_user_id, mitigation_notes } = req.body;

    const result = await pool.query(
      `UPDATE risks SET related_type=$1, related_id=$2, risk_type=$3, severity=$4, status=$5,
       owner_user_id=$6, mitigation_notes=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [related_type, related_id, risk_type, severity, status, owner_user_id, mitigation_notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update risk error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/risks/:id
router.delete('/:id', auth, requireWriteAccess('risks'), requireOwnershipOrRole('risks', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM risks WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json({ message: 'Risk deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete risk error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
