#!/bin/bash

# Script to install and configure CrowdSec for SSH and Nginx protection
# CrowdSec is a modern, collaborative IPS with machine learning

set -e

echo "🛡️  Installing CrowdSec..."
echo ""

# Add CrowdSec repository
echo "📦 Adding CrowdSec repository..."
curl -s https://packagecloud.io/install/repositories/crowdsec/crowdsec/script.deb.sh | sudo bash

# Install CrowdSec
echo "⬇️  Installing CrowdSec package..."
sudo apt-get update
sudo apt-get install -y crowdsec

# Install collections for SSH and Nginx
echo ""
echo "📚 Installing collections..."
sudo cscli collections install crowdsecurity/linux
sudo cscli collections install crowdsecurity/sshd
sudo cscli collections install crowdsecurity/nginx

# Install firewall bouncer (iptables integration)
echo ""
echo "🔥 Installing firewall bouncer..."
sudo apt-get install -y crowdsec-firewall-bouncer-iptables

# Configure acquisition for SSH logs
echo ""
echo "⚙️  Configuring log sources..."
sudo tee /etc/crowdsec/acquis.yaml > /dev/null <<EOF
---
# SSH authentication logs
filenames:
  - /var/log/auth.log
labels:
  type: syslog

# Nginx access logs
filenames:
  - /var/log/nginx/access.log
labels:
  type: nginx

# Nginx error logs
filenames:
  - /var/log/nginx/error.log
labels:
  type: nginx
EOF

# Restart CrowdSec to apply configuration
echo ""
echo "🔄 Restarting CrowdSec..."
sudo systemctl restart crowdsec

# Enable services on boot
sudo systemctl enable crowdsec
sudo systemctl enable crowdsec-firewall-bouncer

# Show status
echo ""
echo "✅ CrowdSec installation complete!"
echo ""
echo "📊 Current status:"
sudo cscli metrics
echo ""
echo "🔍 Installed collections:"
sudo cscli collections list
echo ""
echo "📈 Decisions (blocked IPs):"
sudo cscli decisions list
echo ""
echo "💡 Useful commands:"
echo "   sudo cscli metrics          - Show statistics"
echo "   sudo cscli decisions list   - Show blocked IPs"
echo "   sudo cscli alerts list      - Show recent alerts"
echo "   sudo cscli hub update       - Update scenarios"
echo "   sudo cscli dashboard setup  - Setup web dashboard"
echo ""
echo "🌐 Optional: Setup web dashboard with:"
echo "   sudo cscli dashboard setup -l 0.0.0.0 -p 3005"
echo "   Then access at: http://YOUR_IP:3005"
