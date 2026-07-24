#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$project_dir/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$project_dir/.env"
  set +a
fi
export ALLIANCE_JWT_SECRET="${ALLIANCE_JWT_SECRET:-${JWT_SECRET:-}}"
export API_PORT="${API_PORT:-${BACKEND_PORT:-}}"
export UI_PORT="${UI_PORT:-${FRONTEND_PORT:-}}"

require_runtime_env() {
  : "${DATABASE_URL:?DATABASE_URL is required}"
  : "${ALLIANCE_JWT_SECRET:?ALLIANCE_JWT_SECRET is required}"
  : "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}"
  : "${OPENROUTER_MODEL:?OPENROUTER_MODEL is required}"
  : "${OPENROUTER_BASE_URL:?OPENROUTER_BASE_URL is required}"
  : "${API_PORT:?API_PORT is required}"
  : "${UI_PORT:?UI_PORT is required}"
  [[ ${#ALLIANCE_JWT_SECRET} -ge 32 ]] || { echo 'ALLIANCE_JWT_SECRET must contain at least 32 characters' >&2; exit 64; }
  [[ "$API_PORT" != "$UI_PORT" ]] || { echo 'API_PORT and UI_PORT must differ' >&2; exit 64; }
}
migrate() {
  [[ "${ALLOW_SCHEMA_MIGRATION:-}" == 1 || "${ALLOW_SCHEMA_MIGRATION:-}" == true ]] || { echo 'Set ALLOW_SCHEMA_MIGRATION=true after approval' >&2; exit 64; }
  for migration in \
    "$project_dir/backend/db/migration_003_governed_alliance.sql" \
    "$project_dir/backend/db/migration_004_local_identity.sql" \
    "$project_dir/backend/db/migration_005_runtime_ai_results.sql"; do
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
  done
}
start_services() {
  migrate
  npm --prefix "$project_dir/backend" run create-admin
  cleanup() {
    trap - INT TERM EXIT
    [[ -z "${frontend_pid:-}" ]] || kill "$frontend_pid" 2>/dev/null || true
    [[ -z "${backend_pid:-}" ]] || kill "$backend_pid" 2>/dev/null || true
    [[ -z "${frontend_pid:-}" ]] || wait "$frontend_pid" 2>/dev/null || true
    [[ -z "${backend_pid:-}" ]] || wait "$backend_pid" 2>/dev/null || true
  }
  trap cleanup INT TERM EXIT
  BACKEND_PORT="$API_PORT" CORS_ORIGINS="http://127.0.0.1:$UI_PORT" node "$project_dir/backend/server.js" &
  backend_pid=$!
  VITE_API_TARGET="http://127.0.0.1:$API_PORT" npm --prefix "$project_dir/frontend" run dev -- --host 127.0.0.1 --port "$UI_PORT" --strictPort &
  frontend_pid=$!
  wait "$backend_pid" "$frontend_pid"
}

case "${1:-start}" in
  check) npm --prefix "$project_dir/backend" run check && npm --prefix "$project_dir/frontend" run lint && npm --prefix "$project_dir/frontend" run build ;;
  migrate) require_runtime_env; migrate ;;
  start) require_runtime_env; start_services ;;
  *) echo 'usage: ./start.sh [check|migrate|start]' >&2; exit 64 ;;
esac
