#!/bin/bash
# Apply Next.js optimized Nginx configuration

echo "=== Applying Next.js Optimized Nginx Configuration ==="

echo ""
echo "1. Backing up current config..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)

echo ""
echo "2. Applying optimized config..."
sudo cp /home/hronop/node/quailbreeder/nginx.conf.optimized /etc/nginx/nginx.conf

echo ""
echo "3. Testing configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Config test failed! Restoring backup..."
    sudo cp /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S) /etc/nginx/nginx.conf
    echo "Backup restored. Check errors above."
    exit 1
fi

echo ""
echo "4. Reloading Nginx..."
sudo systemctl reload nginx

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Nginx optimizations applied successfully!"
    echo ""
    echo "New optimizations:"
    echo "  - worker_connections: 1024 → 16384"
    echo "  - epoll event processing (Linux optimized)"
    echo "  - multi_accept enabled"
    echo "  - Async file I/O with thread pool"
    echo "  - directio for files ≥6MB"
    echo "  - tcp_nopush + tcp_nodelay enabled"
    echo "  - reset_timedout_connection enabled"
    echo "  - client_max_body_size: 250MB"
    echo "  - Enhanced gzip with more MIME types"
    echo ""
    echo "Testing site..."
    curl -I https://quailbreeder.net/ 2>&1 | head -8
else
    echo ""
    echo "❌ Reload failed!"
    exit 1
fi
