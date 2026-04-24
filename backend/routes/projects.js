const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');
const { projectFilter, canAccessRecord } = require('../middleware/dataFilter');
const { requireWriteAccess, requireOwnershipOrRole } = require('../middleware/writeAccess');

// GET /api/projects
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
      whereClause += ` AND (pj.project_name ILIKE $${paramIdx} OR pj.status ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx})`;
      paramIdx++;
    }

    // Role-based data filtering
    const filter = projectFilter(req.user.role, req.user.id, paramIdx);
    whereClause += filter.clause;
    params.push(...filter.params);
    paramIdx = filter.nextParam;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM projects pj LEFT JOIN users u ON pj.project_owner_user_id = u.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT pj.*, u.full_name AS project_owner_name, dm.full_name AS delivery_manager_name,
       tl.full_name AS technical_lead_name, op.opportunity_name
       FROM projects pj
       LEFT JOIN users u ON pj.project_owner_user_id = u.id
       LEFT JOIN users dm ON pj.delivery_manager_user_id = dm.id
       LEFT JOIN users tl ON pj.technical_lead_user_id = tl.id
       LEFT JOIN opportunities op ON pj.opportunity_id = op.id
       ${whereClause}
       ORDER BY pj.created_at DESC
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
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pj.*, u.full_name AS project_owner_name, dm.full_name AS delivery_manager_name,
       tl.full_name AS technical_lead_name, op.opportunity_name
       FROM projects pj
       LEFT JOIN users u ON pj.project_owner_user_id = u.id
       LEFT JOIN users dm ON pj.delivery_manager_user_id = dm.id
       LEFT JOIN users tl ON pj.technical_lead_user_id = tl.id
       LEFT JOIN opportunities op ON pj.opportunity_id = op.id
       WHERE pj.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // C1: Data filtering for detail endpoint
    const hasAccess = await canAccessRecord(pool, 'projects', 'pj', projectFilter, id, req.user.role, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const milestones = await pool.query(
      `SELECT pm.*, u.full_name AS owner_name
       FROM project_milestones pm
       LEFT JOIN users u ON pm.owner_user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.due_date`,
      [id]
    );

    const risks = await pool.query(
      `SELECT r.*, u.full_name AS owner_name FROM risks r LEFT JOIN users u ON r.owner_user_id = u.id
       WHERE r.related_type = 'project' AND r.related_id = $1`,
      [id]
    );

    const activities = await pool.query(
      `SELECT a.*, u.full_name AS owner_name FROM activities a LEFT JOIN users u ON a.owner_user_id = u.id
       WHERE a.related_type = 'project' AND a.related_id = $1 ORDER BY a.activity_date DESC LIMIT 10`,
      [id]
    );

    // Fetch linked agreements (SOW/Agreements linked to this project or its opportunity)
    const agreements = await pool.query(
      `SELECT a.* FROM agreements a
       WHERE (a.related_type = 'project' AND a.related_id = $1)
       OR (a.related_type = 'opportunity' AND a.related_id = (SELECT opportunity_id FROM projects WHERE id = $1))`,
      [id]
    );

    const changeRequests = await pool.query(
      `SELECT cr.*, u.full_name AS requested_by_name
       FROM change_requests cr LEFT JOIN users u ON cr.requested_by_user_id = u.id
       WHERE cr.project_id = $1 ORDER BY cr.created_at DESC`,
      [id]
    );

    const projectRoles = await pool.query(
      `SELECT pr.*, u.full_name AS user_name
       FROM project_roles pr LEFT JOIN users u ON pr.user_id = u.id
       WHERE pr.project_id = $1`,
      [id]
    );

    res.json({
      ...result.rows[0],
      milestones: milestones.rows,
      risks: risks.rows,
      activities: activities.rows,
      agreements: agreements.rows,
      change_requests: changeRequests.rows,
      project_roles: projectRoles.rows,
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects
router.post('/', auth, requireWriteAccess('projects'), async (req, res) => {
  try {
    const { project_name, opportunity_id, project_owner_user_id, delivery_manager_user_id,
      technical_lead_user_id, start_date, target_end_date, status, scope_version,
      support_end_date, budget, notes } = req.body;

    if (!project_name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = await pool.query(
      `INSERT INTO projects (project_name, opportunity_id, project_owner_user_id, delivery_manager_user_id,
       technical_lead_user_id, start_date, target_end_date, status, scope_version, support_end_date, budget, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [project_name, opportunity_id, project_owner_user_id || req.user.id, delivery_manager_user_id,
        technical_lead_user_id, start_date, target_end_date, status || 'planning', scope_version,
        support_end_date, budget, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', auth, requireWriteAccess('projects'), requireOwnershipOrRole('projects', ['project_owner_user_id', 'delivery_manager_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const { project_name, opportunity_id, project_owner_user_id, delivery_manager_user_id,
      technical_lead_user_id, start_date, target_end_date, status, scope_version,
      support_end_date, budget, notes } = req.body;

    const result = await pool.query(
      `UPDATE projects SET project_name=$1, opportunity_id=$2, project_owner_user_id=$3,
       delivery_manager_user_id=$4, technical_lead_user_id=$5, start_date=$6, target_end_date=$7,
       status=$8, scope_version=$9, support_end_date=$10, budget=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [project_name, opportunity_id, project_owner_user_id, delivery_manager_user_id,
        technical_lead_user_id, start_date, target_end_date, status, scope_version,
        support_end_date, budget, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/milestones - Create a milestone for a project
router.post('/:id/milestones', auth, requireWriteAccess('projects'), async (req, res) => {
  try {
    const { id } = req.params;
    const { milestone_name, due_date, status, owner_user_id, notes } = req.body;

    if (!milestone_name) {
      return res.status(400).json({ error: 'Milestone name is required' });
    }

    // Verify project exists
    const project = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await pool.query(
      `INSERT INTO project_milestones (project_id, milestone_name, due_date, status, owner_user_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, milestone_name, due_date, status || 'pending', owner_user_id, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create milestone error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:projectId/milestones/:milestoneId - Update a milestone
router.put('/:projectId/milestones/:milestoneId', auth, requireWriteAccess('projects'), async (req, res) => {
  try {
    const { projectId, milestoneId } = req.params;
    const { milestone_name, due_date, status, owner_user_id, notes } = req.body;

    const result = await pool.query(
      `UPDATE project_milestones SET milestone_name = $1, due_date = $2, status = $3,
       owner_user_id = $4, notes = $5, updated_at = NOW()
       WHERE id = $6 AND project_id = $7 RETURNING *`,
      [milestone_name, due_date, status, owner_user_id, notes, milestoneId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update milestone error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:projectId/milestones/:milestoneId - Delete a milestone
router.delete('/:projectId/milestones/:milestoneId', auth, requireWriteAccess('projects'), async (req, res) => {
  try {
    const { projectId, milestoneId } = req.params;

    const result = await pool.query(
      'DELETE FROM project_milestones WHERE id = $1 AND project_id = $2 RETURNING id',
      [milestoneId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json({ message: 'Milestone deleted', id: parseInt(milestoneId) });
  } catch (err) {
    console.error('Delete milestone error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id/change-requests
router.get('/:id/change-requests', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.*, u.full_name AS requested_by_name, r.full_name AS reviewed_by_name
       FROM change_requests cr
       LEFT JOIN users u ON cr.requested_by_user_id = u.id
       LEFT JOIN users r ON cr.reviewed_by_user_id = r.id
       WHERE cr.project_id = $1
       ORDER BY cr.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List change requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:id/change-requests
router.post('/:id/change-requests', auth, async (req, res) => {
  try {
    const { change_type, description, impact_scope, impact_budget, impact_timeline } = req.body;
    if (!change_type || !description) {
      return res.status(400).json({ error: 'change_type and description are required' });
    }
    const result = await pool.query(
      `INSERT INTO change_requests (project_id, requested_by_user_id, change_type, description, impact_scope, impact_budget, impact_timeline)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, req.user.id, change_type, description, impact_scope, impact_budget, impact_timeline]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create change request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:projectId/change-requests/:crId/review
router.put('/:projectId/change-requests/:crId/review', auth, async (req, res) => {
  try {
    // Governance check: only founding_orchestrator or PMO can review change requests
    if (!['founding_orchestrator', 'pmo_coordinator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only governance or PMO can review change requests' });
    }

    const { status, review_notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }
    const result = await pool.query(
      `UPDATE change_requests SET status = $1, reviewed_by_user_id = $2, review_notes = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $4 AND project_id = $5 RETURNING *`,
      [status, req.user.id, review_notes, req.params.crId, req.params.projectId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Change request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Review change request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, requireWriteAccess('projects'), requireOwnershipOrRole('projects', ['project_owner_user_id', 'delivery_manager_user_id']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted', id: parseInt(id) });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
