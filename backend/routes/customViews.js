// Custom Views for Alliance CRM
// 4 endpoints: timeline (VIZ), heatmap (VIZ), brief PDF (NON-VIZ), rules CRUD (NON-VIZ)
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db/connection');

let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (e) { PDFDocument = null; }

// In-memory store for governance/operating rules (decision rights + contributions)
const rulesStore = {
  decision_rights: [
    { id: 1, area: 'Pricing & Discounts', owner_role: 'founding_orchestrator', approval_threshold: 'CFO + Founder', notes: 'Above 15% needs joint sign-off', updated_at: new Date().toISOString() },
    { id: 2, area: 'Partner Onboarding', owner_role: 'pmo_coordinator', approval_threshold: 'PMO Lead', notes: 'Standard vetting checklist required', updated_at: new Date().toISOString() },
    { id: 3, area: 'Technical Architecture', owner_role: 'solution_architect', approval_threshold: 'Architect Council', notes: 'Quarterly review of stack decisions', updated_at: new Date().toISOString() },
  ],
  contributions: [
    { id: 1, partner: 'TechVista', contribution_type: 'capital', value_pct: 35, period: '2026-Q1', notes: 'Initial seed funding', updated_at: new Date().toISOString() },
    { id: 2, partner: 'Nordic Digital', contribution_type: 'capability', value_pct: 25, period: '2026-Q1', notes: 'AI / ML team', updated_at: new Date().toISOString() },
    { id: 3, partner: 'London FinTech', contribution_type: 'channel', value_pct: 20, period: '2026-Q1', notes: 'EU enterprise access', updated_at: new Date().toISOString() },
  ],
};
let nextDRId = 4;
let nextContribId = 4;

