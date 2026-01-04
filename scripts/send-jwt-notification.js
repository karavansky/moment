#!/usr/bin/env node

/**
 * Script to send email notification about Apple JWT regeneration
 * Usage: node scripts/send-jwt-notification.js <old_expiry_date> <new_expiry_date>
 */

const nodemailer = require('nodemailer');
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

async function sendNotification(oldExpiry, newExpiry) {
  const env = readEnvFile();

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'localhost',
    port: parseInt(env.SMTP_PORT || '587'),
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    } : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });

  const oldDate = new Date(oldExpiry).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  const newDate = new Date(newExpiry).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Apple JWT Regenerated</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #f59e0b;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .info-box {
          background-color: white;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #f59e0b;
        }
        .info-row {
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: bold;
          color: #f59e0b;
          display: inline-block;
          min-width: 150px;
        }
        .value {
          color: #333;
        }
        .warning-box {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .code-box {
          background-color: #1f2937;
          color: #10b981;
          padding: 15px;
          border-radius: 5px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          overflow-x: auto;
          margin: 15px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 Apple JWT Regenerated</h1>
      </div>
      <div class="content">
        <p>The Apple Client Secret JWT has been automatically regenerated during the CI/CD pipeline.</p>

        <div class="info-box">
          <h2 style="margin-top: 0; color: #f59e0b;">JWT Details</h2>

          <div class="info-row">
            <span class="label">Previous Expiration:</span>
            <span class="value">${oldDate} UTC</span>
          </div>

          <div class="info-row">
            <span class="label">New Expiration:</span>
            <span class="value">${newDate} UTC</span>
          </div>

          <div class="info-row">
            <span class="label">Validity Period:</span>
            <span class="value">180 days (6 months)</span>
          </div>

          <div class="info-row">
            <span class="label">Algorithm:</span>
            <span class="value">ES256</span>
          </div>
        </div>

        <div class="warning-box">
          <strong>⚠️ Action Required:</strong>
          <p style="margin: 10px 0 0 0;">
            The .env file has been updated with the new JWT. If you're using version control,
            make sure to commit the updated .env file (if applicable) or update your deployment secrets.
          </p>
        </div>

        <p><strong>What was done:</strong></p>
        <ul>
          <li>Checked JWT expiration date</li>
          <li>Generated new JWT from private key (APPLE_CLIENT_SECRET)</li>
          <li>Updated APPLE_CLIENT_SECRET_JWT in .env file</li>
          <li>Continued with Docker build and deployment</li>
        </ul>

        <p><strong>Next regeneration:</strong></p>
        <p>The JWT will be automatically checked and regenerated during the next CI/CD run if it's within 30 days of expiration.</p>

        <div class="code-box">
# To manually regenerate JWT, run:
node scripts/check-apple-jwt.js

# Or use the old script:
node scripts/generate-apple-secret.js
        </div>
      </div>
      <div class="footer">
        <p>QuailBreeder CI/CD System</p>
        <p>This is an automated notification from the deployment pipeline.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Apple Client Secret JWT Regenerated

The Apple Client Secret JWT has been automatically regenerated during the CI/CD pipeline.

JWT Details:
-------------
Previous Expiration: ${oldDate} UTC
New Expiration: ${newDate} UTC
Validity Period: 180 days (6 months)
Algorithm: ES256

⚠️ Action Required:
The .env file has been updated with the new JWT. If you're using version control,
make sure to commit the updated .env file (if applicable) or update your deployment secrets.

What was done:
- Checked JWT expiration date
- Generated new JWT from private key (APPLE_CLIENT_SECRET)
- Updated APPLE_CLIENT_SECRET_JWT in .env file
- Continued with Docker build and deployment

Next regeneration:
The JWT will be automatically checked and regenerated during the next CI/CD run
if it's within 30 days of expiration.

To manually regenerate JWT, run:
  node scripts/check-apple-jwt.js

QuailBreeder CI/CD System
This is an automated notification from the deployment pipeline.
  `;

  const mailOptions = {
    from: env.SMTP_FROM || 'info@quailbreeder.net',
    to: 'quailbreeding@gmail.com',
    subject: '[CI/CD] Apple JWT Auto-Regenerated',
    text: textContent,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ JWT regeneration notification sent to admin');
  } catch (error) {
    console.error('⚠️  Failed to send notification email:', error.message);
    // Don't fail the script if email fails
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node send-jwt-notification.js <old_expiry_date> <new_expiry_date>');
  process.exit(1);
}

sendNotification(args[0], args[1]);
