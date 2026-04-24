const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { agreementFilter, canAccessRecord } = require('../middleware/dataFilter');
const { requireWriteAccess } = require('../middleware/writeAccess');

// GET /api/agreements
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
      whereClause += ` AND (a.agreement_type ILIKE $${paramIdx} OR a.party_1 ILIKE $${paramIdx} OR a.party_2 ILIKE $${paramIdx} OR a.status ILIKE $${paramIdx} OR a.governing_law ILIKE $${paramIdx})`;
      paramIdx++;
    }

    // Role-based data filtering
    const filter = agreementFilter(req.user.role, req.user.id, paramIdx);
    whereClause += filter.clause;
    params.push(...filter.params);
    paramIdx = filter.nextParam;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM agreements a ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT a.*
       FROM agreements a
       ${whereClause}
       ORDER BY a.created_at DESC
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
    console.error('List agreements error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agreements/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM agreements WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    // C1: Data filtering for detail endpoint
    const hasAccess = await canAccessRecord(pool, 'agreements', 'a', agreementFilter, id, req.user.role, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this agreement' });
    }

    const risks = await pool.query(
      `SELECT r.*, u.full_name AS owner_name FROM risks r LEFT JOIN users u ON r.owner_user_id = u.id
       WHERE r.related_type = 'agreement' AND r.related_id = $1`,
      [id]
    );

    const activities = await pool.query(
      `SELECT a.*, u.full_name AS owner_name FROM activities a LEFT JOIN users u ON a.owner_user_id = u.id
       WHERE a.related_type = 'agreement' AND a.related_id = $1 ORDER BY a.activity_date DESC LIMIT 10`,
      [id]
    );

    res.json({
      ...result.rows[0],
      risks: risks.rows,
      activities: activities.rows,
    });
  } catch (err) {
    console.error('Get agreement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/agreements
router.post('/', auth, requireWriteAccess('agreements'), async (req, res) => {
  try {
    const { agreement_type, related_type, related_id, party_1, party_2, start_date, end_date,
      status, document_url, governing_law, renewal_date, notes } = req.body;

    if (!agreement_type) {
      return res.status(400).json({ error: 'Agreement type is required' });
    }

    const result = await pool.query(
      `INSERT INTO agreements (agreement_type, related_type, related_id, party_1, party_2, start_date,
       end_date, status, document_url, governing_law, renewal_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [agreement_type, related_type, related_id, party_1, party_2, start_date,
        end_date, status || 'draft', document_url, governing_law, renewal_date, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create agreement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/agreements/:id
router.put('/:id', auth, requireWriteAccess('agreements'), async (req, res) => {
  try {
    const { id } = req.params;
    const { agreement_type, related_type, related_id, party_1, party_2, start_date, end_date,
      status, document_url, governing_law, renewal_date, notes } = req.body;

    const result = await pool.query(
      `UPDATE agreements SET agreement_type=$1, related_type=$2, related_id=$3, party_1=$4, party_2=$5,
       start_date=$6, end_date=$7, status=$8, document_url=$9, governing_law=$10, renewal_date=$11,
       notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [agreement_type, related_type, related_id, party_1, party_2, start_date, end_date,
        status, document_url, governing_law, renewal_date, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update agreement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/agreements/:id
router.delete('/:id', auth, requireWriteAccess('agreements'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM agreements WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    res.json({ message: 'Agreement deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete agreement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
