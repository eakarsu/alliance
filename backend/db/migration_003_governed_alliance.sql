BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS alliance_memberships (
  tenant_id UUID NOT NULL, actor_id TEXT NOT NULL, role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(tenant_id,actor_id)
);
CREATE TABLE IF NOT EXISTS alliance_cases (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, owner_id TEXT NOT NULL, title TEXT NOT NULL,
  estimated_value_cents BIGINT NOT NULL CHECK(estimated_value_cents>=0), currency CHAR(3) NOT NULL,
  partner_ids JSONB NOT NULL, participant_ids JSONB NOT NULL DEFAULT '[]'::jsonb, evidence JSONB NOT NULL,
  input_hash CHAR(64) NOT NULL, state TEXT NOT NULL DEFAULT 'intake', version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS alliance_cases_scope_idx ON alliance_cases(tenant_id,owner_id,state,updated_at DESC);
CREATE TABLE IF NOT EXISTS alliance_approvals (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, case_id UUID NOT NULL REFERENCES alliance_cases(id),
  kind TEXT NOT NULL CHECK(kind IN ('conflict','compliance','proposal','agreement')),
  requested_by TEXT NOT NULL, decision TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','approved','rejected')),
  decided_by TEXT, rationale TEXT NOT NULL, requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ, consumed_case_version INTEGER,
  UNIQUE(case_id,kind,requested_at)
);
ALTER TABLE alliance_approvals ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;
ALTER TABLE alliance_approvals ADD COLUMN IF NOT EXISTS consumed_case_version INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS alliance_one_pending_approval_idx ON alliance_approvals(case_id,kind) WHERE decision='pending';
CREATE TABLE IF NOT EXISTS alliance_case_events (
  sequence BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL, case_id UUID NOT NULL REFERENCES alliance_cases(id),
  actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, command TEXT NOT NULL, from_state TEXT NOT NULL, to_state TEXT NOT NULL,
  idempotency_key TEXT NOT NULL, payload JSONB NOT NULL, approval_id UUID REFERENCES alliance_approvals(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(case_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS alliance_delivery_jobs (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, case_id UUID NOT NULL REFERENCES alliance_cases(id),
  connector TEXT NOT NULL CHECK(connector IN ('crm','clm','erp','notification')), operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL, payload JSONB NOT NULL, payload_hash CHAR(64) NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','retry','confirmed','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_reference TEXT, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,connector,idempotency_key)
);
CREATE TABLE IF NOT EXISTS alliance_provider_receipts (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL, job_id UUID NOT NULL REFERENCES alliance_delivery_jobs(id),
  provider_reference TEXT NOT NULL, payload_hash CHAR(64) NOT NULL, receipt JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(job_id,provider_reference)
);
CREATE TABLE IF NOT EXISTS alliance_audit (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL,
  action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION alliance_audit_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'alliance audit is append-only'; END $$;
DROP TRIGGER IF EXISTS alliance_audit_immutable_trigger ON alliance_audit;
CREATE TRIGGER alliance_audit_immutable_trigger BEFORE UPDATE OR DELETE ON alliance_audit FOR EACH ROW EXECUTE FUNCTION alliance_audit_immutable();
CREATE OR REPLACE FUNCTION alliance_event_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'alliance events are append-only'; END $$;
DROP TRIGGER IF EXISTS alliance_event_immutable_trigger ON alliance_case_events;
CREATE TRIGGER alliance_event_immutable_trigger BEFORE UPDATE OR DELETE ON alliance_case_events FOR EACH ROW EXECUTE FUNCTION alliance_event_immutable();
COMMIT;
