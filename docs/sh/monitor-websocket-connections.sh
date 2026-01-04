#!/bin/bash
# Monitor WebSocket connections in real-time

echo "=== WebSocket Connection Monitor ==="
echo "Press Ctrl+C to stop"
echo ""

watch -n 1 'echo "=== Active Connections to Backends ==="; \
echo ""; \
echo "Next.js (3000):"; \
sudo ss -tn | grep ":3000" | grep ESTAB | wc -l; \
echo ""; \
echo "App WebSocket (3001):"; \
sudo ss -tn | grep ":3001" | grep ESTAB | wc -l; \
echo ""; \
echo "WS WebSocket (3003):"; \
sudo ss -tn | grep ":3003" | grep ESTAB | wc -l; \
echo ""; \
echo "Total:"; \
sudo ss -tn | grep -E ":(3000|3001|3003)" | grep ESTAB | wc -l; \
echo ""; \
echo "=== Nginx Connections ==="; \
echo "Port 443 (HTTPS):"; \
sudo ss -tn | grep ":443" | grep ESTAB | wc -l; \
echo ""; \
echo "=== System Load ==="; \
uptime'
