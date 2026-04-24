const pool = require('./connection');
async function run() {
  await pool.query(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS acceptance_date TIMESTAMP;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS handoff_status VARCHAR(20) DEFAULT 'pending';
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS handoff_notes TEXT;
  `);
  console.log('Added handoff fields to projects');
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
