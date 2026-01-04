#!/bin/bash
# Watch Nginx logs in real-time

echo "=== Watching Nginx Logs (Ctrl+C to stop) ==="
echo ""
echo "Now refresh https://quailbreeder.net/ in your browser..."
echo ""

tail -f /var/log/nginx/error.log /var/log/nginx/access.log
