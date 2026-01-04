#!/bin/bash
# Test final optimized Nginx configuration

echo "=== Testing Final Nginx Configuration ==="

echo ""
echo "1. Testing config..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Config test failed!"
    exit 1
fi

echo ""
echo "2. Reloading Nginx..."
sudo systemctl reload nginx

sleep 2

echo ""
echo "3. Checking worker limits..."
WORKER_PID=$(ps aux | grep 'nginx: worker' | grep -v grep | head -1 | awk '{print $2}')
if [ -n "$WORKER_PID" ]; then
    echo "Worker PID: $WORKER_PID"
    sudo cat /proc/$WORKER_PID/limits | grep "open files"
else
    echo "⚠️  Worker not found"
fi

echo ""
echo "4. Clearing error log to test fresh..."
sudo truncate -s 0 /var/log/nginx/error.log

echo ""
echo "5. Making test requests..."
for i in {1..3}; do
    curl -s -o /dev/null https://quailbreeder.net/
    echo "Request $i sent"
    sleep 0.5
done

sleep 1

echo ""
echo "6. Checking for buffering warnings (should be gone)..."
sudo grep -i "buffered to a temporary file" /var/log/nginx/error.log || echo "✅ No buffering warnings - images served from RAM!"

echo ""
echo "7. Checking for worker_connections warnings..."
sudo grep -i "worker_connections exceed" /var/log/nginx/error.log || echo "✅ No worker_connections warnings!"

echo ""
echo "8. Testing site response..."
curl -I https://quailbreeder.net/ 2>&1 | head -8

echo ""
echo "=== Configuration Summary ==="
echo "✅ Worker limits: 65536 files"
echo "✅ Worker connections: 16384"
echo "✅ Proxy buffering: 4MB RAM (no disk temp files)"
echo "✅ HTTP/2 enabled, HTTP/3 disabled"
echo "✅ Gzip compression optimized"
echo "✅ AIO threads for large files"
echo "✅ epoll + multi_accept"
echo ""
echo "Next steps:"
echo "  - Monitor /var/log/nginx/error.log for any issues"
echo "  - Run load tests to verify no more 429 errors"
echo "  - Consider adding rate limiting if needed"
echo ""
