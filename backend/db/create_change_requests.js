const pool = require('./connection');
async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS change_requests (
      id SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id),
      requested_by_user_id INTEGER REFERENCES users(id),
      change_type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      impact_scope TEXT,
      impact_budget DECIMAL(12,2),
      impact_timeline VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      reviewed_by_user_id INTEGER REFERENCES users(id),
      review_notes TEXT,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('change_requests table created');
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
