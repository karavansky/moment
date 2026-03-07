#!/bin/bash
# Development helper script for Vapor WebSocket Server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

function build_debug() {
    print_header "Building Debug"
    swift build
    echo -e "${GREEN}✓ Debug build complete${NC}"
}

function build_release() {
    print_header "Building Release"
    swift build -c release
    echo -e "${GREEN}✓ Release build complete${NC}"
}

function restart_service() {
    print_header "Restarting Vapor Service"
    sudo systemctl restart vapor-chat.service
    sleep 2
    sudo systemctl status vapor-chat.service --no-pager
    echo -e "${GREEN}✓ Service restarted${NC}"
}

function view_logs() {
    print_header "Viewing Server Logs (Ctrl+C to exit)"
    sudo journalctl -u vapor-chat.service -f
}

function server_status() {
    print_header "Server Status"
    sudo systemctl status vapor-chat.service --no-pager
}

function test_register() {
    print_header "Testing User Registration"
    local username="test_${RANDOM}"
    echo -e "${YELLOW}Creating user: ${username}${NC}"

    response=$(curl -s -X POST http://localhost:3003/register \
        -H 'Content-Type: application/json' \
        -d "{\"username\":\"${username}\",\"password\":\"test123\"}")

    echo "$response" | jq .

    session_id=$(echo "$response" | jq -r '.sessionId')
    length=${#session_id}

    echo -e "${GREEN}✓ SessionId: ${session_id}${NC}"
    echo -e "${GREEN}✓ Length: ${length} characters${NC}"
}

function view_sessions() {
    print_header "Recent Sessions"
    sqlite3 db.sqlite "SELECT username, session_id, LENGTH(session_id) as len, datetime(created_at, 'unixepoch') as created FROM sessions ORDER BY created_at DESC LIMIT 10"
}

function clean_old_sessions() {
    print_header "Cleaning Old Sessions"
    result=$(sqlite3 db.sqlite "DELETE FROM sessions WHERE LENGTH(session_id) != 22; SELECT changes();")
    echo -e "${GREEN}✓ Deleted ${result} old sessions${NC}"
}

function full_deploy() {
    print_header "Full Build and Deploy"
    build_release
    restart_service
    echo -e "${GREEN}✓ Deploy complete!${NC}"
}

function server_stats() {
    print_header "Server Statistics"
    curl -s http://localhost:3003/server-stats
}

function help_menu() {
    echo -e "${BLUE}Vapor WebSocket Server - Development Helper${NC}"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  ${GREEN}build${NC}          - Build debug version"
    echo "  ${GREEN}release${NC}        - Build release version"
    echo "  ${GREEN}restart${NC}        - Restart systemd service"
    echo "  ${GREEN}logs${NC}           - View server logs (live)"
    echo "  ${GREEN}status${NC}         - Show server status"
    echo "  ${GREEN}test${NC}           - Test user registration"
    echo "  ${GREEN}sessions${NC}       - View recent sessions"
    echo "  ${GREEN}clean${NC}          - Clean old sessions"
    echo "  ${GREEN}deploy${NC}         - Full build and deploy"
    echo "  ${GREEN}stats${NC}          - Show server statistics"
    echo "  ${GREEN}help${NC}           - Show this help"
    echo ""
    echo "Examples:"
    echo "  ${YELLOW}./dev.sh deploy${NC}      - Build release and restart"
    echo "  ${YELLOW}./dev.sh test${NC}        - Quick registration test"
    echo "  ${YELLOW}./dev.sh logs${NC}        - Monitor server logs"
}

# Main
case "$1" in
    build)
        build_debug
        ;;
    release)
        build_release
        ;;
    restart)
        restart_service
        ;;
    logs)
        view_logs
        ;;
    status)
        server_status
        ;;
    test)
        test_register
        ;;
    sessions)
        view_sessions
        ;;
    clean)
        clean_old_sessions
        ;;
    deploy)
        full_deploy
        ;;
    stats)
        server_stats
        ;;
    help|--help|-h|"")
        help_menu
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run './dev.sh help' for available commands"
        exit 1
        ;;
esac
