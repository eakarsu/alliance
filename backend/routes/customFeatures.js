// Custom feature endpoints (batch_09 audit suggestions)
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

async function callLLM(system, user, { maxTokens = 1800, temperature = 0.4 } = {}) {
  if (!OPENROUTER_API_KEY) {
    const e = new Error('OPENROUTER_API_KEY missing'); e.statusCode = 503; throw e;
  }
  const r = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: maxTokens, temperature,
    }),
  });
  const data = await r.json();
  return { content: data?.choices?.[0]?.message?.content || '', model: data?.model };
}

function parseJSON(t) {
  if (!t) return null;
  const c = String(t).replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const m = c.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function err(res, e, label) {
  if (e.statusCode === 503) return res.status(503).json({ error: e.message });
  console.error(`${label} error:`, e.message);
  res.status(500).json({ error: e.message });
}

// 1. Predictive deal closure with probability modeling
router.post('/deal-closure', auth, async (req, res) => {
  try {
    const { opportunity_id, stage_history, recent_signals } = req.body || {};
    if (!opportunity_id) return res.status(400).json({ error: 'opportunity_id required' });
    const ai = await callLLM(
      'You forecast Alliance opportunity close probability. JSON only.',
      `OPP: ${opportunity_id}\nSTAGES: ${JSON.stringify(stage_history || [])}\nSIGNALS: ${JSON.stringify(recent_signals || {})}\nReturn JSON {"close_probability":0,"expected_close_date":"","top_risk_factors":[""],"next_best_actions":[""]}`
    );
    res.json({ type: 'deal-closure', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'deal-closure'); }
});

// 2. Partner risk assessment
router.post('/partner-risk', auth, async (req, res) => {
  try {
    const { partner, financial_signals, performance_signals } = req.body || {};
    if (!partner) return res.status(400).json({ error: 'partner required' });
    const ai = await callLLM(
      'You score partner risk from finance + performance signals. JSON only.',
      `PARTNER: ${JSON.stringify(partner)}\nFIN: ${JSON.stringify(financial_signals || {})}\nPERF: ${JSON.stringify(performance_signals || {})}\nReturn JSON {"risk_tier":"low|med|high","financial_health_score":0,"delivery_score":0,"red_flags":[""],"monitoring_plan":""}`
    );
    res.json({ type: 'partner-risk', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'partner-risk'); }
});

// 3. Conflict detection in partner networks
router.post('/partner-conflicts', auth, async (req, res) => {
  try {
    const { network_snapshot } = req.body || {};
    if (!network_snapshot) return res.status(400).json({ error: 'network_snapshot required' });
    const ai = await callLLM(
      'You detect conflicts (channel overlap, exclusivity) in a partner network. JSON only.',
      `NETWORK: ${JSON.stringify(network_snapshot).slice(0,4000)}\nReturn JSON {"conflicts":[{"partners":[""],"type":"channel-overlap|exclusivity|geo","severity":"low|med|high","resolution":""}],"healthy_overlaps":[""]}`
    );
    res.json({ type: 'partner-conflicts', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'partner-conflicts'); }
});

// 4. Automated payout calculations and reconciliation
router.post('/payout-calc', auth, async (req, res) => {
  try {
    const { agreement, deal_summary } = req.body || {};
    if (!agreement) return res.status(400).json({ error: 'agreement required' });
    const ai = await callLLM(
      'You compute revenue-share payouts and flag reconciliation issues. JSON only.',
      `AGREEMENT: ${JSON.stringify(agreement)}\nDEAL: ${JSON.stringify(deal_summary || {})}\nReturn JSON {"payouts":[{"party":"","amount_usd":0,"basis":""}],"total_paid_out_usd":0,"reconciliation_issues":[""],"ready_to_disburse":false}`
    );
    res.json({ type: 'payout-calc', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'payout-calc'); }
});

// 5. Governance compliance automation
router.post('/governance-check', auth, async (req, res) => {
  try {
    const { workflow_state, required_approvals } = req.body || {};
    const ai = await callLLM(
      'You audit governance compliance for a deal/approval state. JSON only.',
      `STATE: ${JSON.stringify(workflow_state || {})}\nAPPROVALS: ${JSON.stringify(required_approvals || [])}\nReturn JSON {"compliance_score":0,"missing_approvals":[""],"violations":[{"rule":"","severity":""}],"unblock_steps":[""]}`
    );
    res.json({ type: 'governance-check', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'governance-check'); }
});

// 6. Financial-system integration for revenue tracking
// TODO: configure credentials for FINANCE_SYS_API_KEY (Netsuite/SAP).
router.post('/finance-sync', auth, async (req, res) => {
  try {
    const { entity, payload, target_system = 'netsuite' } = req.body || {};
    if (!entity) return res.status(400).json({ error: 'entity required' });
    const ai = await callLLM(
      `You map an Alliance entity to a finance system payload. Target ${target_system}. API set: ${Boolean(process.env.FINANCE_SYS_API_KEY)}. JSON only.`,
      `ENTITY: ${entity}\nPAYLOAD: ${JSON.stringify(payload || {})}\nReturn JSON {"mapped_payload":{},"missing_fields":[""],"target_object":"","sync_status":"ready|blocked"}`
    );
    res.json({ type: 'finance-sync', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'finance-sync'); }
});

// 7. Strategic partner recommendation engine
router.post('/partner-recommend', auth, async (req, res) => {
  try {
    const { capability_gaps, region, target_industry } = req.body || {};
    if (!capability_gaps) return res.status(400).json({ error: 'capability_gaps required' });
    const ai = await callLLM(
      'You recommend strategic partners to fill capability gaps. JSON only.',
      `GAPS: ${JSON.stringify(capability_gaps)}\nREGION: ${region || 'global'}\nINDUSTRY: ${target_industry || 'tech'}\nReturn JSON {"candidates":[{"profile":"","why":"","outreach_hook":""}],"top_pick":"","red_flags_to_watch":[""]}`
    );
    res.json({ type: 'partner-recommend', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'partner-recommend'); }
});

// 8. Legal/CLM system integration
// TODO: configure credentials for CLM_API_KEY (DocuSign CLM/Ironclad).
router.post('/clm-sync', auth, async (req, res) => {
  try {
    const { agreement_type, deal_terms } = req.body || {};
    if (!agreement_type) return res.status(400).json({ error: 'agreement_type required' });
    const ai = await callLLM(
      `You generate CLM intake for a contract. CLM API set: ${Boolean(process.env.CLM_API_KEY)}. JSON only.`,
      `TYPE: ${agreement_type}\nTERMS: ${JSON.stringify(deal_terms || {})}\nReturn JSON {"clm_payload":{"workflow":"","metadata":{}},"recommended_template":"","review_required_by":[""]}`
    );
    res.json({ type: 'clm-sync', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'clm-sync'); }
});

module.exports = router;
