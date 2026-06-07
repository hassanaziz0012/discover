#!/usr/bin/env bash

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=========================================================${NC}"
echo -e "${CYAN}          DISCOVER FULLSTACK DEV ENVIRONMENT             ${NC}"
echo -e "${CYAN}=========================================================${NC}"

# Define ports
FRONTEND_PORT=3000
BACKEND_PORT=8000

# Helper to check if a port is in use
is_port_in_use() {
    local port=$1
    # Try using bash's built-in /dev/tcp
    if (echo > /dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1; then
        return 0 # In use
    fi
    # Fallback to ss
    if command -v ss >/dev/null 2>&1; then
        if ss -tuln | grep -q -E ":$port\b"; then
            return 0
        fi
    fi
    # Fallback to lsof
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i :"$port" >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1 # Free
}

# Check port conflicts
echo -e "${BLUE}[System] Checking port conflicts...${NC}"
FRONTEND_IN_USE=false
BACKEND_IN_USE=false

if is_port_in_use $FRONTEND_PORT; then
    FRONTEND_IN_USE=true
    echo -e "${RED}[Warning] Port $FRONTEND_PORT (NextJS) is already in use!${NC}"
fi

if is_port_in_use $BACKEND_PORT; then
    BACKEND_IN_USE=true
    echo -e "${RED}[Warning] Port $BACKEND_PORT (FastAPI) is already in use!${NC}"
fi

if [ "$FRONTEND_IN_USE" = true ] || [ "$BACKEND_IN_USE" = true ]; then
    echo -e "${RED}[Error] Cannot start services due to port conflicts. Please free up the ports and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}[System] Ports are clear. Detecting runners...${NC}"

# Detect Frontend Runner (Bun preferred, fallback to npm)
FRONTEND_CMD=""
if command -v bun >/dev/null 2>&1; then
    FRONTEND_CMD="bun dev"
    echo -e "${GREEN}[System] Frontend: Using Bun (${FRONTEND_CMD})${NC}"
elif command -v npm >/dev/null 2>&1; then
    FRONTEND_CMD="npm run dev"
    echo -e "${GREEN}[System] Frontend: Using npm (${FRONTEND_CMD})${NC}"
else
    echo -e "${RED}[Error] Neither bun nor npm detected. Cannot start frontend.${NC}"
    exit 1
fi

# Detect Backend Runner (uv preferred, fallback to virtualenv uvicorn, then global uvicorn)
BACKEND_CMD=""
if command -v uv >/dev/null 2>&1; then
    BACKEND_CMD="uv run uvicorn main:app --reload"
    echo -e "${GREEN}[System] Backend:  Using uv (${BACKEND_CMD})${NC}"
elif [ -f "discover_api/.venv/bin/uvicorn" ]; then
    BACKEND_CMD="./.venv/bin/uvicorn main:app --reload"
    echo -e "${GREEN}[System] Backend:  Using virtualenv uvicorn (${BACKEND_CMD})${NC}"
elif command -v uvicorn >/dev/null 2>&1; then
    BACKEND_CMD="uvicorn main:app --reload"
    echo -e "${GREEN}[System] Backend:  Using global uvicorn (${BACKEND_CMD})${NC}"
else
    echo -e "${RED}[Error] No uvicorn/uv environment detected. Please set up the python environment in discover_api.${NC}"
    exit 1
fi

echo -e "${CYAN}=========================================================${NC}"
echo -e "${YELLOW}Starting servers. Press Ctrl+C to stop both units.${NC}"
echo -e "${CYAN}=========================================================${NC}"

# Prefix functions for logs
prefix_frontend() {
    while IFS= read -r line; do
        printf "${GREEN}[Frontend]${NC} %s\n" "$line"
    done
}

prefix_backend() {
    while IFS= read -r line; do
        printf "${BLUE}[Backend]${NC}  %s\n" "$line"
    done
}

# Cleanup on exit
FRONTEND_PID=""
BACKEND_PID=""

cleanup() {
    # Disable trap to avoid recursive triggers
    trap - INT TERM EXIT
    echo -e "\n${YELLOW}[System] Shutting down services cleanly...${NC}"
    
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${YELLOW}[System] Stopping NextJS (PID: $FRONTEND_PID)...${NC}"
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${YELLOW}[System] Stopping FastAPI (PID: $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    
    # Wait briefly for processes to terminate
    wait "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    
    echo -e "${GREEN}[System] All services stopped cleanly. Goodbye!${NC}"
    exit 0
}

# Set up the trap for Ctrl+C and script exit
trap cleanup INT TERM EXIT

# Start NextJS Frontend
cd discover
$FRONTEND_CMD > >(prefix_frontend) 2>&1 &
FRONTEND_PID=$!
cd ..

# Start FastAPI Backend
cd discover_api
$BACKEND_CMD > >(prefix_backend) 2>&1 &
BACKEND_PID=$!
cd ..

# Keep script running and wait for background jobs to finish
wait
