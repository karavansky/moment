#!/bin/bash
# Reload nginx configuration for /api/version routing fix

echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Configuration is valid. Reloading nginx..."
    sudo systemctl reload nginx
    echo "Nginx reloaded successfully!"

    echo ""
    echo "Testing /api/version endpoint..."
    curl -s https://moment-lbs.app/api/version | jq
else
    echo "Configuration test failed! Please fix the errors above."
    exit 1
fi
