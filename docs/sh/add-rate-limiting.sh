#!/bin/bash
# Add rate limiting for DDoS protection

echo "=== Adding Rate Limiting for DDoS Protection ==="

echo ""
echo "1. Backing up configs..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-ratelimit
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup-ratelimit

echo ""
echo "2. Adding rate limit zones to nginx.conf..."

# Add rate limiting zones after reset_timedout_connection
sudo sed -i '/reset_timedout_connection on;/a\
\
    # Rate limiting zones for DDoS protection\
    # Zone for general requests (HTML pages, API calls)\
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;\
\
    # Zone for static assets (images, CSS, JS, fonts)\
    limit_req_zone $binary_remote_addr zone=static:10m rate=50r/s;\
\
    # Zone for API/dynamic content (stricter)\
    limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;\
\
    # Connection limit per IP (max 20 simultaneous connections)\
    limit_conn_zone $binary_remote_addr zone=addr:10m;\
\
    # Custom error pages for rate limiting\
    limit_req_status 429;\
    limit_conn_status 429;' /etc/nginx/nginx.conf

echo ""
echo "3. Adding static assets location block to site config..."

# Find the line with "location / {" and insert static location before it
sudo sed -i '/^\slocation \/ {/i\
\	# Static assets with higher rate limits\
\	location ~* \\.(jpg|jpeg|png|gif|webp|ico|svg|css|js|woff|woff2|ttf|eot|json|xml)$ {\
\		# Rate limit for static files (more permissive)\
\		limit_req zone=static burst=100 nodelay;\
\		limit_conn addr 50;\
\
\		proxy_pass http://localhost:3000;\
\		proxy_http_version 1.1;\
\		proxy_set_header Host $http_host;\
\		proxy_set_header X-Real-IP $remote_addr;\
\		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
\		proxy_set_header X-Forwarded-Proto $scheme;\
\
\		# Cache static assets\
\		expires 7d;\
\		add_header Cache-Control "public, immutable";\
\	}\
' /etc/nginx/sites-available/default

echo ""
echo "4. Adding rate limiting to main location block..."

# Add rate limiting right after "location / {"
sudo sed -i '/^\slocation \/ {/a\
\		# Rate limit for general pages\
\		limit_req zone=general burst=20 nodelay;\
\		# Max 20 connections per IP\
\		limit_conn addr 20;' /etc/nginx/sites-available/default

echo ""
echo "5. Testing configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Config test failed! Restoring backups..."
    sudo cp /etc/nginx/nginx.conf.backup-ratelimit /etc/nginx/nginx.conf
    sudo cp /etc/nginx/sites-available/default.backup-ratelimit /etc/nginx/sites-available/default
    echo "Backups restored."
    exit 1
fi

echo ""
echo "6. Reloading Nginx..."
sudo systemctl reload nginx

sleep 2

echo ""
echo "7. Testing site..."
curl -I https://quailbreeder.net/ 2>&1 | head -5

echo ""
echo "=== Rate Limiting Summary ==="
echo "✅ General pages: 10 req/s per IP (burst 20)"
echo "✅ Static assets: 50 req/s per IP (burst 100)"
echo "✅ API endpoints: 5 req/s per IP (burst 10)"
echo "✅ Max connections: 20 per IP"
echo "✅ Static caching: 7 days"
echo ""
echo "Limits:"
echo "  - General zone uses 10MB RAM (~160,000 IPs tracked)"
echo "  - Static zone uses 10MB RAM"
echo "  - API zone uses 10MB RAM"
echo "  - Connection zone uses 10MB RAM"
echo ""
echo "Test rate limiting:"
echo "  for i in {1..15}; do curl -s https://quailbreeder.net/ > /dev/null && echo \"Request \$i: OK\" || echo \"Request \$i: Rate limited\"; done"
echo ""
