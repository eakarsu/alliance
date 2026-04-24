const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { activityFilter } = require('../middleware/dataFilter');
const { requireWriteAccess, requireOwnershipOrRole } = require('../middleware/writeAccess');

// GET /api/activities
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
      whereClause += ` AND (a.summary ILIKE $${paramIdx} OR a.activity_type ILIKE $${paramIdx} OR a.related_type ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx})`;
      paramIdx++;
    }

    // Role-based: partners see own + non-private
    const filter = activityFilter(req.user.role, req.user.id, paramIdx);
    whereClause += filter.clause;
    params.push(...filter.params);
    paramIdx = filter.nextParam;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM activities a LEFT JOIN users u ON a.owner_user_id = u.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT a.*, u.full_name AS owner_name
       FROM activities a
       LEFT JOIN users u ON a.owner_user_id = u.id
       ${whereClause}
       ORDER BY a.activity_date DESC
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
    console.error('List activities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/activities/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT a.*, u.full_name AS owner_name
       FROM activities a
       LEFT JOIN users u ON a.owner_user_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/activities
router.post('/', auth, requireWriteAccess('activities'), async (req, res) => {
  try {
    const { related_type, related_id, activity_type, owner_user_id, activity_date, summary, next_step, private_flag } = req.body;

    if (!activity_type || !summary) {
      return res.status(400).json({ error: 'Activity type and summary are required' });
    }

    const result = await pool.query(
      `INSERT INTO activities (related_type, related_id, activity_type, owner_user_id, activity_date, summary, next_step, private_flag)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [related_type, related_id, activity_type, owner_user_id || req.user.id, activity_date || new Date(), summary, next_step, private_flag || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/activities/:id
router.put('/:id', auth, requireWriteAccess('activities'), requireOwnershipOrRole('activities', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const { related_type, related_id, activity_type, owner_user_id, activity_date, summary, next_step, private_flag } = req.body;

    const result = await pool.query(
      `UPDATE activities SET related_type=$1, related_id=$2, activity_type=$3, owner_user_id=$4,
       activity_date=$5, summary=$6, next_step=$7, private_flag=$8
       WHERE id=$9 RETURNING *`,
      [related_type, related_id, activity_type, owner_user_id, activity_date, summary, next_step, private_flag, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/activities/:id
router.delete('/:id', auth, requireWriteAccess('activities'), requireOwnershipOrRole('activities', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM activities WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
