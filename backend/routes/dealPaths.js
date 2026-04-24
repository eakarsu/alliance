const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// GET /api/deal-paths
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deal_paths ORDER BY id');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('List deal paths error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/deal-paths/:id/opportunities
router.get('/:id/opportunities', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT op.id, op.opportunity_name, op.estimated_total_value, op.expected_close_date,
       s.stage_name, o.org_name AS account_name, u.full_name AS deal_owner_name
       FROM opportunity_paths opp
       JOIN opportunities op ON opp.opportunity_id = op.id
       LEFT JOIN stages s ON op.stage_id = s.id
       LEFT JOIN organizations o ON op.account_org_id = o.id
       LEFT JOIN users u ON op.deal_owner_user_id = u.id
       WHERE opp.deal_path_id = $1
       ORDER BY op.created_at DESC`,
      [id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Deal path opportunities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
