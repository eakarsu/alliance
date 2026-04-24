const pool = require('./connection');
async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_roles (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role_in_project VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(project_id, user_id, role_in_project)
    );
  `);
  console.log('project_roles table created');
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
