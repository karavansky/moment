#!/bin/bash

# Install and configure fail2ban for SSH protection
# fail2ban is 100% open source (GPL) with no commercial ties

set -e

echo "🛡️  Installing fail2ban..."

# Install fail2ban
sudo apt-get update
sudo apt-get install -y fail2ban

# Create local jail configuration
echo ""
echo "⚙️  Configuring fail2ban for SSH..."

sudo tee /etc/fail2ban/jail.local > /dev/null <<'EOF'
[DEFAULT]
# Ban settings
bantime  = 1h
findtime = 10m
maxretry = 5

# Email notifications (optional)
destemail = info@moment-lbs.app
sendername = Fail2Ban
action = %(action_)s

[sshd]
enabled = true
port    = ssh
logpath = /var/log/auth.log
maxretry = 5
bantime  = 4h
findtime = 10m

# More aggressive for root attacks
[sshd-root]
enabled = true
port    = ssh
logpath = /var/log/auth.log
filter = sshd[mode=root]
maxretry = 3
bantime  = 24h
findtime = 5m
EOF

# Create filter for root-specific attacks
sudo tee /etc/fail2ban/filter.d/sshd-root.conf > /dev/null <<'EOF'
[Definition]
failregex = ^%(__prefix_line)sFailed (?:password|publickey) for root from <HOST>
            ^%(__prefix_line)sConnection closed by authenticating user root <HOST>
ignoreregex =
EOF

# Enable and restart fail2ban
echo ""
echo "🔄 Starting fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# Wait for service to start
sleep 2

# Show status
echo ""
echo "✅ fail2ban installation complete!"
echo ""
echo "📊 Current status:"
sudo fail2ban-client status
echo ""
echo "🔍 SSH jail status:"
sudo fail2ban-client status sshd
echo ""
echo "💡 Useful commands:"
echo "   sudo fail2ban-client status          - Show all jails"
echo "   sudo fail2ban-client status sshd     - Show SSH jail status"
echo "   sudo fail2ban-client set sshd unbanip <IP>  - Unban specific IP"
echo "   sudo tail -f /var/log/fail2ban.log   - Watch live bans"
echo ""
echo "🎯 Configuration:"
echo "   - 5 failed attempts in 10 min = ban for 4 hours"
echo "   - 3 root attacks in 5 min = ban for 24 hours"
echo "   - Config: /etc/fail2ban/jail.local"
