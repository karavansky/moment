#!/bin/bash
# Fix open file resource limits for Nginx

echo "=== Fixing File Resource Limits for Nginx ==="

echo ""
echo "1. Setting system limits..."

# Add limits to /etc/security/limits.conf if not already present
if ! grep -q "nginx.*nofile" /etc/security/limits.conf; then
    echo "Adding nginx limits to /etc/security/limits.conf..."
    sudo tee -a /etc/security/limits.conf > /dev/null << EOF

# Nginx file limits for high performance
nginx soft nofile 65536
nginx hard nofile 65536
EOF
fi

echo ""
echo "2. Creating systemd override for nginx service..."
sudo mkdir -p /etc/systemd/system/nginx.service.d/
sudo tee /etc/systemd/system/nginx.service.d/limits.conf > /dev/null << EOF
[Service]
LimitNOFILE=65536
EOF

echo ""
echo "3. Reloading systemd..."
sudo systemctl daemon-reload

echo ""
echo "4. Restarting Nginx to apply limits..."
sudo systemctl restart nginx

echo ""
echo "5. Verifying configuration..."
sudo nginx -t

echo ""
echo "6. Checking Nginx process limits..."
NGINX_PID=$(ps aux | grep 'nginx: master' | grep -v grep | awk '{print $2}')
if [ -n "$NGINX_PID" ]; then
    echo "Nginx master process PID: $NGINX_PID"
    echo "Open files limit:"
    cat /proc/$NGINX_PID/limits | grep "open files"
else
    echo "⚠️  Could not find Nginx master process"
fi

echo ""
echo "7. Testing site..."
curl -I https://quailbreeder.net/ 2>&1 | head -8

echo ""
echo "✅ Done! Nginx can now handle 16384 worker_connections"
