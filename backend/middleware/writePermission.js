const pool = require('../db/connection');
const { isFullAccess } = require('./dataFilter');

function requireWritePermission(entityType) {
  return async (req, res, next) => {
    try {
      const { role, id: userId } = req.user;
      const entityId = req.params.id;

      // Restricted users: block all writes
      if (role === 'restricted_external') {
        return res.status(403).json({ error: 'Restricted users cannot modify records' });
      }

      // Full access roles can write anything in their resource scope
      if (isFullAccess(role)) return next();

      // Governance actions: only founding_orchestrator and pmo_coordinator
      if (['conflict_resolution', 'visibility_review', 'compliance_review'].includes(entityType)) {
        if (!['founding_orchestrator', 'pmo_coordinator'].includes(role)) {
          return res.status(403).json({ error: 'Only governance roles can perform this action' });
        }
        return next();
      }

      // Opportunity writes: owner, source_owner, or sponsor
      if (entityType === 'opportunity' && entityId) {
        const opp = await pool.query('SELECT deal_owner_user_id, source_owner_user_id, sponsor_user_id FROM opportunities WHERE id = $1', [entityId]);
        if (opp.rows.length === 0) return next(); // let the route handle 404
        const row = opp.rows[0];
        if (row.deal_owner_user_id === userId || row.source_owner_user_id === userId || row.sponsor_user_id === userId) return next();
        // Check opportunity_roles
        const roleCheck = await pool.query('SELECT id FROM opportunity_roles WHERE opportunity_id = $1 AND user_id = $2', [entityId, userId]);
        if (roleCheck.rows.length > 0) return next();
        return res.status(403).json({ error: 'You do not have permission to modify this opportunity' });
      }

      // Lead writes: source_owner or sponsor
      if (entityType === 'lead' && entityId) {
        const lead = await pool.query('SELECT source_owner_user_id, sponsor_user_id FROM leads WHERE id = $1', [entityId]);
        if (lead.rows.length === 0) return next();
        const row = lead.rows[0];
        if (row.source_owner_user_id === userId || row.sponsor_user_id === userId) return next();
        return res.status(403).json({ error: 'You do not have permission to modify this lead' });
      }

      // For creates (no entityId), allow if user has page access (already checked by requireAccess)
      next();
    } catch (err) {
      console.error('Write permission error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Ownership check for partner roles on edit/delete
function checkOwnership(table, ownerColumns) {
  return async (req, res, next) => {
    const { isPartnerRole } = require('./dataFilter');
    if (!isPartnerRole(req.user.role)) return next(); // non-partners skip ownership check

    const id = req.params.id || req.params.projectId;
    if (!id) return next();

    try {
      const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      if (result.rows.length === 0) return next(); // let 404 be handled by the route

      const record = result.rows[0];
      const isOwner = ownerColumns.some(col => record[col] === req.user.id);
      if (!isOwner) {
        return res.status(403).json({ error: 'You can only modify records you own' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireWritePermission, checkOwnership };
