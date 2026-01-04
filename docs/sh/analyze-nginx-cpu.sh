#!/bin/bash
# Analyze Nginx CPU usage increase

echo "=== Analyzing Nginx CPU Usage ==="

echo ""
echo "1. Current Nginx processes and CPU usage..."
ps aux | grep nginx | grep -v grep | awk '{printf "%-10s %5s %5s %10s %s\n", $1, $3, $4, $2, $11}'
echo ""

echo "2. Worker process details..."
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu | grep nginx | grep -v grep | head -5

echo ""
echo "3. Total connections being handled..."
echo "Port 443 (HTTPS):"
sudo ss -tn | grep ":443" | grep ESTAB | wc -l
echo "Port 3000 (Next.js):"
sudo ss -tn | grep ":3000" | grep ESTAB | wc -l
echo "Port 3003 (WebSocket):"
sudo ss -tn | grep ":3003" | grep ESTAB | wc -l
echo "Port 3001 (App):"
sudo ss -tn | grep ":3001" | grep ESTAB | wc -l

echo ""
echo "4. System load..."
uptime

echo ""
echo "5. Nginx worker_connections setting..."
grep worker_connections /etc/nginx/nginx.conf

echo ""
echo "6. Active Nginx connections..."
curl -s http://localhost/nginx_status 2>/dev/null || echo "stub_status not enabled"

echo ""
echo "7. Recent activity in access log (requests per second)..."
sudo tail -1000 /var/log/nginx/access.log | awk '{print $4}' | cut -d: -f1-3 | sort | uniq -c | tail -10

echo ""
echo "=== Potential Causes of CPU Increase ==="
echo ""
echo "1. Rate Limiting Processing:"
echo "   - limit_req zone=general (10 req/s)"
echo "   - limit_req zone=static (50 req/s)"
echo "   - Each request checked against limit = CPU overhead"
echo ""
echo "2. Connection Limit Tracking:"
echo "   - limit_conn addr 1000 on /ws/ and /app/"
echo "   - Nginx tracking 480+ connections per IP = memory + CPU"
echo ""
echo "3. Increased Worker Connections:"
echo "   - 1024 → 16384 worker_connections"
echo "   - More memory per worker = potential CPU for management"
echo ""
echo "4. Proxy Buffering:"
echo "   - 8 × 512KB buffers = 4MB per request"
echo "   - More memory operations = CPU"
echo ""
echo "5. AIO Threads:"
echo "   - thread_pool with async I/O enabled"
echo "   - Thread context switching overhead"
echo ""
echo "6. High Connection Count:"
echo "   - 480+ WebSocket connections on port 3003"
echo "   - Each connection monitored for timeouts/keepalive"
echo ""
echo "=== Recommendations ==="
echo ""
echo "If CPU is too high, consider:"
echo "  1. Remove rate limiting from paths that don't need it"
echo "  2. Reduce proxy buffer sizes if not needed"
echo "  3. Increase worker_processes (currently: auto)"
echo "  4. Disable AIO threads if files are small"
echo "  5. Check if backend (3003) is slow - causing Nginx to wait"
echo ""
