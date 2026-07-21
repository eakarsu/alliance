'use strict';
const fs = require('fs');
const path = require('path');
const pool = require('../db/connection');

async function main() {
  for (const file of ['migration_003_governed_alliance.sql', 'migration_004_local_identity.sql']) {
    await pool.query(fs.readFileSync(path.join(__dirname, '..', 'db', file), 'utf8'));
    process.stdout.write(`applied ${file}\n`);
  }
}

main().then(() => pool.end()).catch(async error => {
  console.error(error.message);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
