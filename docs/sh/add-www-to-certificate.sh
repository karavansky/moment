#!/bin/bash
# Add all subdomains to SSL certificate

echo "=== Adding subdomains to SSL certificate ==="
echo ""
echo "Current certificate covers: quailbreeder.net, www, karavansky, app, moment"
echo "Need to add:"
echo "  - monitor.quailbreeder.net"
echo "  - ws.quailbreeder.net"
echo ""

echo "This will:"
echo "  1. Expand certificate to include all subdomains"
echo "  2. Keep existing certificate for quailbreeder.net"
echo "  3. Allow HTTPS on all domains"
echo ""

echo "Running certbot..."
sudo certbot --nginx -d quailbreeder.net -d www.quailbreeder.net -d karavansky.quailbreeder.net -d app.quailbreeder.net -d moment.quailbreeder.net -d monitor.quailbreeder.net -d ws.quailbreeder.net --expand

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificate updated successfully!"
    echo ""
    echo "Certificate now covers:"
    echo "  - quailbreeder.net"
    echo "  - www.quailbreeder.net"
    echo "  - karavansky.quailbreeder.net"
    echo "  - app.quailbreeder.net"
    echo "  - moment.quailbreeder.net"
    echo "  - monitor.quailbreeder.net"
    echo "  - ws.quailbreeder.net"
    echo ""
    echo "Testing..."
    echo ""
    echo "Non-www:"
    curl -I https://quailbreeder.net/ 2>&1 | head -5
    echo ""
    echo "With www (should redirect to non-www):"
    curl -I https://www.quailbreeder.net/ 2>&1 | head -5
    echo ""
    echo "✅ HTTPS works on both domains!"
else
    echo ""
    echo "❌ Certificate update failed!"
    echo ""
    echo "Manual steps:"
    echo "  sudo certbot --nginx -d quailbreeder.net -d www.quailbreeder.net -d karavansky.quailbreeder.net -d app.quailbreeder.net -d moment.quailbreeder.net -d monitor.quailbreeder.net -d ws.quailbreeder.net --expand"
fi
