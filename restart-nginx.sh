#!/bin/bash
# Full restart of nginx (not just reload)

echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Configuration is valid. Restarting nginx (full restart)..."
    sudo systemctl restart nginx

    echo "Waiting for nginx to start..."
    sleep 2

    echo "Nginx restarted successfully!"
    echo ""
    echo "Testing /api/version endpoint..."
    curl -s https://moment-lbs.app/api/version | jq

    echo ""
    echo "Testing direct Next.js endpoint..."
    curl -s http://localhost:3002/api/version | jq
else
    echo "Configuration test failed! Please fix the errors above."
    exit 1
fi
