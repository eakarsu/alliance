#!/usr/bin/env bash
set -euo pipefail

# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
if [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
else
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD
fi
unset demo_credentials_email demo_credentials_password demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

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
  npm --prefix "$project_dir/backend" run provision-demo-users
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
