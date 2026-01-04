#!/usr/bin/env node

/**
 * Script to generate Apple Client Secret JWT
 * This JWT needs to be regenerated every 6 months (or less)
 *
 * Usage: node scripts/generate-apple-secret.js
 */

const fs = require('fs');
const path = require('path');
const { SignJWT, importPKCS8 } = require('jose');

async function generateAppleClientSecret() {
  // Read environment variables from .env file
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');

  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  });

  const teamId = envVars.APPLE_TEAM_ID;
  const clientId = envVars.APPLE_CLIENT_ID;
  const keyId = envVars.APPLE_KEY_ID;
  const privateKey = envVars.APPLE_CLIENT_SECRET;

  if (!teamId || !clientId || !keyId || !privateKey) {
    console.error('Error: Missing required environment variables');
    console.error('Required: APPLE_TEAM_ID, APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_CLIENT_SECRET');
    process.exit(1);
  }

  console.log('Generating Apple Client Secret JWT...');
  console.log(`Team ID: ${teamId}`);
  console.log(`Client ID: ${clientId}`);
  console.log(`Key ID: ${keyId}`);

  try {
    // Ensure proper line breaks in private key
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    // Import the private key
    const key = await importPKCS8(formattedPrivateKey, 'ES256');

    // Create JWT (valid for 6 months)
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime('180d') // 6 months
      .setAudience('https://appleid.apple.com')
      .setSubject(clientId)
      .sign(key);

    console.log('\n✅ Apple Client Secret JWT generated successfully!\n');
    console.log('Add this to your .env.local file:');
    console.log('');
    console.log(`APPLE_CLIENT_SECRET_JWT="${jwt}"`);
    console.log('');
    console.log('⚠️  This token is valid for 6 months. You will need to regenerate it after that.');
    console.log('');

    return jwt;
  } catch (error) {
    console.error('Error generating JWT:', error.message);
    process.exit(1);
  }
}

generateAppleClientSecret();