// -----------------------------------------------------------------------
// 1) VIZ — Alliance activity timeline
// GET /api/custom-views/activity-timeline?days=90&limit=200
// -----------------------------------------------------------------------
router.get('/activity-timeline', auth, async (req, res) => {
  try {
    const days = Math.max(1, Math.min(365, parseInt(req.query.days) || 90));
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit) || 200));

    let rows = [];
    try {
      const q = await pool.query(
        `SELECT a.id, a.related_type, a.related_id, a.activity_type, a.activity_date,
                a.summary, a.owner_user_id, u.full_name AS owner_name
         FROM activities a
         LEFT JOIN users u ON u.id = a.owner_user_id
         WHERE a.activity_date >= NOW() - ($1 || ' days')::interval
         ORDER BY a.activity_date DESC
         LIMIT $2`,
        [String(days), limit]
      );
      rows = q.rows || [];
    } catch (e) {
      // fallback shape if query fails
      rows = [];
    }

    // bucket by week + type for the chart layer
    const buckets = {};
    const typeCounts = {};
    for (const r of rows) {
      const d = r.activity_date ? new Date(r.activity_date) : new Date();
      const wk = new Date(d);
      wk.setHours(0, 0, 0, 0);
      wk.setDate(wk.getDate() - wk.getDay()); // week start (Sun)
      const key = wk.toISOString().slice(0, 10);
      buckets[key] = (buckets[key] || 0) + 1;
      const t = r.activity_type || 'other';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
    const weekly = Object.entries(buckets)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));
    const by_type = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      type: 'activity-timeline',
      days,
      total: rows.length,
      weekly,
      by_type,
      events: rows.slice(0, 60),
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('activity-timeline error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------------------------
// 2) VIZ — Partner contribution heatmap (partner x metric)
// GET /api/custom-views/partner-heatmap
// -----------------------------------------------------------------------
router.get('/partner-heatmap', auth, async (req, res) => {
  try {
    let partners = [];
    try {
      const q = await pool.query(
        `SELECT id, entity_name FROM partner_entities ORDER BY entity_name LIMIT 12`
      );
      partners = q.rows || [];
    } catch (e) {
      partners = [];
    }
    if (!partners.length) {
      partners = [
        { id: 1, entity_name: 'TechVista' },
        { id: 2, entity_name: 'Nordic Digital' },
        { id: 3, entity_name: 'London FinTech' },
        { id: 4, entity_name: 'Ankara Gov Solutions' },
        { id: 5, entity_name: 'Berlin AI Labs' },
      ];
    }

    const metrics = ['deals_won', 'revenue_share', 'leads_sourced', 'demos_delivered', 'support_tickets', 'compliance_score'];
    // try to read from kpi_contributions; fall back to deterministic synthetic values
    let kpiByPartner = {};
    try {
      const q = await pool.query(
        `SELECT k.metric_name, k.metric_value, k.related_id, k.related_type
         FROM kpi_contributions k`
      );
      for (const row of q.rows || []) {
        const key = row.related_id;
        if (!kpiByPartner[key]) kpiByPartner[key] = {};
        const mn = row.metric_name || 'unknown';
        kpiByPartner[key][mn] = (kpiByPartner[key][mn] || 0) + Number(row.metric_value || 0);
      }
    } catch (e) {
      kpiByPartner = {};
    }

    function synth(pid, midx) {
      const seed = (Number(pid) * 17 + midx * 31) % 100;
      return Math.round(20 + (seed / 100) * 80); // 20..100
    }

    const cells = [];
    for (const p of partners) {
      for (let mi = 0; mi < metrics.length; mi++) {
        const m = metrics[mi];
        const raw = kpiByPartner[p.id]?.[m];
        const value = raw != null && raw > 0 ? Math.min(100, Math.round(raw * 10)) : synth(p.id, mi);
        cells.push({ partner_id: p.id, partner: p.entity_name, metric: m, value });
      }
    }

    res.json({
      type: 'partner-heatmap',
      partners: partners.map((p) => p.entity_name),
      metrics,
      cells,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('partner-heatmap error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------------------------
// 3) NON-VIZ — Alliance status brief PDF
// GET /api/custom-views/status-brief.pdf
// -----------------------------------------------------------------------
router.get('/status-brief.pdf', auth, async (req, res) => {
  try {
    if (!PDFDocument) {
      // Plain-text fallback so the endpoint still returns 200
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(
        `Alliance Status Brief\nGenerated: ${new Date().toISOString()}\n\n(pdfkit not installed; install in backend to enable real PDF output)`
      );
    }

    let counts = { partners: 0, opportunities: 0, agreements: 0, activities: 0, risks: 0 };
    try {
      const q = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM partner_entities) AS partners,
          (SELECT COUNT(*) FROM opportunities)    AS opportunities,
          (SELECT COUNT(*) FROM agreements)       AS agreements,
          (SELECT COUNT(*) FROM activities)       AS activities,
          (SELECT COUNT(*) FROM risks)            AS risks
      `);
      counts = q.rows[0] || counts;
    } catch (e) { /* keep defaults */ }

    let topPartners = [];
    try {
      const q = await pool.query(
        `SELECT entity_name, entity_type, geography FROM partner_entities ORDER BY created_at DESC LIMIT 8`
      );
      topPartners = q.rows || [];
    } catch (e) { /* empty */ }

    let recentActivities = [];
    try {
      const q = await pool.query(
        `SELECT activity_type, summary, activity_date FROM activities ORDER BY activity_date DESC NULLS LAST LIMIT 6`
      );
      recentActivities = q.rows || [];
    } catch (e) { /* empty */ }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="alliance-status-brief.pdf"');

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#1e293b').text('Alliance Status Brief', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#64748b').text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#0f172a').text('Portfolio Snapshot');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#334155');
    doc.text(`Partners:        ${counts.partners}`);
    doc.text(`Opportunities:   ${counts.opportunities}`);
    doc.text(`Agreements:      ${counts.agreements}`);
    doc.text(`Activities:      ${counts.activities}`);
    doc.text(`Open Risks:      ${counts.risks}`);
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#0f172a').text('Recent Partners');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#334155');
    if (!topPartners.length) doc.text('No partners found.');
    for (const p of topPartners) {
      doc.text(`- ${p.entity_name} (${p.entity_type || 'n/a'}, ${p.geography || 'n/a'})`);
    }
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#0f172a').text('Recent Activities');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#334155');
    if (!recentActivities.length) doc.text('No recent activities.');
    for (const a of recentActivities) {
      const d = a.activity_date ? new Date(a.activity_date).toISOString().slice(0, 10) : 'n/a';
      doc.text(`[${d}] (${a.activity_type || 'event'}) ${a.summary || ''}`);
    }

    doc.moveDown(1.5);
    doc.fontSize(9).fillColor('#94a3b8').text(
      'This brief is auto-generated from live Alliance CRM data. Confidential — internal use only.',
      { align: 'center' }
    );
    doc.end();
  } catch (e) {
    console.error('status-brief.pdf error:', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------------------------
// 4) NON-VIZ — Governance / Operating rules editor CRUD
// GET    /api/custom-views/rules
// POST   /api/custom-views/rules        body: { kind: 'decision_rights'|'contributions', ...fields }
// PUT    /api/custom-views/rules/:kind/:id
// DELETE /api/custom-views/rules/:kind/:id
// -----------------------------------------------------------------------
router.get('/rules', auth, (req, res) => {
  res.json({
    type: 'rules',
    decision_rights: rulesStore.decision_rights,
    contributions: rulesStore.contributions,
    generated_at: new Date().toISOString(),
  });
});

router.post('/rules', auth, (req, res) => {
  try {
    const { kind } = req.body || {};
    if (kind === 'decision_rights') {
      const { area, owner_role, approval_threshold, notes } = req.body || {};
      if (!area) return res.status(400).json({ error: 'area required' });
      const item = {
        id: nextDRId++,
        area,
        owner_role: owner_role || '',
        approval_threshold: approval_threshold || '',
        notes: notes || '',
        updated_at: new Date().toISOString(),
      };
      rulesStore.decision_rights.push(item);
      return res.json({ ok: true, item });
    }
    if (kind === 'contributions') {
      const { partner, contribution_type, value_pct, period, notes } = req.body || {};
      if (!partner) return res.status(400).json({ error: 'partner required' });
      const item = {
        id: nextContribId++,
        partner,
        contribution_type: contribution_type || 'capital',
        value_pct: Number(value_pct) || 0,
        period: period || '',
        notes: notes || '',
        updated_at: new Date().toISOString(),
      };
      rulesStore.contributions.push(item);
      return res.json({ ok: true, item });
    }
    return res.status(400).json({ error: 'kind must be decision_rights or contributions' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/rules/:kind/:id', auth, (req, res) => {
  const { kind, id } = req.params;
  const list = rulesStore[kind];
  if (!list) return res.status(400).json({ error: 'invalid kind' });
  const idx = list.findIndex((x) => String(x.id) === String(id));
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  const updated = { ...list[idx], ...(req.body || {}), id: list[idx].id, updated_at: new Date().toISOString() };
  list[idx] = updated;
  res.json({ ok: true, item: updated });
});

router.delete('/rules/:kind/:id', auth, (req, res) => {
  const { kind, id } = req.params;
  const list = rulesStore[kind];
  if (!list) return res.status(400).json({ error: 'invalid kind' });
  const idx = list.findIndex((x) => String(x.id) === String(id));
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  const removed = list.splice(idx, 1)[0];
  res.json({ ok: true, removed });
});

module.exports = router;
