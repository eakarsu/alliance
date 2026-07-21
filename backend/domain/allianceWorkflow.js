'use strict';

const crypto = require('crypto');

const canonical = (value) => Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const digest = (value) => crypto.createHash('sha256').update(canonical(value)).digest('hex');

const ROLE_ALIASES = {
  founding_orchestrator: 'admin', pmo_coordinator: 'operations', solution_architect: 'reviewer',
  enterprise_partner: 'partner_manager', product_experience_lead: 'partner_manager', product_partner: 'partner_manager',
  us_market_bridge: 'referral_partner', restricted_external: 'viewer',
};

const COMMANDS = {
  submit: { from: ['intake', 'exception'], to: 'conflict_review', roles: ['partner_manager', 'operations', 'admin'] },
  clear_conflict: { from: ['conflict_review'], to: 'compliance_review', roles: ['reviewer', 'operations', 'admin'], approval: 'conflict' },
  approve_compliance: { from: ['compliance_review'], to: 'proposal_pending', roles: ['reviewer', 'admin'], approval: 'compliance' },
  approve_proposal: { from: ['proposal_pending'], to: 'agreement_pending', roles: ['operations', 'admin'], approval: 'proposal' },
  confirm_agreement: { from: ['agreement_pending'], to: 'active', roles: ['operations', 'admin'], approval: 'agreement' },
  handoff: { from: ['active'], to: 'completed', roles: ['operations', 'admin'] },
  reject: { from: ['conflict_review', 'compliance_review', 'proposal_pending', 'agreement_pending'], to: 'rejected', roles: ['reviewer', 'operations', 'admin'] },
  recover: { from: ['exception', 'rejected'], to: null, roles: ['admin'] },
};

function roleOf(actor) { return ROLE_ALIASES[actor.role] || actor.role; }

function validateCase(input) {
  if (!input.title || String(input.title).trim().length < 3 || String(input.title).length > 200) throw new Error('title must be 3-200 characters');
  if (!Number.isSafeInteger(input.estimatedValueCents) || input.estimatedValueCents < 0) throw new Error('estimatedValueCents must be a non-negative integer');
  if (!/^[A-Z]{3}$/.test(String(input.currency || ''))) throw new Error('currency must be an ISO-style three-letter code');
  if (!Array.isArray(input.partnerIds) || !input.partnerIds.length || input.partnerIds.some((id) => !String(id).trim())) throw new Error('at least one partner is required');
  if (!Array.isArray(input.evidence) || !input.evidence.length || input.evidence.some((item) => !item.uri || !item.sha256 || !/^[a-f0-9]{64}$/.test(item.sha256))) throw new Error('checksum-bound evidence is required');
  return { ...input, title: String(input.title).trim(), partnerIds: [...new Set(input.partnerIds.map(String))].sort() };
}

function applyCommand(current, actor, command, payload = {}, approval = null) {
  const rule = COMMANDS[command];
  if (!rule) throw new Error('unknown command');
  const role = roleOf(actor);
  if (!rule.roles.includes(role)) throw new Error('role is not permitted for command');
  if (!rule.from.includes(current.state)) throw new Error(`invalid transition from ${current.state}`);
  if (rule.approval) {
    if (!approval || approval.kind !== rule.approval || approval.decision !== 'approved') throw new Error(`${rule.approval} approval is required`);
    if (String(approval.requestedBy) === String(approval.decidedBy)) throw new Error('approval must be independent');
    if (String(approval.requestedBy) !== String(current.ownerId) && role !== 'admin') throw new Error('approval does not bind the case owner');
  }
  let state = rule.to;
  if (command === 'recover') {
    if (!['intake', 'conflict_review', 'compliance_review', 'proposal_pending', 'agreement_pending'].includes(payload.targetState)) throw new Error('invalid recovery target');
    state = payload.targetState;
  }
  if (command === 'reject' && (!payload.reason || String(payload.reason).trim().length < 5)) throw new Error('rejection reason is required');
  return { ...current, state, version: current.version + 1, updatedAt: new Date().toISOString() };
}

function authorizeScope(actor, record) {
  if (actor.tenantId !== record.tenantId) throw new Error('cross-tenant access denied');
  const role = roleOf(actor);
  if (['admin', 'operations', 'reviewer'].includes(role) || String(actor.id) === String(record.ownerId) || record.participantIds?.map(String).includes(String(actor.id))) return true;
  throw new Error('case is outside actor scope');
}

function nextDelivery(attempts, retryable, maxAttempts = 5) {
  const next = attempts + 1;
  if (!retryable || next >= maxAttempts) return { status: 'dead_letter', attempts: next, delaySeconds: 0 };
  return { status: 'retry', attempts: next, delaySeconds: Math.min(900, 2 ** next) };
}

module.exports = { canonical, digest, roleOf, validateCase, applyCommand, authorizeScope, nextDelivery, COMMANDS };
