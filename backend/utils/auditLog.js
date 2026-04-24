const pool = require('../db/connection');

async function logAudit({ actorUserId, actionType, entityType, entityId, changedFields, oldValue, newValue, ipAddress }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action_type, entity_type, entity_id, changed_fields_json, old_value_json, new_value_json, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [actorUserId, actionType, entityType, entityId,
       changedFields ? JSON.stringify(changedFields) : null,
       oldValue ? JSON.stringify(oldValue) : null,
       newValue ? JSON.stringify(newValue) : null,
       ipAddress || null]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = { logAudit };
