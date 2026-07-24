'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../db/connection');

const demoUsers = [
  'fetih@alliance.com',
  'muhittin@alliance.com',
  'erol@alliance.com',
  'gokhan@alliance.com',
  'yasin@alliance.com',
  'ibrahim@alliance.com',
  'michael@alliance.com',
  'archie@alliance.com',
];

async function main() {
  const password = process.env.DEMO_PASSWORD || '';
  if (password.length < 12 || password.length > 72) {
    throw new Error('DEMO_PASSWORD must contain 12-72 characters');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW()
     WHERE email = ANY($2::text[]) RETURNING email`,
    [passwordHash, demoUsers],
  );
  if (result.rowCount !== demoUsers.length) {
    throw new Error(`Expected ${demoUsers.length} demo users, updated ${result.rowCount}`);
  }
  console.log(`Provisioned ${result.rowCount} demo login users.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
