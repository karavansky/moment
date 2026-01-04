#!/usr/bin/env node

/**
 * Test IMAP connection and Sent folder saving
 * Usage: node scripts/test-imap.js
 */

const Imap = require('imap');
const fs = require('fs');
const path = require('path');

function readEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  });

  return envVars;
}

async function testImapConnection() {
  const env = readEnvFile();

  console.log('🔍 Testing IMAP connection...');
  console.log(`Host: ${env.SMTP_HOST}`);
  console.log(`Port: ${env.IMAP_PORT || 993}`);
  console.log(`User: ${env.SMTP_USER}`);
  console.log(`TLS: ${env.IMAP_TLS !== 'false' ? 'enabled' : 'disabled'}`);
  console.log('');

  const imap = new Imap({
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    host: env.SMTP_HOST,
    port: parseInt(env.IMAP_PORT || '993'),
    tls: env.IMAP_TLS !== 'false',
    tlsOptions: {
      rejectUnauthorized: false,
    },
  });

  imap.once('ready', () => {
    console.log('✅ IMAP connection successful!');
    console.log('');
    console.log('📁 Listing mailboxes...');

    imap.getBoxes((err, boxes) => {
      if (err) {
        console.error('❌ Error listing mailboxes:', err.message);
        imap.end();
        return;
      }

      console.log('Available mailboxes:');
      console.log(JSON.stringify(boxes, null, 2));
      console.log('');

      // Try to find Sent folder
      const sentFolderNames = ['Sent', 'INBOX.Sent', '[Gmail]/Sent Mail', 'Sent Items'];

      const tryOpenSent = (index) => {
        if (index >= sentFolderNames.length) {
          console.log('⚠️  Could not find standard Sent folder');
          imap.end();
          return;
        }

        const folderName = sentFolderNames[index];
        imap.openBox(folderName, false, (err, box) => {
          if (err) {
            tryOpenSent(index + 1);
            return;
          }

          console.log(`✅ Found Sent folder: "${folderName}"`);
          console.log(`   Messages: ${box.messages.total}`);
          console.log(`   Recent: ${box.messages.new}`);
          console.log('');
          console.log('🎉 IMAP setup is correct!');
          imap.end();
        });
      };

      tryOpenSent(0);
    });
  });

  imap.once('error', err => {
    console.error('❌ IMAP connection error:', err.message);
    console.log('');
    console.log('Possible solutions:');
    console.log('1. Check that IMAP port 993 is accessible on mailserver');
    console.log('2. Verify SMTP_USER and SMTP_PASSWORD are correct');
    console.log('3. Ensure TLS/SSL is properly configured on mailserver');
    console.log('4. Check docker-mailserver logs: docker logs mailserver');
    process.exit(1);
  });

  imap.once('end', () => {
    console.log('');
    console.log('🔌 IMAP connection closed');
  });

  imap.connect();
}

testImapConnection();
