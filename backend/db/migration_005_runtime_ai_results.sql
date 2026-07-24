BEGIN;
CREATE TABLE IF NOT EXISTS alliance_runtime_ai_results (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  actor_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider='openrouter'),
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(tenant_id,actor_id) REFERENCES alliance_memberships(tenant_id,actor_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS alliance_runtime_ai_lookup_idx ON alliance_runtime_ai_results(tenant_id,actor_id,created_at DESC);
COMMIT;
