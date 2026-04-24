const pool = require('./connection');
async function run() {
  await pool.query(`
    ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS integration_required BOOLEAN DEFAULT false;
    ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS delivery_effort_estimate VARCHAR(50);
  `);
  console.log('Added integration_required and delivery_effort_estimate columns');
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
