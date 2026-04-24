const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { logAudit } = require('../utils/auditLog');

// GET /api/compliance-reviews
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (status) {
      params.push(status);
      whereClause += ` AND cr.review_status = $${paramIdx}`;
      paramIdx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM compliance_reviews cr ${whereClause}`, params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT cr.*, u.full_name AS reviewer_name
       FROM compliance_reviews cr
       LEFT JOIN users u ON cr.reviewer_user_id = u.id
       ${whereClause}
       ORDER BY cr.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page, limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('List compliance reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/compliance-reviews/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.*, u.full_name AS reviewer_name
       FROM compliance_reviews cr
       LEFT JOIN users u ON cr.reviewer_user_id = u.id
       WHERE cr.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get compliance review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/compliance-reviews
router.post('/', async (req, res) => {
  try {
    const { related_type, related_id, personal_data_flag, recording_flag, eu_data_flag,
      dpa_required_flag, security_review_flag, ip_license_required_flag, notes } = req.body;

    if (!related_type || !related_id) {
      return res.status(400).json({ error: 'related_type and related_id are required' });
    }

    const result = await pool.query(
      `INSERT INTO compliance_reviews (related_type, related_id, personal_data_flag, recording_flag,
       eu_data_flag, dpa_required_flag, security_review_flag, ip_license_required_flag,
       reviewer_user_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [related_type, related_id, personal_data_flag || false, recording_flag || false,
       eu_data_flag || false, dpa_required_flag || false, security_review_flag || false,
       ip_license_required_flag || false, req.user.id, notes]
    );

    await logAudit({
      actorUserId: req.user.id,
      actionType: 'create',
      entityType: 'compliance_review',
      entityId: result.rows[0].id,
      newValue: result.rows[0],
      ipAddress: req.ip,
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create compliance review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/compliance-reviews/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { personal_data_flag, recording_flag, eu_data_flag, dpa_required_flag,
      security_review_flag, ip_license_required_flag, review_status, notes } = req.body;

    const old = await pool.query('SELECT * FROM compliance_reviews WHERE id = $1', [id]);
    if (old.rows.length === 0) return res.status(404).json({ error: 'Review not found' });

    const result = await pool.query(
      `UPDATE compliance_reviews SET personal_data_flag=$1, recording_flag=$2, eu_data_flag=$3,
       dpa_required_flag=$4, security_review_flag=$5, ip_license_required_flag=$6,
       review_status=$7, notes=$8, reviewer_user_id=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [personal_data_flag, recording_flag, eu_data_flag, dpa_required_flag,
       security_review_flag, ip_license_required_flag, review_status, notes, req.user.id, id]
    );

    await logAudit({
      actorUserId: req.user.id,
      actionType: 'update',
      entityType: 'compliance_review',
      entityId: parseInt(id),
      oldValue: old.rows[0],
      newValue: result.rows[0],
      ipAddress: req.ip,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update compliance review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/compliance-reviews/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM compliance_reviews WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found' });

    await logAudit({
      actorUserId: req.user.id,
      actionType: 'delete',
      entityType: 'compliance_review',
      entityId: parseInt(id),
      ipAddress: req.ip,
    });

    res.json({ message: 'Review deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete compliance review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
