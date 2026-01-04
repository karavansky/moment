#!/bin/bash
# Find what's wrong with the sites-available/default file

echo "=== Finding Syntax Issue ==="

echo ""
echo "1. Test ONLY the default site file..."
nginx -t -c /dev/stdin <<'EOF'
events {
    worker_connections 1024;
}
http {
    include /etc/nginx/sites-available/default;
}
EOF

echo ""
echo "2. Check for hidden characters or encoding issues..."
file /etc/nginx/sites-available/default

echo ""
echo "3. Check the symlink..."
ls -la /etc/nginx/sites-enabled/default

echo ""
echo "4. Manually include the file and test..."
cat > /tmp/test-nginx.conf <<'TESTCONF'
events {
    worker_connections 1024;
}
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name test.local;
        root /var/www/html;
    }

    include /etc/nginx/sites-enabled/*;
}
TESTCONF

nginx -t -c /tmp/test-nginx.conf

echo ""
echo "5. Check main nginx.conf..."
grep "include.*sites-enabled" /etc/nginx/nginx.conf

echo ""
echo "=== DONE ==="
