#!/bin/bash

# ============================================
# Alliance CRM - Start Script
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${CYAN}${BOLD}============================================${NC}"
echo -e "${CYAN}${BOLD}   Alliance CRM - Starting Application${NC}"
echo -e "${CYAN}${BOLD}============================================${NC}"
echo ""

# ============================================
# Step 1: Clean up used ports
# ============================================
echo -e "${YELLOW}[1/6] Cleaning up ports 3000 and 3001...${NC}"

cleanup_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "  ${RED}Killing processes on port $port: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    else
        echo -e "  ${GREEN}Port $port is free${NC}"
    fi
}

cleanup_port 3000
cleanup_port 3001

# ============================================
# Step 2: Load environment variables
# ============================================
echo -e "${YELLOW}[2/6] Loading environment variables...${NC}"

if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found at project root${NC}"
    exit 1
fi

# Load env vars safely
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=alliance_crm
export DB_USER=alliance_user
export DB_PASSWORD=alliance_pass
export BACKEND_PORT=3001
export FRONTEND_PORT=3000
export JWT_SECRET=alliance-crm-secret-key-2024-very-secure

# Source any overrides from .env
while IFS='=' read -r key value; do
    key=$(echo "$key" | xargs)
    if [[ -n "$key" && ! "$key" =~ ^# ]]; then
        value=$(echo "$value" | xargs | sed 's/^"//' | sed 's/"$//')
        export "$key=$value"
    fi
done < .env

echo -e "  ${GREEN}Environment loaded${NC}"

# ============================================
# Step 3: Check PostgreSQL and setup database
# ============================================
echo -e "${YELLOW}[3/6] Setting up PostgreSQL database...${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql not found. Please install PostgreSQL.${NC}"
    exit 1
fi

if ! pg_isready &> /dev/null; then
    echo -e "  ${YELLOW}PostgreSQL is not running. Attempting to start...${NC}"
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
        sleep 2
    fi
    if ! pg_isready &> /dev/null; then
        echo -e "${RED}Error: Cannot connect to PostgreSQL. Please start it manually.${NC}"
        exit 1
    fi
fi
echo -e "  ${GREEN}PostgreSQL is running${NC}"

# Create user if not exists
CURRENT_USER=$(whoami)
USER_EXISTS=$(psql -U "$CURRENT_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null || echo "0")
if [ "$USER_EXISTS" != "1" ]; then
    psql -U "$CURRENT_USER" -d postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEDB;" 2>/dev/null
    echo -e "  ${GREEN}Database user '${DB_USER}' created${NC}"
else
    echo -e "  ${GREEN}Database user '${DB_USER}' already exists${NC}"
fi

# Drop and recreate database for clean state
psql -U "$CURRENT_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null
psql -U "$CURRENT_USER" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null
echo -e "  ${GREEN}Database '${DB_NAME}' created${NC}"

# ============================================
# Step 4: Run schema and seed data
# ============================================
echo -e "${YELLOW}[4/6] Running schema and seeding data...${NC}"

PGPASSWORD=${DB_PASSWORD} psql -U ${DB_USER} -d ${DB_NAME} -f backend/db/schema.sql -q 2>&1 | grep -i error || true
echo -e "  ${GREEN}Schema created successfully${NC}"

PGPASSWORD=${DB_PASSWORD} psql -U ${DB_USER} -d ${DB_NAME} -f backend/db/seed.sql -q 2>&1 | grep -i error || true
echo -e "  ${GREEN}Seed data inserted successfully${NC}"

# Show counts
echo -e "  ${CYAN}Database summary:${NC}"
PGPASSWORD=${DB_PASSWORD} psql -U ${DB_USER} -d ${DB_NAME} -t -c "
SELECT '    Users: ' || count(*) FROM users
UNION ALL SELECT '    Organizations: ' || count(*) FROM organizations
UNION ALL SELECT '    Contacts: ' || count(*) FROM contacts
UNION ALL SELECT '    Leads: ' || count(*) FROM leads
UNION ALL SELECT '    Opportunities: ' || count(*) FROM opportunities
UNION ALL SELECT '    Products: ' || count(*) FROM products
UNION ALL SELECT '    Projects: ' || count(*) FROM projects
UNION ALL SELECT '    Partners: ' || count(*) FROM partner_entities
UNION ALL SELECT '    Agreements: ' || count(*) FROM agreements
UNION ALL SELECT '    Activities: ' || count(*) FROM activities
UNION ALL SELECT '    Risks: ' || count(*) FROM risks
UNION ALL SELECT '    Proposals: ' || count(*) FROM proposals
UNION ALL SELECT '    KPI Contributions: ' || count(*) FROM kpi_contributions;
" 2>/dev/null

# ============================================
# Step 5: Install dependencies
# ============================================
echo -e "${YELLOW}[5/6] Installing dependencies...${NC}"

cd "$SCRIPT_DIR/backend"
if [ ! -d node_modules ]; then
    npm install 2>&1 | tail -1
    echo -e "  ${GREEN}Backend dependencies installed${NC}"
else
    echo -e "  ${GREEN}Backend dependencies already installed${NC}"
fi

cd "$SCRIPT_DIR/frontend"
if [ ! -d node_modules ]; then
    npm install 2>&1 | tail -1
    echo -e "  ${GREEN}Frontend dependencies installed${NC}"
else
    echo -e "  ${GREEN}Frontend dependencies already installed${NC}"
fi

cd "$SCRIPT_DIR"

# ============================================
# Step 6: Start services with hot reload
# ============================================
echo -e "${YELLOW}[6/6] Starting services with hot reload...${NC}"
echo ""

mkdir -p "$SCRIPT_DIR/logs"

# Start backend with nodemon (hot reload)
echo -e "${BLUE}Starting backend on port ${BACKEND_PORT} (with nodemon hot reload)...${NC}"
cd "$SCRIPT_DIR/backend"
npx nodemon server.js > "$SCRIPT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo -e "  ${GREEN}Backend started (PID: $BACKEND_PID)${NC}"

# Start frontend with vite (hot reload built-in)
echo -e "${BLUE}Starting frontend on port ${FRONTEND_PORT} (with Vite HMR)...${NC}"
cd "$SCRIPT_DIR/frontend"
npx vite --host > "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "  ${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"

cd "$SCRIPT_DIR"

# Wait for services to be ready
echo ""
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 3

for i in {1..15}; do
    if curl -s http://localhost:${BACKEND_PORT}/api/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}Backend is ready!${NC}"
        break
    fi
    [ $i -eq 15 ] && echo -e "  ${YELLOW}Backend may still be starting... check logs/backend.log${NC}"
    sleep 1
done

for i in {1..15}; do
    if curl -s http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
        echo -e "  ${GREEN}Frontend is ready!${NC}"
        break
    fi
    [ $i -eq 15 ] && echo -e "  ${YELLOW}Frontend may still be starting... check logs/frontend.log${NC}"
    sleep 1
done

echo ""
echo -e "${CYAN}${BOLD}============================================${NC}"
echo -e "${CYAN}${BOLD}   Alliance CRM is running!${NC}"
echo -e "${CYAN}${BOLD}============================================${NC}"
echo ""
echo -e "${GREEN}  Frontend:  ${BOLD}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "${GREEN}  Backend:   ${BOLD}http://localhost:${BACKEND_PORT}${NC}"
echo -e "${GREEN}  API Health: ${BOLD}http://localhost:${BACKEND_PORT}/api/health${NC}"
echo ""
echo -e "${CYAN}  Login credentials (all use password: alliance123):${NC}"
echo -e "  ${BOLD}erol@alliance.com${NC}    - Super Admin / Founding Orchestrator"
echo -e "  ${BOLD}ayse@alliance.com${NC}    - Partner Owner / Business Builder"
echo -e "  ${BOLD}mehmet@alliance.com${NC}  - Solution Architect / Technical Partner"
echo -e "  ${BOLD}fatma@alliance.com${NC}   - Channel / Referral Partner"
echo -e "  ${BOLD}ali@alliance.com${NC}     - Delivery Manager / PMO"
echo -e "  ${BOLD}zeynep@alliance.com${NC}  - Restricted External / Advisor"
echo ""
echo -e "${YELLOW}  Hot reload is enabled:${NC}"
echo -e "  - Backend: nodemon watches for file changes"
echo -e "  - Frontend: Vite HMR for instant updates"
echo ""
echo -e "${YELLOW}  Logs:${NC}"
echo -e "  - Backend:  logs/backend.log"
echo -e "  - Frontend: logs/frontend.log"
echo ""
echo -e "${YELLOW}  Press Ctrl+C to stop all services${NC}"
echo ""

# Trap Ctrl+C to cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down Alliance CRM...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    cleanup_port 3000
    cleanup_port 3001
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running and show logs
tail -f "$SCRIPT_DIR/logs/backend.log" "$SCRIPT_DIR/logs/frontend.log" 2>/dev/null &
TAIL_PID=$!

wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
kill $TAIL_PID 2>/dev/null || true
