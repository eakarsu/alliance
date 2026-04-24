const pool = require('./connection');
async function run() {
  await pool.query(`
    ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS blocker_description TEXT;
    ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS blocker_status VARCHAR(20);
  `);
  console.log('Added blocker fields to project_milestones');
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
