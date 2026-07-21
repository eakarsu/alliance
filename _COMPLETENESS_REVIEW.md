# Completeness Review: alliance

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 159 project files (122 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished application workflow application, not just an empty scaffold. Inspection found 122 source files across `frontend/`, `backend/`, `logs/` using Next.js, React, Express; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Define the primary user and acceptance criteria, then complete one end-to-end workflow against persistent data instead of demo fixtures.
2. Replace mocks, placeholders, and generic AI responses with validated domain services and explicit failure/retry behavior.
3. Implement secure identity, role/tenant boundaries, input validation, secrets handling, and auditable state changes.
4. Add representative automated tests, CI quality gates, environment documentation, migrations, observability, backup, and deployment configuration.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.

## Evidence inspected

- `frontend/README.md`
- `frontend/src/App.jsx:1`
- `frontend/src/components/DataTable.jsx:227`
- `backend/server.js`
- `backend/package.json`
- `start.sh`

## Recommended next action

Choose one real application workflow journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress — 2026-07-19

All source-actionable findings in this review are implemented.

1. The primary user and acceptance contract are now explicit in `RUNBOOK.md`: an enterprise-partner owner submits a checksum-evidenced alliance case and advances it through conflict, compliance, proposal, agreement, activation, and delivery handoff. `backend/routes/authoritativeAlliance.js`, `backend/domain/allianceWorkflow.js`, and the additive PostgreSQL migration implement that complete persistent HTTP journey with exact-value validation, deterministic transitions, optimistic versioning, idempotency, one-use independent approvals, and append-only events.
2. Generated/demo, custom-view, legacy integration, and generic-model endpoints are removed from the supported runtime surface and fail with `410`. The only outbound behavior is a typed allowlist of CRM, CLM, ERP, and notification operations with HTTPS, bounded timeouts/retries, idempotency keys, payload hashes, verified provider receipts, retry scheduling, terminal dead-letter state, and audited failures.
3. The governed surface requires issuer/audience/algorithm-bound JWTs, strong runtime secret configuration, an active persistent membership whose tenant and role match the token, role/participant scope, tenant-qualified queries, size-limited JSON, independent approvals, and immutable audit/event records. `.env.example` is secret-free; populated environment files stay ignored. Reachable Git history contains no tracked root or backend `.env` file, and ignored local environment files were not opened.
4. `start.sh` now has explicit `check`, guarded additive `migrate`, and foreground loopback-only `start` modes. It never kills processes, installs dependencies, manages system services, creates users/databases, seeds, or resets data; destructive legacy database scripts were removed from package commands. The runbook covers configuration, identity/membership provisioning, deployment, health/readiness, monitoring, delivery recovery, secret rotation, backup/isolated restore, and application-before-schema rollback. CI provisions PostgreSQL 16, installs lockfiles, replays the migration twice, runs all backend tests, builds the frontend, audits production dependencies, and syntax-checks the launcher.
5. Ten tests cover domain validation and transitions, role/tenant/participant denial, independent and stage-bound one-use approvals, bounded provider failures, receipt integrity, migration safety, runtime-route quarantine, launcher safety, and a full database-backed HTTP journey. The journey proves duplicate/conflicting idempotency behavior, cross-tenant and suspended-member denial, four independent approvals through activation, terminal provider failure and audit, monitoring, and append-only enforcement.

Validation completed locally: the governed migration applied three consecutive times to a disposable PostgreSQL cluster (including the guarded launcher path); all 10 tests passed with the database journey enabled; backend syntax checks passed; the Vite production build passed; `bash -n start.sh` and `git diff --check` passed; and both backend and frontend production dependency audits report zero vulnerabilities. No shared database or service was touched, and the disposable cluster was stopped and removed.

Remaining launch work is external rather than missing source: the operator must provision the production identity issuer and tenant memberships, provide real provider contracts/secrets, run capacity and failure drills against those providers, choose deployment/retention objectives, and execute an evidence-retaining backup/restore exercise in the owned environment.

## Runtime verification — 2026-07-20

- The launcher now maps the standard acceptance secret to `ALLIANCE_JWT_SECRET`, requires the assigned API port, refuses conflicts, and runs the real backend source from the isolated fixture. The server no longer has a fallback port.
- Added additive local-identity columns, an explicit bcrypt-cost-12 administrator provisioner, and `/api/auth/login` plus `/api/auth/me`. Login issues the same issuer/audience-bound alliance JWT used by the authoritative API, while `/me` reloads and validates the active tenant membership from PostgreSQL. Production can continue to provision memberships and tokens through its upstream issuer.
- First acceptance passed on fresh PostgreSQL `55629`, API `6072`, and reserved UI `6073` as `startup_login_session_api`; migration and identity provisioning ran before startup and all assigned ports were released.
- Nine domain/provider/runtime tests passed with the opt-in PostgreSQL journey correctly skipped without its database flag; backend syntax checks, the Vite build, launcher syntax, and whitespace validation passed. The existing large-chunk build warning is advisory.
