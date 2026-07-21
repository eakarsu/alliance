# Governed Alliance workflow runbook

## Supported product journey

The primary user is an enterprise-partner owner coordinating a joint opportunity. A case is accepted only when it is stored under one tenant, has an exact monetary value, at least one partner, and checksum-bound evidence. It then moves through `intake -> conflict_review -> compliance_review -> proposal_review -> agreement_review -> active`. Conflict, compliance, proposal, and agreement decisions must be made by an authorized person other than the requester. A delivery handoff can follow activation; rejection and controlled recovery remain auditable.

The authoritative surface is `/api/v1/alliance`. Old generated and model-specific `/api` routes return `410`; they are not supported product behavior. Identity must come from an upstream service that issues HS256 tokens with issuer `alliance-identity`, audience `alliance-api`, and `sub`, `tenantId`, and `role` claims. The same subject, tenant, and canonical role must be provisioned in `alliance_memberships`; there are no default or demo credentials.

Acceptance requires the HTTP/database journey in `backend/test/alliance.database.test.js`: create, submit, independently approve every gate, reach active, deny cross-tenant reads, bind idempotency, record audit events, and dead-letter a terminal delivery failure.

## Install and verify

Use Node 22 and PostgreSQL 16. Install from the lockfiles with `npm ci` in `backend` and `frontend`. Copy `.env.example` to a secret manager or ignored local `.env`; do not commit populated values.

```sh
./start.sh check
```

For database-backed tests, create a disposable database, apply the migration twice, and run:

```sh
RUN_DB_TESTS=1 DATABASE_URL="$DATABASE_URL" \
  ALLIANCE_JWT_SECRET="$ALLIANCE_JWT_SECRET" npm --prefix backend test
```

## Migration and deployment

Back up PostgreSQL before a release and review `backend/db/migration_003_governed_alliance.sql`. Apply only the additive governed migration explicitly:

```sh
ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate
./start.sh start
```

`start` runs one foreground API process, binds to `127.0.0.1`, and never installs packages, edits users, starts system services, kills processes, seeds data, or changes schema. Route external traffic through TLS ingress and restrict CORS to the deployed UI origins. Readiness verifies the database before traffic is admitted.

Rollback the application before the schema: the migration is additive and the previous binary can ignore its tables. Do not drop governed tables during rollback. After the retention window and an approved data-export/deletion plan, retire them in a separate reviewed migration.

## Provider delivery and operations

Only the typed CRM, CLM, ERP, and notification operations in `backend/domain/providerAdapters.js` may leave the service. Every delivery carries an idempotency key and payload hash; a success receipt must return the matching hash. Retryable failures use bounded backoff and terminal or exhausted failures become `dead_letter`. Inspect `/api/v1/alliance/monitoring` with an authorized tenant membership, resolve the provider or payload issue, and use the audited `recover` command before retrying business progression.

Monitor liveness/readiness, case state age, pending approvals, retry count, dead-letter count, provider latency/errors, and audit insert failures. Alert on readiness failure, any audit-write failure, or sustained dead-letter growth.

Back up with an encrypted `pg_dump` under the organization's retention policy. Test restore into an isolated database, run the migration idempotently, execute the database journey, and compare case/event/receipt counts and sampled hashes before declaring recovery. Never restore over production.

## Secrets and incident response

Rotate the JWT and provider secrets through the deployment secret store. A JWT rotation invalidates outstanding tokens; coordinate it with the identity issuer. On suspected exposure, revoke provider tokens, rotate the JWT secret, inspect append-only audit and delivery receipts, and notify affected tenants under policy. Repository history was checked for tracked `.env` files; none were found. Existing ignored local environment files were neither opened nor copied and should still be rotated if their provenance is uncertain.
