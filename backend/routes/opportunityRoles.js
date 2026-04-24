const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { requireWriteAccess } = require('../middleware/writeAccess');

const VALID_ROLES = [
  'source_owner',
  'sponsor',
  'deal_owner',
  'technical_partner',
  'product_owner',
  'delivery_owner',
  'co_sell_partner',
  'advisor',
];

// GET /api/opportunity-roles/by-opportunity/:opportunityId — List all roles for an opportunity
router.get('/by-opportunity/:opportunityId', auth, async (req, res) => {
  try {
    const { opportunityId } = req.params;

    const result = await pool.query(
      `SELECT opr.*, u.full_name AS user_name
       FROM opportunity_roles opr
       LEFT JOIN users u ON opr.user_id = u.id
       WHERE opr.opportunity_id = $1
       ORDER BY opr.assigned_at DESC`,
      [opportunityId]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('List roles by opportunity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/opportunity-roles/by-user/:userId — List all opportunity roles for a user
router.get('/by-user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT opr.*, o.opportunity_name
       FROM opportunity_roles opr
       LEFT JOIN opportunities o ON opr.opportunity_id = o.id
       WHERE opr.user_id = $1
       ORDER BY opr.assigned_at DESC`,
      [userId]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('List roles by user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/opportunity-roles/my-roles — List all opportunity roles for the current user
router.get('/my-roles', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT opr.*, o.opportunity_name
       FROM opportunity_roles opr
       LEFT JOIN opportunities o ON opr.opportunity_id = o.id
       WHERE opr.user_id = $1
       ORDER BY opr.assigned_at DESC`,
      [req.user.id]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('List my roles error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/opportunity-roles — Assign a role
router.post('/', auth, requireWriteAccess('opportunities'), async (req, res) => {
  try {
    const { opportunity_id, user_id, role_in_opportunity, notes } = req.body;

    if (!opportunity_id || !user_id || !role_in_opportunity) {
      return res.status(400).json({ error: 'opportunity_id, user_id, and role_in_opportunity are required' });
    }

    if (!VALID_ROLES.includes(role_in_opportunity)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO opportunity_roles (opportunity_id, user_id, role_in_opportunity, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [opportunity_id, user_id, role_in_opportunity, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This user already has this role on the specified opportunity' });
    }
    console.error('Assign role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/opportunity-roles/:id — Remove a role assignment
router.delete('/:id', auth, requireWriteAccess('opportunities'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM opportunity_roles WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role assignment not found' });
    }

    res.json({ message: 'Role assignment removed', id: parseInt(id) });
  } catch (err) {
    console.error('Remove role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
