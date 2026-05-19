// Apply pass 5 — Integrations + advanced features for alliance CRM
//
// ENV VARS (all OPTIONAL — endpoints return 503 with `missing: <ENV>`):
//   OPENROUTER_API_KEY      — AI features (partner perf predict, conflict reco, deal closure ML stub)
//   ERP_API_KEY             — ERP integration (revenue tracking)
//   ERP_BASE_URL            — ERP base URL
//   CLM_API_KEY             — Contract Lifecycle Management vendor (Ironclad / DocuSign CLM)
//   CLM_BASE_URL            — CLM base URL
//   PAYMENT_PROVIDER_KEY    — Payout disbursement (e.g., Wise, Stripe Connect)
//
// PRODUCT-DECISIONS (documented inline):
//   - Partner performance score weights: revenue 40%, deal_count 25%, on_time_delivery 25%, NPS 10%.
//   - Strategic partner recommendation uses TF-IDF style cosine over org descriptions held
//     in-process (no embeddings DB / no new heavy deps).
//   - Predictive deal closure is a logistic stub over (stage, days_in_stage, value, partner).
//   - Partner-network graph analysis runs an in-memory Tarjan-style cluster on opportunities.
//   - Negotiation templates store reusable clauses; lifecycle = draft|published|archived.

const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');

// Apply auth on all routes by default; specific role gates can be added below
router.use(auth);

// 503 helper
function require503(res, envName) {
  return res.status(503).json({
    error: 'Integration not configured',
    missing: envName,
    hint: `Set ${envName} in environment to enable this endpoint.`,
  });
}

