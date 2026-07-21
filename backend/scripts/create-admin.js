'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');

function tenantUuid(value) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')) return value;
  const hex = crypto.createHash('sha256').update(value || '').digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

async function main() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const tenant = tenantUuid(process.env.ALLIANCE_TENANT_ID || process.env.TENANT_ID || process.env.GOVERNANCE_TENANT_ID || '');
  const actorId = process.env.ALLIANCE_ADMIN_ACTOR_ID || 'runtime-admin';
  const name = process.env.ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME || 'Runtime Admin';
  if (!email.includes('@')) throw new Error('ADMIN_EMAIL is required');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO alliance_memberships(tenant_id,actor_id,role,status,email,password_hash,display_name)
     VALUES($1,$2,'founding_orchestrator','active',$3,$4,$5)
     ON CONFLICT(tenant_id,actor_id) DO UPDATE SET role='founding_orchestrator',status='active',email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,display_name=EXCLUDED.display_name`,
    [tenant, actorId, email, passwordHash, name],
  );
  process.stdout.write(`provisioned ${email}\n`);
}

main().then(() => pool.end()).catch(async error => {
  console.error(error.message);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
