#!/usr/bin/env node

/**
 * Script to check Apple Client Secret JWT expiration and regenerate if needed
 * This script is meant to be run in CI/CD pipeline before deployment
 *
 * Usage: node scripts/check-apple-jwt.js
 *
 * Exit codes:
 * 0 - JWT is valid, no action needed
 * 1 - Error occurred
 * 2 - JWT was regenerated (requires .env update)
 */

const fs = require('fs');
const path = require('path');
const { importPKCS8, SignJWT } = require('jose');

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, emoji, message) {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function readEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');

  if (!fs.existsSync(envPath)) {
    log('red', '❌', 'Error: .env file not found');
    process.exit(1);
  }

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

  return { envVars, envPath, envContent };
}

async function checkJWTExpiration(jwt) {
  try {
    // Decode JWT without verification to check expiration
    const [, payloadB64] = jwt.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

    const exp = payload.exp;
    const iat = payload.iat;
    const now = Math.floor(Date.now() / 1000);

    const daysUntilExpiry = Math.floor((exp - now) / 86400);
    const totalValidDays = Math.floor((exp - iat) / 86400);

    return {
      isValid: exp > now,
      expiresAt: new Date(exp * 1000),
      issuedAt: new Date(iat * 1000),
      daysUntilExpiry,
      totalValidDays,
      expiresInSeconds: exp - now,
    };
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error.message}`);
  }
}

async function generateNewJWT(teamId, clientId, keyId, privateKey) {
  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    const key = await importPKCS8(formattedPrivateKey, 'ES256');

    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime('180d') // 6 months
      .setAudience('https://appleid.apple.com')
      .setSubject(clientId)
      .sign(key);

    return jwt;
  } catch (error) {
    throw new Error(`Failed to generate JWT: ${error.message}`);
  }
}

function updateEnvFile(envPath, envContent, newJWT) {
  // Replace the APPLE_CLIENT_SECRET_JWT value in .env file
  const updatedContent = envContent.replace(
    /APPLE_CLIENT_SECRET_JWT=.*/,
    `APPLE_CLIENT_SECRET_JWT="${newJWT}"`
  );

  fs.writeFileSync(envPath, updatedContent, 'utf8');
  log('green', '✅', 'Updated .env file with new JWT');
}

async function main() {
  log('cyan', '🔍', 'Checking Apple Client Secret JWT expiration...');

  const { envVars, envPath, envContent } = readEnvFile();

  const teamId = envVars.APPLE_TEAM_ID;
  const clientId = envVars.APPLE_CLIENT_ID;
  const keyId = envVars.APPLE_KEY_ID;
  const privateKey = envVars.APPLE_CLIENT_SECRET;
  const currentJWT = envVars.APPLE_CLIENT_SECRET_JWT;

  if (!teamId || !clientId || !keyId || !privateKey) {
    log('red', '❌', 'Error: Missing required Apple environment variables');
    log('red', '', 'Required: APPLE_TEAM_ID, APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_CLIENT_SECRET');
    process.exit(1);
  }

  if (!currentJWT) {
    log('yellow', '⚠️', 'No existing JWT found. Generating new one...');
    const newJWT = await generateNewJWT(teamId, clientId, keyId, privateKey);
    updateEnvFile(envPath, envContent, newJWT);

    log('blue', '📝', 'New JWT generated and saved to .env');
    log('yellow', '⚠️', 'Please commit the updated .env file');
    process.exit(2);
  }

  try {
    const jwtInfo = await checkJWTExpiration(currentJWT);

    log('blue', '📅', `JWT issued: ${jwtInfo.issuedAt.toISOString()}`);
    log('blue', '📅', `JWT expires: ${jwtInfo.expiresAt.toISOString()}`);
    log('blue', '⏱️', `Days until expiry: ${jwtInfo.daysUntilExpiry}`);
    log('blue', '📊', `Total validity period: ${jwtInfo.totalValidDays} days`);

    // Regenerate if less than 30 days until expiry
    const REGENERATE_THRESHOLD_DAYS = 30;

    if (!jwtInfo.isValid) {
      log('red', '❌', 'JWT has EXPIRED! Generating new one...');
      const newJWT = await generateNewJWT(teamId, clientId, keyId, privateKey);
      updateEnvFile(envPath, envContent, newJWT);

      // Check new JWT expiration
      const newJWTInfo = await checkJWTExpiration(newJWT);

      log('green', '✅', 'New JWT generated and saved');
      log('yellow', '⚠️', 'Please commit the updated .env file');

      // Send email notification
      log('blue', '📧', 'Sending notification email...');
      const { exec } = require('child_process');
      exec(`node "${path.join(__dirname, 'send-jwt-notification.js')}" "${jwtInfo.expiresAt.toISOString()}" "${newJWTInfo.expiresAt.toISOString()}"`, (error) => {
        if (error) {
          log('yellow', '⚠️', 'Failed to send email notification');
        }
      });

      process.exit(2);
    } else if (jwtInfo.daysUntilExpiry < REGENERATE_THRESHOLD_DAYS) {
      log('yellow', '⚠️', `JWT expires in ${jwtInfo.daysUntilExpiry} days (threshold: ${REGENERATE_THRESHOLD_DAYS} days)`);
      log('yellow', '🔄', 'Regenerating JWT...');

      const newJWT = await generateNewJWT(teamId, clientId, keyId, privateKey);
      updateEnvFile(envPath, envContent, newJWT);

      // Check new JWT expiration
      const newJWTInfo = await checkJWTExpiration(newJWT);

      log('green', '✅', 'New JWT generated and saved');
      log('yellow', '⚠️', 'Please commit the updated .env file');

      // Send email notification
      log('blue', '📧', 'Sending notification email...');
      const { exec } = require('child_process');
      exec(`node "${path.join(__dirname, 'send-jwt-notification.js')}" "${jwtInfo.expiresAt.toISOString()}" "${newJWTInfo.expiresAt.toISOString()}"`, (error) => {
        if (error) {
          log('yellow', '⚠️', 'Failed to send email notification');
        }
      });

      process.exit(2);
    } else {
      log('green', '✅', `JWT is valid for ${jwtInfo.daysUntilExpiry} more days. No action needed.`);
      process.exit(0);
    }
  } catch (error) {
    log('red', '❌', `Error: ${error.message}`);
    process.exit(1);
  }
}

main();
