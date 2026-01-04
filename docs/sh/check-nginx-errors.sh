#!/bin/bash
# Check Nginx logs for "too many requests" and other errors

echo "=== Nginx Error Analysis ==="

echo ""
echo "1. Recent error log (last 50 lines):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo tail -50 /var/log/nginx/error.log
echo ""

echo "2. Searching for 'too many' errors:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo grep -i "too many" /var/log/nginx/error.log | tail -20
echo ""

echo "3. Searching for connection errors:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo grep -iE "connection|worker|limit" /var/log/nginx/error.log | tail -20
echo ""

echo "4. Recent access log (last 20 lines with status codes):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo tail -20 /var/log/nginx/access.log | awk '{print $1, $7, $9, $10}'
echo ""

echo "5. Status code summary (last 1000 requests):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo tail -1000 /var/log/nginx/access.log | awk '{print $9}' | sort | uniq -c | sort -rn
echo ""

echo "6. Current Nginx process info:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ps aux | grep nginx | grep -v grep
echo ""

echo "7. Current open files limit:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
NGINX_PID=$(ps aux | grep 'nginx: master' | grep -v grep | awk '{print $2}')
if [ -n "$NGINX_PID" ]; then
    echo "Nginx PID: $NGINX_PID"
    sudo cat /proc/$NGINX_PID/limits | grep "open files"
else
    echo "Nginx not running"
fi
