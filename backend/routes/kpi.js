const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { isFullAccess, kpiFilter, canAccessRecord } = require('../middleware/dataFilter');
const { requireWriteAccess } = require('../middleware/writeAccess');

// GET /api/kpi
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
      whereClause = `WHERE k.metric_name ILIKE $1 OR k.contribution_type ILIKE $1 OR u.full_name ILIKE $1`;
    }

    // Role-based filtering: non-full-access users see only own KPI
    if (!isFullAccess(req.user.role)) {
      params.push(req.user.id);
      whereClause += (whereClause ? ' AND' : 'WHERE') + ` k.user_id = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM kpi_contributions k LEFT JOIN users u ON k.user_id = u.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT k.*, u.full_name AS user_name
       FROM kpi_contributions k
       LEFT JOIN users u ON k.user_id = u.id
       ${whereClause}
       ORDER BY k.created_at DESC
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
    console.error('List KPI error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/kpi/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT k.*, u.full_name AS user_name
       FROM kpi_contributions k
       LEFT JOIN users u ON k.user_id = u.id
       WHERE k.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI contribution not found' });
    }

    // C1: Data filtering for detail endpoint
    const hasAccess = await canAccessRecord(pool, 'kpi_contributions', 'k', kpiFilter, id, req.user.role, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this KPI contribution' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get KPI error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/kpi
router.post('/', auth, requireWriteAccess('kpi'), async (req, res) => {
  try {
    const { user_id, contribution_type, related_type, related_id, metric_name, metric_value,
      period_start, period_end, notes } = req.body;

    if (!metric_name || !user_id) {
      return res.status(400).json({ error: 'User ID and metric name are required' });
    }

    const result = await pool.query(
      `INSERT INTO kpi_contributions (user_id, contribution_type, related_type, related_id, metric_name,
       metric_value, period_start, period_end, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [user_id, contribution_type, related_type, related_id, metric_name, metric_value,
        period_start, period_end, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create KPI error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/kpi/:id
router.put('/:id', auth, requireWriteAccess('kpi'), async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, contribution_type, related_type, related_id, metric_name, metric_value,
      period_start, period_end, notes } = req.body;

    // C3: Ownership check - non-full-access users can only modify their own KPI
    if (!isFullAccess(req.user.role)) {
      const existing = await pool.query('SELECT user_id FROM kpi_contributions WHERE id = $1', [id]);
      if (existing.rows.length > 0 && existing.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only modify your own KPI contributions' });
      }
    }

    const result = await pool.query(
      `UPDATE kpi_contributions SET user_id=$1, contribution_type=$2, related_type=$3, related_id=$4,
       metric_name=$5, metric_value=$6, period_start=$7, period_end=$8, notes=$9
       WHERE id=$10 RETURNING *`,
      [user_id, contribution_type, related_type, related_id, metric_name, metric_value,
        period_start, period_end, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI contribution not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update KPI error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/kpi/:id
router.delete('/:id', auth, requireWriteAccess('kpi'), async (req, res) => {
  try {
    const { id } = req.params;

    // C3: Ownership check - non-full-access users can only delete their own KPI
    if (!isFullAccess(req.user.role)) {
      const existing = await pool.query('SELECT user_id FROM kpi_contributions WHERE id = $1', [id]);
      if (existing.rows.length > 0 && existing.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own KPI contributions' });
      }
    }

    const result = await pool.query('DELETE FROM kpi_contributions WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI contribution not found' });
    }

    res.json({ message: 'KPI contribution deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete KPI error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
