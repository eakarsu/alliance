const pool = require('./connection');
async function run() {
  await pool.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS visibility_level VARCHAR(20) DEFAULT 'internal';`);
  console.log('Added visibility_level to contacts');
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
