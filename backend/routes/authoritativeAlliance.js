'use strict';

const crypto = require('crypto');
const express = require('express');
const pool = require('../db/connection');
const identity = require('../middleware/allianceIdentity');
const domain = require('../domain/allianceWorkflow');
const providers = require('../domain/providerAdapters');

const router = express.Router();
router.use(identity);
const APPROVAL_STATES = { conflict: 'conflict_review', compliance: 'compliance_review', proposal: 'proposal_pending', agreement: 'agreement_pending' };

function toCase(row) {
  return { id: row.id, tenantId: String(row.tenant_id), ownerId: row.owner_id, title: row.title,
    estimatedValueCents: Number(row.estimated_value_cents), currency: row.currency, partnerIds: row.partner_ids,
    participantIds: row.participant_ids, evidence: row.evidence, state: row.state, version: row.version,
    createdAt: row.created_at, updatedAt: row.updated_at };
}
async function transaction(work) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const value = await work(client); await client.query('COMMIT'); return value; }
  catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
async function membership(client, actor) {
  const result = await client.query('SELECT role FROM alliance_memberships WHERE tenant_id=$1 AND actor_id=$2 AND status=\'active\'', [actor.tenantId, actor.id]);
  if (!result.rowCount || result.rows[0].role !== actor.role) throw Object.assign(new Error('Active tenant membership is required'), { status: 403 });
}
async function audit(client, actor, action, type, id, details = {}) {
  await client.query('INSERT INTO alliance_audit(tenant_id,actor_id,actor_role,action,target_type,target_id,details) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',
    [actor.tenantId, actor.id, actor.role, action, type, String(id), JSON.stringify(details)]);
}
function scoped(actor, record) { try { domain.authorizeScope(actor, record); } catch (error) { error.status = 403; throw error; } }

router.post('/cases', async (req, res, next) => {
  try {
    const actor = req.allianceActor;
    if (!['admin', 'operations', 'partner_manager', 'founding_orchestrator', 'pmo_coordinator', 'enterprise_partner', 'product_partner', 'product_experience_lead'].includes(actor.role)) return res.status(403).json({ error: 'Case creation is not permitted' });
    const input = domain.validateCase({ ...req.body, currency: String(req.body?.currency || '').toUpperCase(), ownerId: actor.id });
    const result = await transaction(async (client) => {
      await membership(client, actor);
      const id = crypto.randomUUID();
      const inputHash = domain.digest(input);
      const inserted = await client.query(
        `INSERT INTO alliance_cases(id,tenant_id,owner_id,title,estimated_value_cents,currency,partner_ids,participant_ids,evidence,input_hash)
         VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10) RETURNING *`,
        [id, actor.tenantId, actor.id, input.title, input.estimatedValueCents, input.currency,
          JSON.stringify(input.partnerIds), JSON.stringify((input.participantIds || []).map(String)), JSON.stringify(input.evidence), inputHash],
      );
      await client.query(
        `INSERT INTO alliance_case_events(tenant_id,case_id,actor_id,actor_role,command,from_state,to_state,idempotency_key,payload)
         VALUES($1,$2,$3,$4,'create','none','intake',$5,$6::jsonb)`,
        [actor.tenantId, id, actor.id, actor.role, `create:${id}`, JSON.stringify({ inputHash })],
      );
      await audit(client, actor, 'case.created', 'case', id, { inputHash });
      return toCase(inserted.rows[0]);
    });
    res.status(201).json(result);
  } catch (error) { next(error); }
});

router.get('/cases/:caseId', async (req, res, next) => {
  try {
    const actor = req.allianceActor;
    await membership(pool, actor);
    const selected = await pool.query('SELECT * FROM alliance_cases WHERE id=$1 AND tenant_id=$2', [req.params.caseId, actor.tenantId]);
    if (!selected.rowCount) return res.status(404).json({ error: 'Case not found' });
    const record = toCase(selected.rows[0]); scoped(actor, record);
    res.json(record);
  } catch (error) { next(error); }
});

