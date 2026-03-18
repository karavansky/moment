#!/bin/bash

echo "🧪 Testing GPS Batching Optimizations"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Test Plan:${NC}"
echo "1. Monitor vapor-api logs for GPS updates"
echo "2. Check batching behavior (5 points or 10 seconds)"
echo "3. Verify OSRM cache hits"
echo "4. Count log lines (should be ~1 per batch)"
echo ""

# Start monitoring vapor-api logs in background
echo -e "${YELLOW}🔍 Starting log monitoring...${NC}"
echo "   (Monitoring vapor-api for GPS/OSRM messages)"
echo ""

# Create a temp file for logs
LOGFILE="/tmp/vapor-gps-test-$(date +%s).log"
docker logs -f vapor-api 2>&1 | grep -E "\[GPS|\[OSRM" > "$LOGFILE" &
MONITOR_PID=$!

echo -e "${GREEN}✅ Log monitoring started (PID: $MONITOR_PID)${NC}"
echo "   Log file: $LOGFILE"
echo ""
echo "📍 Instructions:"
echo "1. Open browser to driver page"
echo "2. Start test route (69 points, 2-second interval)"
echo "3. Wait for route to complete (~2-3 minutes)"
echo "4. Press ENTER when done"
echo ""
read -p "Press ENTER when test route is complete..."

# Stop monitoring
kill $MONITOR_PID 2>/dev/null

echo ""
echo -e "${BLUE}📊 Analysis Results:${NC}"
echo "==================="
echo ""

# Count GPS update log lines
GPS_LOGS=$(grep -c "\[GPS" "$LOGFILE" 2>/dev/null || echo "0")
OSRM_LOGS=$(grep -c "\[OSRM" "$LOGFILE" 2>/dev/null || echo "0")
CACHE_HITS=$(grep -c "Cache hit" "$LOGFILE" 2>/dev/null || echo "0")
BATCH_LOGS=$(grep -c "GPS Batch" "$LOGFILE" 2>/dev/null || echo "0")

echo "1. GPS Update Logs: $GPS_LOGS"
echo "   Expected: ~14 (69 points ÷ 5 batch size)"
if [ "$GPS_LOGS" -lt 20 ]; then
    echo -e "   ${GREEN}✅ PASS - Batching working (reduced from 69)${NC}"
else
    echo -e "   ${RED}❌ FAIL - Too many logs, batching may not be working${NC}"
fi
echo ""

echo "2. Batch Operations: $BATCH_LOGS"
if [ "$BATCH_LOGS" -gt 0 ]; then
    echo -e "   ${GREEN}✅ PASS - Batch endpoint being used${NC}"
else
    echo -e "   ${YELLOW}⚠️  WARN - No batch operations detected${NC}"
fi
echo ""

echo "3. OSRM Cache Hits: $CACHE_HITS"
if [ "$CACHE_HITS" -gt 0 ]; then
    CACHE_RATIO=$((CACHE_HITS * 100 / GPS_LOGS))
    echo -e "   ${GREEN}✅ PASS - Cache hit ratio: ${CACHE_RATIO}%${NC}"
else
    echo -e "   ${YELLOW}⚠️  WARN - No cache hits detected (may be first run)${NC}"
fi
echo ""

echo "4. Total OSRM Logs: $OSRM_LOGS"
echo ""

# Show sample logs
echo -e "${BLUE}📝 Sample Log Output:${NC}"
echo "--------------------"
head -20 "$LOGFILE"
if [ $(wc -l < "$LOGFILE") -gt 20 ]; then
    echo "..."
    tail -10 "$LOGFILE"
fi
echo ""

# Cleanup option
read -p "Delete log file? (y/n): " DELETE_LOG
if [ "$DELETE_LOG" = "y" ]; then
    rm -f "$LOGFILE"
    echo "✅ Log file deleted"
else
    echo "📄 Log file saved: $LOGFILE"
fi

echo ""
echo -e "${GREEN}🎉 Test complete!${NC}"
