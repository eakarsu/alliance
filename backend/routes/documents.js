const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { isFullAccess, isRestricted } = require('../middleware/dataFilter');
const { requireWriteAccess } = require('../middleware/writeAccess');

// GET /api/documents
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    // Restricted users: only shared documents
    if (isRestricted(req.user.role)) {
      whereClause += ` AND d.id IN (SELECT entity_id FROM shared_items WHERE shared_with_user_id = $${paramIdx} AND entity_type = 'document')`;
      params.push(req.user.id);
      paramIdx++;
    } else if (!isFullAccess(req.user.role) && req.user.role !== 'pmo_coordinator' && req.user.role !== 'solution_architect') {
      // Partners: own uploaded + shared
      whereClause += ` AND (d.uploaded_by_user_id = $${paramIdx} OR d.id IN (SELECT entity_id FROM shared_items WHERE shared_with_user_id = $${paramIdx} AND entity_type = 'document'))`;
      params.push(req.user.id);
      paramIdx++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM documents d ${whereClause}`, params);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT d.*, u.full_name AS uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by_user_id = u.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page, limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents
router.post('/', auth, requireWriteAccess('documents'), async (req, res) => {
  try {
    const { title, document_url, document_type, related_type, related_id, visibility_level, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = await pool.query(
      `INSERT INTO documents (title, document_url, document_type, related_type, related_id, uploaded_by_user_id, visibility_level, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, document_url, document_type, related_type, related_id, req.user.id, visibility_level || 'internal', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
