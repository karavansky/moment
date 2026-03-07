#!/bin/bash
# Stress test for WebSocket server using multiple processes

TOTAL_CONNECTIONS=${1:-100}
SERVER="ubuntu-wrk-03-vm:3003"
USERNAME="stresstest"
PASSWORD="test123"

echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║              WebSocket Stress Test (Backend Script)                      ║"
echo "╠═══════════════════════════════════════════════════════════════════════════╣"
echo "║ Target: $TOTAL_CONNECTIONS concurrent WebSocket connections                        ║"
echo "║ Server: $SERVER                                              ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Register user
echo "📝 Registering user '$USERNAME'..."
REGISTER_RESULT=$(curl -s -X POST "http://$SERVER/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

if echo "$REGISTER_RESULT" | grep -q "sessionId"; then
    echo "✅ User registered successfully"
elif echo "$REGISTER_RESULT" | grep -q "409"; then
    echo "ℹ️  User already exists, proceeding with login"
else
    echo "❌ Registration failed: $REGISTER_RESULT"
fi

echo ""
echo "🚀 Creating $TOTAL_CONNECTIONS sessions..."
echo ""

# Arrays to store session IDs
declare -a SESSION_IDS
CREATED=0
FAILED=0

# Create sessions
for i in $(seq 1 $TOTAL_CONNECTIONS); do
    RESULT=$(curl -s -X POST "http://$SERVER/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
    
    SESSION_ID=$(echo "$RESULT" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$SESSION_ID" ]; then
        SESSION_IDS+=("$SESSION_ID")
        CREATED=$((CREATED + 1))
        if [ $((CREATED % 50)) -eq 0 ]; then
            echo "  ✓ Created $CREATED sessions..."
        fi
    else
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "✅ Session creation complete:"
echo "   - Created: $CREATED"
echo "   - Failed: $FAILED"
echo ""

# Show current server stats
echo "📊 Current server statistics:"
curl -s "http://$SERVER/server-stats"
echo ""

# Cleanup option
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "🗑️  Cleanup all sessions? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🧹 Cleaning up sessions..."
    CLEANED=0
    
    for SESSION_ID in "${SESSION_IDS[@]}"; do
        curl -s -X POST "http://$SERVER/logout" \
            -H "X-Session-ID: $SESSION_ID" > /dev/null
        CLEANED=$((CLEANED + 1))
        if [ $((CLEANED % 50)) -eq 0 ]; then
            echo "  ✓ Logged out $CLEANED sessions..."
        fi
    done
    
    echo ""
    echo "✅ Cleanup complete: $CLEANED sessions logged out"
    echo ""
    echo "📊 Server statistics after cleanup:"
    curl -s "http://$SERVER/server-stats"
else
    echo ""
    echo "ℹ️  Sessions remain active. They will expire in 24 hours."
    echo "   To manually cleanup: DELETE FROM sessions WHERE username='$USERNAME'"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                          Test Complete                                    ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
