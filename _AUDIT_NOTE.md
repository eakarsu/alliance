# Audit Apply Notes — alliance

Source: `_AUDIT/reports/batch_09.md` § alliance

## Original audit recommendations

### Missing AI counterparts
- Opportunity scoring
- Partner performance prediction
- Deal stage forecasting
- Conflict resolution recommendations
- Governance policy compliance checking

### Missing non-AI features
- Payout management
- Financial reporting
- Contract lifecycle management
- Negotiation templates

### Custom feature ideas
- Predictive deal closure with probability modelling
- Partner risk assessment (financial + performance)
- Conflict detection in partner networks
- Automated payout calculations and reconciliation
- Governance compliance automation (audit trails, approvals)
- Integration with financial systems for revenue tracking
- Strategic partner recommendation engine
- Integration with legal/contract management systems

## Implemented this pass

All implemented in `backend/routes/ai.js`, mounted under `/api/ai`:

- `POST /api/ai/score-opportunity` — pulls the opportunity (with role/access enforcement) and asks the LLM for a JSON win-probability score with key factors and next actions. Mechanical implementation of "Opportunity scoring".
- `POST /api/ai/forecast-stage` — returns predicted next stage, time-to-close, blockers for an opportunity. Mechanical implementation of "deal stage forecasting".
- `POST /api/ai/governance-check` — accepts an action description plus optional entity ref, returns JSON verdict + findings + required approvals + policy refs. Mechanical implementation of "governance policy compliance checking".

All three reuse the existing `callOpenRouter` helper, the existing `auth` middleware, and the existing `canAccessRecord`/role gating so behaviour matches the rest of the file. Restricted-external users are blocked. Syntax-checked with `node --check`.

## Backlog (not implemented)

### Needs product decision
- Partner performance prediction — needs definition of "performance" (revenue, deal count, NPS, on-time delivery weights).
- Conflict resolution recommendations — depends on conflict-queue UX (already alluded to in `governance.js`).
- Strategic partner recommendation engine — needs feature vectors / embeddings strategy.
- Negotiation templates — needs template taxonomy and lifecycle decision (versioning, approval flow).

### Needs schema/data model work
- Payout management module (tables, settlement workflow, ledger).
- Financial reporting (period close, recognition rules).
- Contract lifecycle management (states, renewals, redlines).
- Integrations: financial systems (ERP), legal/CLM systems.

### Larger AI work
- Predictive deal closure model — ML model training pipeline + feature store.
- Partner risk scoring — combines financial signals (out of system) with performance.
- Conflict detection in partner networks — graph analysis over partner/opportunity records.

## Categorisation

- MECHANICAL: opportunity scoring, deal stage forecasting, governance policy check (all done).
- NEEDS-PRODUCT-DECISION: partner performance prediction, conflict resolution rec, strategic partner rec, negotiation templates.
- NEEDS-SCHEMA: payouts, financial reporting, CLM, ERP/CLM integrations.
- TOO-RISKY (this pass): predictive deal closure ML pipeline, partner-network graph analysis.

## Apply pass 4 (mechanical backlog)
- Reviewed remaining backlog. All open items are tagged NEEDS-PRODUCT-DECISION, NEEDS-SCHEMA, or TOO-RISKY — nothing mechanical remains. No code changes this pass.

## Apply pass 3 (frontend)
- Stack: Vite-React 19 + Tailwind v4 (frontend) + Express (backend).
- Action: LEFT-AS-IS — FE already wired.
- `pages/AIInsights.jsx` defines tabs for `/ai/score-opportunity`, `/ai/forecast-stage`, `/ai/governance-check` matching the new backend endpoints. `AIAssistant.jsx` is an additional consumer. JWT via shared axios client in `src/api/`.
- No FE changes required.
