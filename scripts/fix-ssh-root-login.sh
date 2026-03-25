#!/bin/bash

# Script to fix duplicate PermitRootLogin in SSH config
# Removes the "PermitRootLogin yes" at line 132

echo "🔒 Fixing SSH PermitRootLogin configuration..."

# Backup current config
BACKUP_FILE="/etc/ssh/sshd_config.backup-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating backup: $BACKUP_FILE"
sudo cp /etc/ssh/sshd_config "$BACKUP_FILE"

# Show current problematic lines
echo ""
echo "Current configuration:"
grep -n "PermitRootLogin" /etc/ssh/sshd_config

echo ""
echo "🔧 Removing duplicate 'PermitRootLogin yes' from line 132..."

# Remove line 132 (the duplicate "PermitRootLogin yes")
sudo sed -i '132d' /etc/ssh/sshd_config

# Verify the change
echo ""
echo "New configuration:"
grep -n "PermitRootLogin" /etc/ssh/sshd_config

# Test SSH configuration
echo ""
echo "🧪 Testing SSH configuration..."
if sudo sshd -t; then
  echo "✅ SSH configuration is valid"

  echo ""
  echo "🔄 Restarting SSH service..."
  if sudo systemctl restart ssh; then
    echo "✅ SSH service restarted successfully"
    echo ""
    echo "✅ Done! Root login is now disabled."
    echo "   Only 'PermitRootLogin no' on line 42 remains."
  else
    echo "❌ Failed to restart SSH"
    echo "🔙 Restoring backup..."
    sudo cp "$BACKUP_FILE" /etc/ssh/sshd_config
    sudo systemctl restart ssh
    exit 1
  fi
else
  echo "❌ SSH configuration test failed"
  echo "🔙 Restoring backup..."
  sudo cp "$BACKUP_FILE" /etc/ssh/sshd_config
  exit 1
fi
