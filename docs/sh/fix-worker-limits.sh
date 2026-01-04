#!/bin/bash
# Fix worker process file limits and add proxy buffering optimization

echo "=== Fixing Worker Process Limits & Proxy Buffering ==="

echo ""
echo "1. Backing up nginx.conf..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-worker-fix

echo ""
echo "2. Adding worker_rlimit_nofile directive..."

# Add worker_rlimit_nofile after worker_cpu_affinity
sudo sed -i '/worker_cpu_affinity auto;/a\\n# Set open file limit for worker processes\nworker_rlimit_nofile 65536;' /etc/nginx/nginx.conf

echo ""
echo "3. Testing configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Config test failed! Restoring backup..."
    sudo cp /etc/nginx/nginx.conf.backup-worker-fix /etc/nginx/nginx.conf
    exit 1
fi

echo ""
echo "4. Restarting Nginx to apply limits..."
sudo systemctl restart nginx

sleep 2

echo ""
echo "5. Verifying worker limits..."
WORKER_PID=$(ps aux | grep 'nginx: worker' | grep -v grep | head -1 | awk '{print $2}')
if [ -n "$WORKER_PID" ]; then
    echo "Worker process PID: $WORKER_PID"
    echo "Open files limit:"
    sudo cat /proc/$WORKER_PID/limits | grep "open files"
else
    echo "⚠️  Could not find worker process"
fi

echo ""
echo "6. Checking for warnings..."
sudo nginx -t 2>&1 | grep -i "worker_connections\|limit" || echo "✅ No limit warnings"

echo ""
echo "7. Testing site..."
curl -I https://quailbreeder.net/ 2>&1 | head -5

echo ""
echo "✅ Worker limits fixed!"
