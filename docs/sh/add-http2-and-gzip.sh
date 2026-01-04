#!/bin/bash
# Add HTTP/2 and Gzip compression

echo "=== Adding HTTP/2 and Gzip ==="

echo ""
echo "1. Backing up current config..."
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup-working

echo ""
echo "2. Checking Nginx version for HTTP/2 syntax..."
NGINX_VERSION=$(nginx -v 2>&1 | grep -oP 'nginx/\K[0-9.]+')
echo "Nginx version: $NGINX_VERSION"

echo ""
echo "3. Adding Gzip to main nginx.conf..."
if grep -q "gzip on" /etc/nginx/nginx.conf; then
    echo "Gzip already enabled"
else
    sed -i '/#gzip  on;/a\
\
    # Gzip compression\
    gzip on;\
    gzip_vary on;\
    gzip_proxied any;\
    gzip_comp_level 6;\
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;\
    gzip_disable "msie6";\
    gzip_min_length 256;' /etc/nginx/nginx.conf
    echo "Gzip added"
fi

echo ""
echo "4. Testing config..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "5. Reloading Nginx..."
    systemctl reload nginx
    sleep 1

    echo ""
    echo "6. Testing Gzip compression..."
    curl -H "Accept-Encoding: gzip" -I https://quailbreeder.net/ 2>&1 | grep -i "content-encoding"

    echo ""
    echo "7. Testing HTTPS connection..."
    curl -I https://quailbreeder.net/ 2>&1 | head -5

    echo ""
    echo "✅ Configuration updated successfully!"
else
    echo ""
    echo "❌ Config test failed - restoring backup"
    cp /etc/nginx/sites-available/default.backup-working /etc/nginx/sites-available/default
fi

echo ""
echo "=== DONE ==="
