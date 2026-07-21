'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('persisted alliance journey enforces tenant, approval, idempotency, provider failure and audit', { skip: process.env.RUN_DB_TESTS !== '1' }, async (t) => {
  const jwt = require('jsonwebtoken'); const pool = require('../db/connection'); const app = require('../server');
  const tenant = '11111111-1111-4111-8111-111111111111'; const otherTenant = '22222222-2222-4222-8222-222222222222';
  await pool.query("INSERT INTO alliance_memberships(tenant_id,actor_id,role) VALUES($1,'owner','enterprise_partner'),($1,'admin','founding_orchestrator'),($2,'other','enterprise_partner')", [tenant, otherTenant]);
  const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve)); t.after(async () => { await new Promise((resolve) => server.close(resolve)); await pool.end(); });
  const base = `http://127.0.0.1:${server.address().port}/api/v1/alliance`;
  const token = (sub, tenantId, role) => jwt.sign({ sub, tenantId, role }, process.env.ALLIANCE_JWT_SECRET, { algorithm: 'HS256', issuer: 'alliance-identity', audience: 'alliance-api', expiresIn: '5m' });
  const call = async (who, route, options = {}) => { const response = await fetch(`${base}${route}`, { method: options.method || 'GET', headers: { authorization: `Bearer ${who}`, 'content-type': 'application/json', ...(options.headers || {}) }, body: options.body === undefined ? undefined : JSON.stringify(options.body) }); return { status: response.status, body: await response.json() }; };
  const owner = token('owner', tenant, 'enterprise_partner'); const admin = token('admin', tenant, 'founding_orchestrator');
  const created = await call(owner, '/cases', { method: 'POST', body: { title: 'Regional delivery alliance', estimatedValueCents: 125000, currency: 'usd', partnerIds: ['partner-a'], evidence: [{ uri: 'vault://evidence/1', sha256: 'a'.repeat(64) }] } }); assert.equal(created.status, 201, JSON.stringify(created.body)); const caseId = created.body.id;
  assert.equal((await call(owner, `/cases/${caseId}/approvals`, { method: 'POST', body: { kind: 'conflict', rationale: 'Premature request' } })).status, 409);
  const submit = await call(owner, `/cases/${caseId}/commands`, { method: 'POST', headers: { 'Idempotency-Key': 'case-submit-1' }, body: { command: 'submit', payload: {} } }); assert.equal(submit.body.state, 'conflict_review');
  assert.equal((await call(owner, `/cases/${caseId}/commands`, { method: 'POST', headers: { 'Idempotency-Key': 'case-submit-1' }, body: { command: 'submit', payload: {} } })).body.duplicate, true);
  assert.equal((await call(owner, `/cases/${caseId}/commands`, { method: 'POST', headers: { 'Idempotency-Key': 'case-submit-1' }, body: { command: 'submit', payload: { changed: true } } })).status, 409);
  for (const [kind, command, expected] of [['conflict', 'clear_conflict', 'compliance_review'], ['compliance', 'approve_compliance', 'proposal_pending'], ['proposal', 'approve_proposal', 'agreement_pending'], ['agreement', 'confirm_agreement', 'active']]) {
    const request = await call(owner, `/cases/${caseId}/approvals`, { method: 'POST', body: { kind, rationale: `Independent ${kind} review` } }); assert.equal(request.status, 201, JSON.stringify(request.body));
    assert.equal((await call(admin, `/approvals/${request.body.id}/decision`, { method: 'POST', body: { decision: 'approved' } })).status, 200);
    const changed = await call(admin, `/cases/${caseId}/commands`, { method: 'POST', headers: { 'Idempotency-Key': `command-${kind}-1` }, body: { command, approvalId: request.body.id, payload: {} } }); assert.equal(changed.body.state, expected, JSON.stringify(changed.body));
  }
  const other = token('other', otherTenant, 'enterprise_partner'); assert.equal((await call(other, `/cases/${caseId}`)).status, 404);
  const delivery = await call(admin, `/cases/${caseId}/deliveries`, { method: 'POST', headers: { 'Idempotency-Key': 'clm-delivery-1' }, body: { connector: 'clm', operation: 'agreement.create', payload: { agreement: 'A-1' } } }); assert.equal(delivery.status, 202, JSON.stringify(delivery.body));
  const failed = await call(admin, `/deliveries/${delivery.body.id}/dispatch`, { method: 'POST', body: {} }); assert.equal(failed.status, 422);
  const monitoring = await call(admin, '/monitoring'); assert.equal(monitoring.body.dead_letters, 1);
  const audit = await call(owner, `/cases/${caseId}/audit`); assert.equal(audit.status, 200); assert.equal(audit.body.events.length, 6);
  assert.equal(Number((await pool.query("SELECT COUNT(*) FROM alliance_audit WHERE target_id=$1 AND action='delivery.dead_letter'", [delivery.body.id])).rows[0].count), 1);
  assert.equal(Number((await pool.query('SELECT COUNT(*) FROM alliance_approvals WHERE case_id=$1 AND consumed_at IS NOT NULL', [caseId])).rows[0].count), 4);
  await assert.rejects(pool.query("UPDATE alliance_case_events SET actor_id='tampered' WHERE case_id=$1", [caseId]), /append-only/);
  await pool.query("UPDATE alliance_memberships SET status='suspended' WHERE tenant_id=$1 AND actor_id='owner'", [tenant]);
  assert.equal((await call(owner, `/cases/${caseId}`)).status, 403);
});
