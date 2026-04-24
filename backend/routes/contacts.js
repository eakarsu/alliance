const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { ownerFilter, canAccessContact } = require('../middleware/dataFilter');
const { requireWriteAccess, requireOwnershipOrRole } = require('../middleware/writeAccess');

// GET /api/contacts
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
      whereClause += ` AND (c.first_name ILIKE $${paramIdx} OR c.last_name ILIKE $${paramIdx} OR c.email ILIKE $${paramIdx} OR c.title ILIKE $${paramIdx} OR o.org_name ILIKE $${paramIdx})`;
      paramIdx++;
    }

    // Role-based: partners see own contacts + contacts they have relationship links with
    const filter = ownerFilter(req.user.role, req.user.id, 'c.owner_user_id', paramIdx);
    if (filter.clause) {
      // Expand to include relationship links
      const { isPartnerRole } = require('../middleware/dataFilter');
      if (isPartnerRole(req.user.role)) {
        whereClause += ` AND (c.owner_user_id = $${paramIdx} OR c.id IN (SELECT contact_id FROM relationship_links WHERE known_by_user_id = $${paramIdx}))`;
        params.push(req.user.id);
        paramIdx++;
      } else {
        whereClause += filter.clause.replace('$PARAM', `$${paramIdx}`);
        params.push(...filter.params);
        paramIdx = paramIdx + filter.params.length;
      }
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM contacts c LEFT JOIN organizations o ON c.organization_id = o.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT c.*, o.org_name, u.full_name AS owner_name
       FROM contacts c
       LEFT JOIN organizations o ON c.organization_id = o.id
       LEFT JOIN users u ON c.owner_user_id = u.id
       ${whereClause}
       ORDER BY c.created_at DESC
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
    console.error('List contacts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contacts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.*, o.org_name, u.full_name AS owner_name
       FROM contacts c
       LEFT JOIN organizations o ON c.organization_id = o.id
       LEFT JOIN users u ON c.owner_user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // C1: Data filtering for detail endpoint
    const hasAccess = await canAccessContact(pool, id, req.user.role, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this contact' });
    }

    const relationships = await pool.query(
      `SELECT rl.*, u.full_name AS known_by_name, iu.full_name AS intro_owner_name
       FROM relationship_links rl
       LEFT JOIN users u ON rl.known_by_user_id = u.id
       LEFT JOIN users iu ON rl.intro_owner_user_id = iu.id
       WHERE rl.contact_id = $1`,
      [id]
    );

    const activities = await pool.query(
      `SELECT a.*, u.full_name AS owner_name
       FROM activities a
       LEFT JOIN users u ON a.owner_user_id = u.id
       WHERE a.related_type = 'contact' AND a.related_id = $1
       ORDER BY a.activity_date DESC LIMIT 10`,
      [id]
    );

    res.json({
      ...result.rows[0],
      relationships: relationships.rows,
      activities: activities.rows,
    });
  } catch (err) {
    console.error('Get contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/contacts
router.post('/', auth, requireWriteAccess('contacts'), async (req, res) => {
  try {
    const { first_name, last_name, title, email, phone, linkedin_url, organization_id, owner_user_id, trust_level, visibility_level, consent_status, notes, known_by_user_id } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const result = await pool.query(
      `INSERT INTO contacts (first_name, last_name, title, email, phone, linkedin_url, organization_id, owner_user_id, trust_level, visibility_level, consent_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [first_name, last_name, title, email, phone, linkedin_url, organization_id, owner_user_id || req.user.id, trust_level, visibility_level, consent_status, notes]
    );

    // M8: Auto-create relationship_link if known_by_user_id is provided
    if (known_by_user_id) {
      await pool.query(
        'INSERT INTO relationship_links (contact_id, known_by_user_id, trust_level) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [result.rows[0].id, known_by_user_id, trust_level || 'medium']
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/contacts/:id
router.put('/:id', auth, requireWriteAccess('contacts'), requireOwnershipOrRole('contacts', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, title, email, phone, linkedin_url, organization_id, owner_user_id, trust_level, visibility_level, consent_status, notes } = req.body;

    const result = await pool.query(
      `UPDATE contacts SET first_name = $1, last_name = $2, title = $3, email = $4, phone = $5, linkedin_url = $6,
       organization_id = $7, owner_user_id = $8, trust_level = $9, visibility_level = $10, consent_status = $11, notes = $12, updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [first_name, last_name, title, email, phone, linkedin_url, organization_id, owner_user_id, trust_level, visibility_level, consent_status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', auth, requireWriteAccess('contacts'), requireOwnershipOrRole('contacts', ['owner_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