router.post('/cases/:caseId/approvals', async (req, res, next) => {
  try {
    const actor = req.allianceActor;
    const kind = String(req.body?.kind || '');
    if (!['conflict', 'compliance', 'proposal', 'agreement'].includes(kind) || String(req.body?.rationale || '').trim().length < 5) return res.status(400).json({ error: 'Valid approval kind and rationale are required' });
    const result = await transaction(async (client) => {
      await membership(client, actor);
      const selected = await client.query('SELECT * FROM alliance_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.caseId, actor.tenantId]);
      if (!selected.rowCount) throw Object.assign(new Error('Case not found'), { status: 404 });
      const record = toCase(selected.rows[0]); scoped(actor, record);
      if (record.state !== APPROVAL_STATES[kind]) throw Object.assign(new Error(`${kind} approval cannot be requested from ${record.state}`), { status: 409 });
      if (actor.id !== record.ownerId && domain.roleOf(actor) !== 'admin') throw Object.assign(new Error('Only the case owner can request approval'), { status: 403 });
      const id = crypto.randomUUID();
      const inserted = await client.query(
        `INSERT INTO alliance_approvals(id,tenant_id,case_id,kind,requested_by,rationale) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [id, actor.tenantId, record.id, kind, actor.id, String(req.body.rationale).trim()],
      );
      await audit(client, actor, 'approval.requested', 'approval', id, { caseId: record.id, kind });
      return inserted.rows[0];
    });
    res.status(201).json(result);
  } catch (error) { next(error); }
});

router.post('/approvals/:approvalId/decision', async (req, res, next) => {
  try {
    const actor = req.allianceActor;
    if (!['approved', 'rejected'].includes(req.body?.decision)) return res.status(400).json({ error: 'Decision must be approved or rejected' });
    if (!['reviewer', 'operations', 'admin', 'solution_architect', 'pmo_coordinator', 'founding_orchestrator'].includes(actor.role)) return res.status(403).json({ error: 'Reviewer role is required' });
    const result = await transaction(async (client) => {
      await membership(client, actor);
      const selected = await client.query('SELECT * FROM alliance_approvals WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.approvalId, actor.tenantId]);
      if (!selected.rowCount) throw Object.assign(new Error('Approval not found'), { status: 404 });
      if (selected.rows[0].decision !== 'pending') return { ...selected.rows[0], duplicate: true };
      if (String(selected.rows[0].requested_by) === actor.id) throw Object.assign(new Error('Self-approval is forbidden'), { status: 409 });
      const updated = await client.query(
        `UPDATE alliance_approvals SET decision=$1,decided_by=$2,decided_at=NOW() WHERE id=$3 RETURNING *`,
        [req.body.decision, actor.id, req.params.approvalId],
      );
      await audit(client, actor, 'approval.decided', 'approval', req.params.approvalId, { decision: req.body.decision });
      return updated.rows[0];
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/cases/:caseId/commands', async (req, res, next) => {
  try {
    const actor = req.allianceActor;
    const key = String(req.get('idempotency-key') || '');
    if (key.length < 8 || key.length > 160) return res.status(400).json({ error: 'A stable Idempotency-Key is required' });
    const result = await transaction(async (client) => {
      await membership(client, actor);
      const selected = await client.query('SELECT * FROM alliance_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.caseId, actor.tenantId]);
      if (!selected.rowCount) throw Object.assign(new Error('Case not found'), { status: 404 });
      const current = toCase(selected.rows[0]); scoped(actor, current);
      const duplicate = await client.query('SELECT to_state,payload FROM alliance_case_events WHERE case_id=$1 AND idempotency_key=$2', [current.id, key]);
      const requestHash = domain.digest({ command: req.body?.command, payload: req.body?.payload || {}, approvalId: req.body?.approvalId || null });
      if (duplicate.rowCount) {
        if (duplicate.rows[0].payload.requestHash !== requestHash) throw Object.assign(new Error('Idempotency conflict'), { status: 409 });
        return { id: current.id, state: duplicate.rows[0].to_state, duplicate: true };
      }
      let approval = null;
      if (req.body?.approvalId) {
        const approved = await client.query('SELECT kind,decision,requested_by AS "requestedBy",decided_by AS "decidedBy" FROM alliance_approvals WHERE id=$1 AND tenant_id=$2 AND case_id=$3 AND consumed_at IS NULL', [req.body.approvalId, actor.tenantId, current.id]);
        approval = approved.rows[0] || null;
      }
      let updated;
      try { updated = domain.applyCommand(current, actor, req.body?.command, req.body?.payload || {}, approval); }
      catch (error) { error.status = /role|scope|owner/.test(error.message) ? 403 : 409; throw error; }
      const saved = await client.query(
        'UPDATE alliance_cases SET state=$1,version=$2,updated_at=NOW() WHERE id=$3 AND version=$4 RETURNING *',
        [updated.state, updated.version, current.id, current.version],
      );
      if (!saved.rowCount) throw Object.assign(new Error('Version conflict'), { status: 409 });
      await client.query(
        `INSERT INTO alliance_case_events(tenant_id,case_id,actor_id,actor_role,command,from_state,to_state,idempotency_key,payload,approval_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) RETURNING sequence`,
        [actor.tenantId, current.id, actor.id, actor.role, req.body.command, current.state, updated.state, key, JSON.stringify({ ...(req.body.payload || {}), requestHash }), req.body.approvalId || null],
      );
      if (req.body?.approvalId) await client.query('UPDATE alliance_approvals SET consumed_at=NOW(),consumed_case_version=$1 WHERE id=$2 AND consumed_at IS NULL', [updated.version, req.body.approvalId]);
      await audit(client, actor, 'case.transitioned', 'case', current.id, { command: req.body.command, from: current.state, to: updated.state, requestHash });
      return { ...toCase(saved.rows[0]), duplicate: false };
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.get('/cases/:caseId/audit', async (req, res, next) => {
  try {
    const actor = req.allianceActor;
    await membership(pool, actor);
    const selected = await pool.query('SELECT * FROM alliance_cases WHERE id=$1 AND tenant_id=$2', [req.params.caseId, actor.tenantId]);
    if (!selected.rowCount) return res.status(404).json({ error: 'Case not found' });
    scoped(actor, toCase(selected.rows[0]));
    const events = await pool.query('SELECT sequence,actor_id,actor_role,command,from_state,to_state,idempotency_key,payload,approval_id,occurred_at FROM alliance_case_events WHERE case_id=$1 AND tenant_id=$2 ORDER BY sequence', [req.params.caseId, actor.tenantId]);
    res.json({ caseId: req.params.caseId, events: events.rows });
  } catch (error) { next(error); }
});

router.post('/cases/:caseId/deliveries', async (req, res, next) => {
  try {
    const actor = req.allianceActor;
    if (!['operations', 'admin', 'pmo_coordinator', 'founding_orchestrator'].includes(actor.role)) return res.status(403).json({ error: 'Operations role is required' });
    const key = String(req.get('idempotency-key') || '');
    if (key.length < 8 || !providers.ALLOWED[req.body?.connector]?.includes(req.body?.operation)) return res.status(400).json({ error: 'Valid connector, operation, and idempotency key are required' });
    const result = await transaction(async (client) => {
      await membership(client, actor);
      const selected = await client.query('SELECT * FROM alliance_cases WHERE id=$1 AND tenant_id=$2', [req.params.caseId, actor.tenantId]);
      if (!selected.rowCount) throw Object.assign(new Error('Case not found'), { status: 404 });
      const record = toCase(selected.rows[0]); scoped(actor, record);
      if (req.body.connector === 'clm' && !['agreement_pending', 'active', 'completed'].includes(record.state)) throw Object.assign(new Error('CLM delivery requires agreement workflow state'), { status: 409 });
      if (req.body.connector === 'erp' && !['active', 'completed'].includes(record.state)) throw Object.assign(new Error('ERP delivery requires active case'), { status: 409 });
      const payload = { caseId: record.id, caseVersion: record.version, state: record.state, data: req.body.payload || {} };
      const payloadHash = domain.digest(payload); payload.payloadHash = payloadHash;
      const inserted = await client.query(
        `INSERT INTO alliance_delivery_jobs(id,tenant_id,case_id,connector,operation,idempotency_key,payload,payload_hash)
         VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8) ON CONFLICT(tenant_id,connector,idempotency_key) DO NOTHING RETURNING *`,
        [crypto.randomUUID(), actor.tenantId, record.id, req.body.connector, req.body.operation, key, JSON.stringify(payload), payloadHash],
      );
      if (!inserted.rowCount) {
        const existing = await client.query('SELECT * FROM alliance_delivery_jobs WHERE tenant_id=$1 AND connector=$2 AND idempotency_key=$3', [actor.tenantId, req.body.connector, key]);
        if (existing.rows[0].payload_hash !== payloadHash) throw Object.assign(new Error('Idempotency conflict'), { status: 409 });
        return { ...existing.rows[0], duplicate: true };
      }
      await audit(client, actor, 'delivery.queued', 'delivery', inserted.rows[0].id, { connector: req.body.connector, operation: req.body.operation, payloadHash });
      return inserted.rows[0];
    });
    res.status(result.duplicate ? 200 : 202).json(result);
  } catch (error) { next(error); }
});

router.post('/deliveries/:jobId/dispatch', async (req, res, next) => {
  const actor = req.allianceActor;
  if (!['operations', 'admin', 'pmo_coordinator', 'founding_orchestrator'].includes(actor.role)) return res.status(403).json({ error: 'Operations role is required' });
  try {
    await membership(pool, actor);
    const jobResult = await pool.query('SELECT * FROM alliance_delivery_jobs WHERE id=$1 AND tenant_id=$2', [req.params.jobId, actor.tenantId]);
    if (!jobResult.rowCount) return res.status(404).json({ error: 'Delivery not found' });
    const job = jobResult.rows[0];
    if (job.status === 'confirmed') return res.json({ ...job, duplicate: true });
    const receipt = await providers.dispatch({ connector: job.connector, operation: job.operation, payload: job.payload, idempotencyKey: job.idempotency_key });
    const result = await transaction(async (client) => {
      const updated = await client.query("UPDATE alliance_delivery_jobs SET status='confirmed',attempts=attempts+1,provider_reference=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *", [String(receipt.id), job.id, actor.tenantId]);
      await client.query('INSERT INTO alliance_provider_receipts(tenant_id,job_id,provider_reference,payload_hash,receipt) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING', [actor.tenantId, job.id, String(receipt.id), job.payload_hash, JSON.stringify(receipt)]);
      await audit(client, actor, 'delivery.confirmed', 'delivery', job.id, { providerReference: String(receipt.id), payloadHash: job.payload_hash });
      return updated.rows[0];
    });
    res.json(result);
  } catch (error) {
    const current = await pool.query('SELECT attempts FROM alliance_delivery_jobs WHERE id=$1 AND tenant_id=$2', [req.params.jobId, actor.tenantId]);
    if (current.rowCount) await transaction(async (client) => {
      const decision = domain.nextDelivery(Number(current.rows[0].attempts), error.retryable !== false);
      await client.query("UPDATE alliance_delivery_jobs SET status=$1,attempts=$2,next_attempt_at=NOW()+($3*INTERVAL '1 second'),last_error=$4,updated_at=NOW() WHERE id=$5 AND tenant_id=$6", [decision.status, decision.attempts, decision.delaySeconds, String(error.message).slice(0, 300), req.params.jobId, actor.tenantId]);
      await audit(client, actor, `delivery.${decision.status}`, 'delivery', req.params.jobId, { attempts: decision.attempts, retryable: error.retryable !== false, error: String(error.message).slice(0, 300) });
    });
    error.status = error.retryable === false ? 422 : 503; next(error);
  }
});

router.get('/monitoring', async (req, res, next) => {
  try {
    const actor = req.allianceActor;
    await membership(pool, actor);
    const result = await pool.query(`SELECT
      (SELECT COUNT(*)::int FROM alliance_cases WHERE tenant_id=$1) AS cases,
      (SELECT COUNT(*)::int FROM alliance_approvals WHERE tenant_id=$1 AND decision='pending') AS pending_approvals,
      (SELECT COUNT(*)::int FROM alliance_delivery_jobs WHERE tenant_id=$1 AND status IN('queued','retry')) AS queued_deliveries,
      (SELECT COUNT(*)::int FROM alliance_delivery_jobs WHERE tenant_id=$1 AND status='dead_letter') AS dead_letters`, [actor.tenantId]);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

module.exports = router;
