const pool = require('../db/connection');

async function createNotification({ userId, type, title, message, entityType, entityId }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, message, entityType, entityId]
    );
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

// Notify multiple users
async function notifyUsers({ userIds, type, title, message, entityType, entityId }) {
  for (const userId of userIds) {
    await createNotification({ userId, type, title, message, entityType, entityId });
  }
}

// Get users by role
async function getUsersByRole(role) {
  const result = await pool.query('SELECT id FROM users WHERE role = $1', [role]);
  return result.rows.map(r => r.id);
}

module.exports = { createNotification, notifyUsers, getUsersByRole };
