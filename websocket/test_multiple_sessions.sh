#!/bin/bash

# Test script for multiple WebSocket connections

SERVER="ubuntu-wrk-03-vm:3003"
USERNAME="testmulti"
PASSWORD="test123"

echo "=== Testing Multiple WebSocket Sessions ==="
echo ""

# 1. Register or login test user
echo "1. Creating test user..."
RESPONSE=$(curl -s -X POST "http://$SERVER/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

if echo "$RESPONSE" | grep -q "error"; then
    echo "   User exists, logging in..."
    RESPONSE=$(curl -s -X POST "http://$SERVER/login" \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
fi

SESSION1=$(echo "$RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
echo "   Session 1: ${SESSION1:0:16}..."

# 2. Create second session (simulate second browser tab)
echo ""
echo "2. Creating second session (simulating second tab)..."
RESPONSE=$(curl -s -X POST "http://$SERVER/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
SESSION2=$(echo "$RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
echo "   Session 2: ${SESSION2:0:16}..."

# 3. Create third session
echo ""
echo "3. Creating third session..."
RESPONSE=$(curl -s -X POST "http://$SERVER/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
SESSION3=$(echo "$RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
echo "   Session 3: ${SESSION3:0:16}..."

# 4. Check sessions in database
echo ""
echo "4. Checking sessions in database..."
sqlite3 /home/a0e394/testSwift/Hello/db.sqlite \
  "SELECT session_id, username, datetime(created_at, 'unixepoch') as created, datetime(expires_at, 'unixepoch') as expires FROM sessions WHERE username='$USERNAME' ORDER BY created_at DESC;"

# 5. Test logout of one session
echo ""
echo "5. Logging out session 2 (should not affect sessions 1 and 3)..."
curl -s -X POST "http://$SERVER/logout" \
  -H "X-Session-ID: $SESSION2" > /dev/null
echo "   Session 2 logged out"

# 6. Check remaining sessions
echo ""
echo "6. Checking remaining sessions..."
COUNT=$(sqlite3 /home/a0e394/testSwift/Hello/db.sqlite \
  "SELECT COUNT(*) FROM sessions WHERE username='$USERNAME';")
echo "   Remaining sessions for user '$USERNAME': $COUNT"

sqlite3 /home/a0e394/testSwift/Hello/db.sqlite \
  "SELECT substr(session_id, 1, 16) || '...' as session, datetime(created_at, 'unixepoch') as created FROM sessions WHERE username='$USERNAME' ORDER BY created_at DESC;"

# 7. Cleanup - logout remaining sessions
echo ""
echo "7. Cleanup - logging out remaining sessions..."
curl -s -X POST "http://$SERVER/logout" -H "X-Session-ID: $SESSION1" > /dev/null
curl -s -X POST "http://$SERVER/logout" -H "X-Session-ID: $SESSION3" > /dev/null
echo "   All sessions logged out"

echo ""
echo "=== Test Complete ==="
