// Write access control middleware
// Enforces who can create/update/delete records based on role + ownership
const { isFullAccess, isPartnerRole, isRestricted } = require('./dataFilter');

// Resources where restricted_external can NEVER write
const RESTRICTED_BLOCKED_WRITE = [
  'contacts', 'organizations', 'leads', 'opportunities', 'projects',
  'partners', 'risks', 'proposals', 'kpi'
];

// Resources where us_market_bridge can write
const US_MARKET_BRIDGE_WRITE = ['referrals', 'activities'];

function requireWriteAccess(resource) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: 'Authentication required' });

    // Founding orchestrator: full write access
    if (isFullAccess(role)) return next();

    // Restricted external: very limited write
    if (isRestricted(role)) {
      if (RESTRICTED_BLOCKED_WRITE.includes(resource)) {
        return res.status(403).json({ error: 'Your role does not have write access to this resource' });
      }
      return next();
    }

    // us_market_bridge: only referrals + activities
    if (role === 'us_market_bridge') {
      if (!US_MARKET_BRIDGE_WRITE.includes(resource)) {
        return res.status(403).json({ error: 'Your role does not have write access to this resource' });
      }
      return next();
    }

    // PMO, SA, partner roles: can write to their accessible resources
    next();
  };
}

// Ownership check: ensures the user owns or is related to the record they're modifying
function requireOwnershipOrRole(table, ownerColumns) {
  return async (req, res, next) => {
    const role = req.user?.role;
    const userId = req.user?.id;
    const recordId = req.params.id;

    if (!recordId) return next();

    // Full access roles skip ownership check
    if (isFullAccess(role)) return next();

    // PMO and SA: skip ownership for their accessible resources
    if (role === 'pmo_coordinator' || role === 'solution_architect') return next();

    try {
      const pool = require('../db/connection');
      const cols = ownerColumns.map((col, i) => `${col} = $${i + 2}`).join(' OR ');
      const result = await pool.query(
        `SELECT id FROM ${table} WHERE id = $1 AND (${cols})`,
        [recordId, ...Array(ownerColumns.length).fill(userId)]
      );

      if (result.rows.length === 0) {
        // Also check opportunity_roles for opportunities
        if (table === 'opportunities') {
          const roleCheck = await pool.query(
            'SELECT id FROM opportunity_roles WHERE opportunity_id = $1 AND user_id = $2',
            [recordId, userId]
          );
          if (roleCheck.rows.length > 0) return next();
        }
        return res.status(403).json({ error: 'You can only modify records you own or are assigned to' });
      }
      next();
    } catch (err) {
      console.error('Ownership check error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = { requireWriteAccess, requireOwnershipOrRole };
