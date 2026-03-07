#!/bin/bash
# WebSocket Server Monitor - watch system resources in real-time

echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║              WebSocket Server Real-time System Monitor                   ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get PID of WebSocketServer (exclude defunct processes)
PID=$(ps aux | grep "WebSocketServer" | grep -v grep | grep -v defunct | awk '{print $2}' | head -1)

if [ -z "$PID" ]; then
    echo -e "${RED}❌ WebSocketServer process not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ WebSocketServer PID: $PID${NC}"
echo ""

# Function to display server stats
show_stats() {
    clear
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║              WebSocket Server Real-time System Monitor                   ║"
    echo "║                     $(date '+%Y-%m-%d %H:%M:%S')                                      ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Process info
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📊 PROCESS INFORMATION${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    ps aux | grep -E "PID|$PID" | grep -v grep | awk 'NR==1 {print $0} NR==2 {printf "%-10s %-6s %5s%% %5s%% %8s %8s %-10s %s\n", $1, $2, $3, $4, $5, $6, $9, $11}'
    echo ""
    
    # CPU and Memory details
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}💻 RESOURCE USAGE${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Get detailed stats
    CPU=$(ps -p $PID -o %cpu= | xargs)
    MEM=$(ps -p $PID -o %mem= | xargs)
    RSS=$(ps -p $PID -o rss= | xargs)
    VSZ=$(ps -p $PID -o vsz= | xargs)
    THREADS=$(ps -p $PID -o nlwp= | xargs)
    
    RSS_MB=$(echo "scale=2; $RSS / 1024" | bc)
    VSZ_MB=$(echo "scale=2; $VSZ / 1024" | bc)
    
    echo -e "  CPU Usage:        ${GREEN}${CPU}%${NC}"
    echo -e "  Memory Usage:     ${GREEN}${MEM}%${NC}"
    echo -e "  Resident Memory:  ${GREEN}${RSS_MB} MB${NC} (${RSS} KB)"
    echo -e "  Virtual Memory:   ${GREEN}${VSZ_MB} MB${NC} (${VSZ} KB)"
    echo -e "  Thread Count:     ${GREEN}${THREADS}${NC}"
    echo ""
    
    # Network connections
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🌐 NETWORK CONNECTIONS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    ESTABLISHED=$(ss -tnp 2>/dev/null | grep -c "pid=$PID")
    LISTENING=$(ss -ltnp 2>/dev/null | grep -c "pid=$PID")
    
    echo -e "  Established:      ${GREEN}${ESTABLISHED}${NC}"
    echo -e "  Listening:        ${GREEN}${LISTENING}${NC}"
    echo ""
    
    # Show active connections on port 3003
    echo -e "${YELLOW}Active WebSocket Connections (port 3003):${NC}"
    ss -tnp 2>/dev/null | grep ":3003" | grep "pid=$PID" | head -10
    echo ""
    
    # Application stats from API
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📡 APPLICATION STATISTICS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    curl -s http://localhost:3003/server-stats
    echo ""
    
    # File descriptors
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📂 FILE DESCRIPTORS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    FD_COUNT=$(ls -l /proc/$PID/fd 2>/dev/null | wc -l)
    echo -e "  Open File Descriptors: ${GREEN}${FD_COUNT}${NC}"
    echo ""
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit | Refreshing every 2 seconds...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Main loop
if [ "$1" == "--once" ]; then
    show_stats
else
    while true; do
        show_stats
        sleep 2
    done
fi
