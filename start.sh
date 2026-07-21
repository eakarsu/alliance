#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_dir="${RUNTIME_PROJECT_SOURCE:-$project_dir}"
mode="${1:-check}"
ALLIANCE_JWT_SECRET="${ALLIANCE_JWT_SECRET:-${JWT_SECRET:-}}"
BACKEND_PORT="${BACKEND_PORT:-${PORT:-}}"
export ALLIANCE_JWT_SECRET BACKEND_PORT

require_runtime_env() {
  : "${DATABASE_URL:?Set DATABASE_URL to the PostgreSQL database to use}"
  : "${ALLIANCE_JWT_SECRET:?Set ALLIANCE_JWT_SECRET (at least 32 characters)}"
  if (( ${#ALLIANCE_JWT_SECRET} < 32 )); then
    echo "ALLIANCE_JWT_SECRET must contain at least 32 characters" >&2
    exit 64
  fi
}

case "$mode" in
  check)
    npm --prefix "$app_dir/backend" run check
    npm --prefix "$app_dir/frontend" run build
    ;;
  migrate)
    require_runtime_env
    if [[ "${ALLOW_SCHEMA_MIGRATION:-}" != "1" ]]; then
      echo "Migration is disabled. Review the SQL and set ALLOW_SCHEMA_MIGRATION=1." >&2
      exit 64
    fi
    command -v psql >/dev/null || { echo "psql is required" >&2; exit 69; }
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$project_dir/backend/db/migration_003_governed_alliance.sql"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$project_dir/backend/db/migration_004_local_identity.sql"
    ;;
  start)
    require_runtime_env
    [[ -n "$BACKEND_PORT" ]] || { echo "BACKEND_PORT or PORT is required" >&2; exit 64; }
    [[ "$BACKEND_PORT" =~ ^[0-9]+$ ]] || { echo "runtime port must be numeric" >&2; exit 64; }
    if lsof -tiTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then echo "runtime port $BACKEND_PORT is occupied" >&2; exit 64; fi
    cd "$app_dir/backend"
    exec node server.js
    ;;
  *)
    echo "Usage: $0 {check|migrate|start}" >&2
    exit 64
    ;;
esac
