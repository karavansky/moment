#!/bin/bash

SESSION_ID="4JXDlM34FqdU5r7ff58Jxg"

echo "Testing last_activity updates for session $SESSION_ID"
echo "================================================"

OLD_ACTIVITY=$(redis-cli GET "session:$SESSION_ID" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['last_activity'])")
echo "Before: $OLD_ACTIVITY"

echo "Waiting 25 seconds for ping/pong..."
sleep 25

NEW_ACTIVITY=$(redis-cli GET "session:$SESSION_ID" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['last_activity'])")
echo "After:  $NEW_ACTIVITY"

DIFF=$(echo "$NEW_ACTIVITY - $OLD_ACTIVITY" | bc)
echo "Difference: $DIFF seconds"

if (( $(echo "$DIFF > 0" | bc -l) )); then
    echo "✅ last_activity IS being updated!"
else
    echo "❌ last_activity NOT updated - ping/pong may not be working"
fi
