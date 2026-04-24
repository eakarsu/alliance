const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');

// Entity type to table/column mapping for display name lookup
const ENTITY_TYPE_MAP = {
  opportunity: { table: 'opportunities', nameCol: 'opportunity_name' },
  product: { table: 'products', nameCol: 'product_name' },
  lead: { table: 'leads', nameCol: 'lead_name' },
  contact: { table: 'contacts', nameCol: "first_name || ' ' || last_name" },
  organization: { table: 'organizations', nameCol: 'org_name' },
  project: { table: 'projects', nameCol: 'project_name' },
  agreement: { table: 'agreements', nameCol: 'agreement_type' },
  partner: { table: 'partner_entities', nameCol: 'entity_name' },
  proposal: { table: 'proposals', nameCol: 'proposal_number' },
};

// GET /api/shared-items — List all items shared with the current user
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT si.*, u.full_name AS shared_by_name
       FROM shared_items si
       LEFT JOIN users u ON si.shared_by_user_id = u.id
       WHERE si.shared_with_user_id = $1
       ORDER BY si.shared_at DESC`,
      [req.user.id]
    );

    // Fetch entity display names
    const items = await Promise.all(
      result.rows.map(async (item) => {
        const mapping = ENTITY_TYPE_MAP[item.entity_type];
        let entity_display_name = null;
        if (mapping) {
          const entityResult = await pool.query(
            `SELECT ${mapping.nameCol} AS display_name FROM ${mapping.table} WHERE id = $1`,
            [item.entity_id]
          );
          if (entityResult.rows.length > 0) {
            entity_display_name = entityResult.rows[0].display_name;
          }
        }
        // Enrich with entity summary
        let entity_summary = null;
        try {
          if (item.entity_type === 'product') {
            const p = await pool.query('SELECT product_name, category, status, maturity_level FROM products WHERE id = $1', [item.entity_id]);
            entity_summary = p.rows[0] || null;
          } else if (item.entity_type === 'opportunity') {
            const o = await pool.query('SELECT opportunity_name, deal_type, estimated_total_value FROM opportunities WHERE id = $1', [item.entity_id]);
            entity_summary = o.rows[0] || null;
          } else if (item.entity_type === 'agreement') {
            const a = await pool.query('SELECT agreement_type, party_1, party_2, status, start_date, end_date FROM agreements WHERE id = $1', [item.entity_id]);
            entity_summary = a.rows[0] || null;
          } else if (item.entity_type === 'lead') {
            const l = await pool.query('SELECT lead_name, geography, status, estimated_value FROM leads WHERE id = $1', [item.entity_id]);
            entity_summary = l.rows[0] || null;
          } else if (item.entity_type === 'organization') {
            const o = await pool.query('SELECT org_name, country, industry FROM organizations WHERE id = $1', [item.entity_id]);
            entity_summary = o.rows[0] || null;
          }
        } catch { entity_summary = null; }

        return { ...item, entity_display_name, entity_summary };
      })
    );

    res.json({ data: items });
  } catch (err) {
    console.error('List shared items error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/shared-items — Share an item with a user
router.post('/', auth, async (req, res) => {
  try {
    const { shared_with_user_id, entity_type, entity_id, access_level, notes } = req.body;

    if (!shared_with_user_id || !entity_type || !entity_id) {
      return res.status(400).json({ error: 'shared_with_user_id, entity_type, and entity_id are required' });
    }

    const result = await pool.query(
      `INSERT INTO shared_items (shared_with_user_id, shared_by_user_id, entity_type, entity_id, access_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [shared_with_user_id, req.user.id, entity_type, entity_id, access_level || 'view', notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Share item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/shared-items/:id — Unshare an item (only if you shared it)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM shared_items WHERE id = $1 AND shared_by_user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shared item not found or not authorized to unshare' });
    }

    res.json({ message: 'Shared item removed', id: parseInt(id) });
  } catch (err) {
    console.error('Unshare item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