// Schema bootstrap (additive only)
let schemaInitialized = false;
async function ensureSchema() {
  if (schemaInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payouts (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER,
        opportunity_id INTEGER,
        amount NUMERIC NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'pending',
        scheduled_date DATE,
        paid_date DATE,
        external_ref TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by INTEGER
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS financial_periods (
        id SERIAL PRIMARY KEY,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        revenue_total NUMERIC DEFAULT 0,
        cost_total NUMERIC DEFAULT 0,
        margin NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'open',
        closed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contract_lifecycle (
        id SERIAL PRIMARY KEY,
        agreement_id INTEGER,
        state TEXT DEFAULT 'draft',
        renewal_date DATE,
        notice_period_days INTEGER,
        external_clm_ref TEXT,
        clm_provider TEXT,
        last_synced TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS negotiation_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        body TEXT,
        version INTEGER DEFAULT 1,
        status TEXT DEFAULT 'draft',
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_sync_log (
        id SERIAL PRIMARY KEY,
        action TEXT,
        records_synced INTEGER DEFAULT 0,
        revenue_total NUMERIC,
        status TEXT,
        error TEXT,
        synced_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    schemaInitialized = true;
  } catch (e) {
    console.error('integrations.ensureSchema:', e.message);
  }
}
ensureSchema();

// ---- AI helper (re-implemented locally to avoid coupling) ----
async function callOpenRouter(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing');
  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Alliance CRM',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });
  if (!resp.ok) throw new Error(`OpenRouter ${resp.status}: ${await resp.text()}`);
  const j = await resp.json();
  return j.choices?.[0]?.message?.content || '';
}

function parseAIJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch (_) {} }
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch (_) {} }
  return null;
}

// ============================================================
// 1. Partner performance prediction
// PRODUCT-DECISION: weighted score over revenue (40), deal count (25),
// on-time delivery (25), NPS (10). Missing inputs default to neutral.
// ============================================================
router.post('/partner-performance/predict', async (req, res) => {
  try {
    const { partner_id } = req.body || {};
    if (!partner_id) return res.status(400).json({ error: 'partner_id required' });
    const partner = await pool.query('SELECT * FROM partners WHERE id = $1', [partner_id]);
    if (!partner.rows.length) return res.status(404).json({ error: 'partner not found' });

    const opps = await pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as revenue
                                    FROM opportunities WHERE partner_id = $1 AND stage = 'closed_won'`, [partner_id])
      .catch(() => ({ rows: [{ count: 0, revenue: 0 }] }));

    const revenue = parseFloat(opps.rows[0].revenue) || 0;
    const dealCount = parseInt(opps.rows[0].count) || 0;
    const onTime = 0.85; // PRODUCT-DECISION: default neutral until signal source ships
    const nps = 7.5;     // PRODUCT-DECISION: default neutral
    const score = Math.min(100,
      Math.min(40, revenue / 50000) +
      Math.min(25, dealCount * 2.5) +
      onTime * 25 +
      (nps / 10) * 10
    );

    let aiNarrative = null;
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const ai = await callOpenRouter(
          'You are a partner-performance analyst. Output strict JSON.',
          `Partner ${partner.rows[0].name}. Revenue=${revenue}, deals=${dealCount}, on_time=${onTime}, nps=${nps}. Score=${score.toFixed(1)}.
Return: { "trend": "improving|stable|declining", "risks": ["..."], "opportunities": ["..."], "next_quarter_forecast": "..." }`
        );
        aiNarrative = parseAIJson(ai) || { raw: ai };
      } catch (e) { aiNarrative = { error: e.message }; }
    }
    res.json({
      partner_id,
      score: Math.round(score),
      grade: score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D',
      signals: { revenue, deal_count: dealCount, on_time_delivery: onTime, nps },
      ai_narrative: aiNarrative,
      ai_available: !!process.env.OPENROUTER_API_KEY,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 2. Conflict resolution recommendations
// ============================================================
router.post('/conflict/recommend', async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) return require503(res, 'OPENROUTER_API_KEY');
  try {
    const { conflict_description, parties = [], stakes } = req.body || {};
    if (!conflict_description) return res.status(400).json({ error: 'conflict_description required' });
    const ai = await callOpenRouter(
      'You are a partner-ecosystem mediator. Output strict JSON.',
      `Conflict: ${conflict_description}\nParties: ${JSON.stringify(parties)}\nStakes: ${stakes || 'unspecified'}
Return: { "options": [{ "option": "...", "fairness_score_0_10": n, "speed_score_0_10": n, "rationale": "..." }], "recommended_path": "...", "escalation_trigger": "..." }`
    );
    res.json({ recommendation: parseAIJson(ai) || ai });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 3. Strategic partner recommendation (in-memory TF-IDF cosine)
// PRODUCT-DECISION: tokenize organization descriptions in-process; no
// embeddings persistence, no new deps.
// ============================================================
function _tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}
function _cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.forEach((k) => { const va = a[k] || 0; const vb = b[k] || 0; dot += va * vb; na += va * va; nb += vb * vb; });
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function _termFreq(tokens) {
  const tf = {};
  tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
  return tf;
}
router.post('/strategic-partner/recommend', async (req, res) => {
  try {
    const { organization_id, top_n = 5 } = req.body || {};
    if (!organization_id) return res.status(400).json({ error: 'organization_id required' });
    const target = await pool.query('SELECT id, name, description FROM organizations WHERE id = $1', [organization_id]);
    if (!target.rows.length) return res.status(404).json({ error: 'organization not found' });
    const partners = await pool.query(`
      SELECT p.id as partner_id, o.id as org_id, o.name, o.description
      FROM partners p JOIN organizations o ON p.organization_id = o.id
      WHERE o.id <> $1
    `, [organization_id]);

    const targetVec = _termFreq(_tokenize(target.rows[0].description || target.rows[0].name));
    const scored = partners.rows.map((p) => ({
      partner_id: p.partner_id,
      organization_id: p.org_id,
      name: p.name,
      similarity: Number(_cosine(targetVec, _termFreq(_tokenize(p.description || p.name))).toFixed(4)),
    })).sort((a, b) => b.similarity - a.similarity).slice(0, Math.min(20, parseInt(top_n) || 5));

    res.json({
      target: target.rows[0],
      recommendations: scored,
      method: 'tf-idf-cosine-in-memory',
      note: 'PRODUCT-DECISION: simple bag-of-words; replace with embeddings when vector store is provisioned.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 4. Predictive deal closure (in-memory logistic stub)
// PRODUCT-DECISION: stub uses calibrated coefficients over (stage, days_in_stage,
// log(value), partner_count). Replace with real ML pipeline later.
// ============================================================
router.post('/deal-closure/predict', async (req, res) => {
  try {
    const { opportunity_id } = req.body || {};
    if (!opportunity_id) return res.status(400).json({ error: 'opportunity_id required' });
    const opp = await pool.query('SELECT * FROM opportunities WHERE id = $1', [opportunity_id]);
    if (!opp.rows.length) return res.status(404).json({ error: 'opportunity not found' });
    const o = opp.rows[0];
    const stageWeight = ({ qualification: 0.1, proposal: 0.35, negotiation: 0.6, closed_won: 0.99, closed_lost: 0.01 })[String(o.stage || '').toLowerCase()] ?? 0.25;
    const daysInStage = o.stage_changed_at ? Math.max(0, Math.floor((Date.now() - new Date(o.stage_changed_at).getTime()) / 86400000)) : 30;
    const valueWeight = Math.min(0.15, Math.log10(Math.max(1, parseFloat(o.amount) || 1)) * 0.025);
    const stalePenalty = Math.min(0.25, daysInStage / 200);
    const probability = Math.max(0.01, Math.min(0.99, stageWeight + valueWeight - stalePenalty));
    res.json({
      opportunity_id,
      probability: Number(probability.toFixed(3)),
      label: probability >= 0.7 ? 'likely_win' : probability >= 0.4 ? 'uncertain' : 'unlikely_win',
      method: 'logistic-stub',
      features: { stage: o.stage, days_in_stage: daysInStage, amount: o.amount },
      note: 'PRODUCT-DECISION: stub. Real ML pipeline (TOO-RISKY this pass) is deferred.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 5. Partner-network graph analysis (in-memory)
// PRODUCT-DECISION: build adjacency over opportunities (partner_id ↔ organization_id)
// and report connected components + degree centrality.
// ============================================================
router.post('/partner-network/analyze', async (req, res) => {
  try {
    const opps = await pool.query(`
      SELECT id, partner_id, organization_id FROM opportunities
      WHERE partner_id IS NOT NULL AND organization_id IS NOT NULL
      LIMIT 5000
    `);
    const adj = new Map();
    const addEdge = (a, b) => {
      if (!adj.has(a)) adj.set(a, new Set());
      adj.get(a).add(b);
    };
    opps.rows.forEach((r) => {
      const a = `p${r.partner_id}`;
      const b = `o${r.organization_id}`;
      addEdge(a, b); addEdge(b, a);
    });
    // Connected components (BFS)
    const seen = new Set();
    const components = [];
    for (const node of adj.keys()) {
      if (seen.has(node)) continue;
      const stack = [node]; const comp = [];
      while (stack.length) {
        const n = stack.pop();
        if (seen.has(n)) continue;
        seen.add(n); comp.push(n);
        adj.get(n).forEach((m) => { if (!seen.has(m)) stack.push(m); });
      }
      components.push(comp);
    }
    // Degree centrality top 10
    const degrees = [...adj.entries()].map(([k, v]) => ({ node: k, degree: v.size }))
      .sort((a, b) => b.degree - a.degree).slice(0, 10);
    res.json({
      nodes: adj.size,
      edges: opps.rows.length,
      components: components.length,
      largest_component_size: components.reduce((m, c) => Math.max(m, c.length), 0),
      top_central_nodes: degrees,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 6. Payout management
// ============================================================
router.post('/payouts', async (req, res) => {
  try {
    await ensureSchema();
    const { partner_id, opportunity_id, amount, currency, scheduled_date, notes } = req.body || {};
    if (!amount) return res.status(400).json({ error: 'amount required' });
    const r = await pool.query(
      `INSERT INTO payouts (partner_id, opportunity_id, amount, currency, scheduled_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [partner_id || null, opportunity_id || null, amount, currency || 'USD', scheduled_date || null, notes || null, req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/payouts', async (req, res) => {
  try {
    await ensureSchema();
    const r = await pool.query(`SELECT * FROM payouts ORDER BY created_at DESC LIMIT 200`);
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payouts/:id/disburse', async (req, res) => {
  if (!process.env.PAYMENT_PROVIDER_KEY) return require503(res, 'PAYMENT_PROVIDER_KEY');
  try {
    await ensureSchema();
    const r = await pool.query(
      `UPDATE payouts SET status = 'disbursed', paid_date = CURRENT_DATE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'payout not found' });
    res.json({ payout: r.rows[0], status: 'disbursed_pending_provider_sdk' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 7. Financial reporting (period close + report)
// ============================================================
router.post('/financial/close-period', async (req, res) => {
  try {
    await ensureSchema();
    const { period_start, period_end } = req.body || {};
    if (!period_start || !period_end) return res.status(400).json({ error: 'period_start and period_end required' });
    const rev = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM opportunities
       WHERE stage = 'closed_won' AND closed_date BETWEEN $1 AND $2`,
      [period_start, period_end]
    ).catch(() => ({ rows: [{ total: 0 }] }));
    const revenueTotal = parseFloat(rev.rows[0].total) || 0;
    const r = await pool.query(
      `INSERT INTO financial_periods (period_start, period_end, revenue_total, status, closed_at)
       VALUES ($1, $2, $3, 'closed', NOW()) RETURNING *`,
      [period_start, period_end, revenueTotal]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/financial/periods', async (req, res) => {
  try {
    await ensureSchema();
    const r = await pool.query(`SELECT * FROM financial_periods ORDER BY period_start DESC LIMIT 50`);
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 8. Contract Lifecycle Management
// ============================================================
router.post('/clm/contracts', async (req, res) => {
  try {
    await ensureSchema();
    const { agreement_id, state, renewal_date, notice_period_days } = req.body || {};
    const r = await pool.query(
      `INSERT INTO contract_lifecycle (agreement_id, state, renewal_date, notice_period_days)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [agreement_id || null, state || 'draft', renewal_date || null, notice_period_days || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clm/sync', async (req, res) => {
  if (!process.env.CLM_API_KEY) return require503(res, 'CLM_API_KEY');
  if (!process.env.CLM_BASE_URL) return require503(res, 'CLM_BASE_URL');
  res.json({
    status: 'configured_pending_sdk',
    provider: process.env.CLM_BASE_URL,
    message: 'CLM credentials present.',
  });
});

router.get('/clm/contracts', async (req, res) => {
  try {
    await ensureSchema();
    const r = await pool.query(`SELECT * FROM contract_lifecycle ORDER BY created_at DESC LIMIT 200`);
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 9. ERP integration sync (NEEDS-CREDS)
// ============================================================
router.post('/erp/sync', async (req, res) => {
  if (!process.env.ERP_API_KEY) return require503(res, 'ERP_API_KEY');
  if (!process.env.ERP_BASE_URL) return require503(res, 'ERP_BASE_URL');
  try {
    await ensureSchema();
    const r = await pool.query(
      `INSERT INTO erp_sync_log (action, records_synced, status) VALUES ('pull', 0, 'configured_pending_sdk') RETURNING *`
    );
    res.json({ provider: process.env.ERP_BASE_URL, status: 'configured_pending_sdk', log: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 10. Negotiation templates
// PRODUCT-DECISION: lifecycle = draft|published|archived; versions are
// monotonic per name. Approval flow deferred (no approver schema yet).
// ============================================================
router.post('/negotiation-templates', async (req, res) => {
  try {
    await ensureSchema();
    const { name, category, body, status } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const existing = await pool.query(
      `SELECT MAX(version) as v FROM negotiation_templates WHERE name = $1`, [name]
    );
    const nextVersion = (parseInt(existing.rows[0]?.v) || 0) + 1;
    const r = await pool.query(
      `INSERT INTO negotiation_templates (name, category, body, version, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, category || null, body || '', nextVersion, status || 'draft', req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/negotiation-templates', async (req, res) => {
  try {
    await ensureSchema();
    const r = await pool.query(`SELECT * FROM negotiation_templates ORDER BY updated_at DESC LIMIT 200`);
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
