# HTTP/3 (QUIC) Not Working - Cloud Provider Firewall Issue

## Current Status

✅ **Nginx Configuration:** Correct (listening on UDP 443)
✅ **Local Firewall (UFW):** UDP 443 allowed
✅ **Alt-Svc Header:** Being sent correctly
❌ **External Connection:** QUIC connections failing

## Root Cause

Your cloud provider's **external firewall/security group** is likely blocking UDP port 443.

Common providers that require manual UDP configuration:
- DigitalOcean (Cloud Firewalls)
- Vultr (Firewall Rules)
- AWS (Security Groups)
- Google Cloud (Firewall Rules)
- Azure (Network Security Groups)

## Solution

### Option 1: Configure Cloud Provider Firewall (Recommended)

You need to add a firewall rule at your cloud provider's control panel:

**Rule Details:**
- **Type:** Custom UDP
- **Protocol:** UDP
- **Port:** 443
- **Source:** 0.0.0.0/0, ::/0 (all IPv4/IPv6)
- **Description:** QUIC/HTTP3

#### Provider-Specific Instructions:

**DigitalOcean:**
1. Go to Networking → Firewalls
2. Select your firewall
3. Add Inbound Rule:
   - Type: Custom
   - Protocol: UDP
   - Port Range: 443
   - Sources: All IPv4, All IPv6

**Vultr:**
1. Go to Firewall → Firewall Groups
2. Add Rule:
   - Protocol: UDP
   - Port: 443
   - Source: Anywhere

**AWS EC2:**
1. Go to EC2 → Security Groups
2. Edit Inbound Rules
3. Add Rule:
   - Type: Custom UDP
   - Port: 443
   - Source: 0.0.0.0/0, ::/0

### Option 2: Disable HTTP/3 (Fallback)

If you can't configure the cloud firewall, you can disable HTTP/3 and keep HTTP/2:

\`\`\`bash
sudo /home/hronop/node/quailbreeder/disable-http3.sh
\`\`\`

This will:
- Remove QUIC listeners (UDP 443)
- Keep HTTP/2 over TCP (which works)
- Remove Alt-Svc header

## Verification Steps

After configuring the cloud firewall:

1. **Wait 2-5 minutes** for firewall changes to propagate
2. **Test external connection:**
   ```bash
   # From another machine (not the server)
   nc -u -v -w 1 quailbreeder.net 443
   ```
3. **Test HTTP/3:**
   https://http3check.net/?host=quailbreeder.net

## Current Configuration

Your server is properly configured:
- ✅ Nginx 1.29.3 with HTTP/3 support
- ✅ UDP 443 listening locally
- ✅ UFW allows UDP 443
- ✅ Alt-Svc: h3=":443"; ma=86400

The only missing piece is the **external firewall rule at your cloud provider**.

## Notes

- HTTP/2 is working fine (over TCP)
- This won't affect site functionality
- HTTP/3 provides 10-30% faster load times on average
- Not all clients support HTTP/3 yet (mainly modern browsers)
