#!/bin/bash

NOW=$(date +%s)
echo "Current timestamp: $NOW"
echo ""

active_count=0
stale_count=0
missing_count=0

for sid in $(redis-cli SMEMBERS "username:feldinfo"); do
    echo "Session: $sid"
    data=$(redis-cli GET "session:$sid")

    if [ -n "$data" ]; then
        last_activity=$(echo "$data" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('last_activity', 'N/A'))")
        echo "  last_activity: $last_activity"

        if [ "$last_activity" != "N/A" ]; then
            age=$((NOW - ${last_activity%.*}))
            minutes=$(echo "scale=1; $age/60" | bc)
            echo "  age: ${age}s (${minutes} min)"

            if [ $age -lt 120 ]; then
                echo "  ✅ ACTIVE (< 2min)"
                active_count=$((active_count + 1))
            else
                echo "  ❌ STALE (> 2min)"
                stale_count=$((stale_count + 1))
            fi
        fi
    else
        echo "  ❌ Session does not exist"
        missing_count=$((missing_count + 1))
    fi
    echo ""
done

echo "=============================="
echo "Summary:"
echo "  Active sessions: $active_count"
echo "  Stale sessions: $stale_count"
echo "  Missing sessions: $missing_count"
