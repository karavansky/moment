import nodemailer from 'nodemailer'
import { saveToSentFolder, buildRawMessage, getImapConfig } from './imap-utils'

export interface TicketEmailData {
  ticketID: string
  userEmail: string
  userName?: string
  subject: string
  category: string
  priority: string
  description: string
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  tls: {
    rejectUnauthorized: false, // Accept self-signed certificates for docker-mailserver
  },
})

/**
 * Sends an email and saves it to the Sent folder via IMAP
 */
async function sendMailAndSaveToSent(mailOptions: any): Promise<void> {
  // Send email via SMTP
  await transporter.sendMail(mailOptions)

  // Save to Sent folder via IMAP (non-blocking, don't fail if it doesn't work)
  try {
    const rawMessage = buildRawMessage({
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
      headers: mailOptions.headers,
    })

    const imapConfig = getImapConfig()
    await saveToSentFolder(rawMessage, imapConfig)
  } catch (error) {
    console.error('[Email] Failed to save to Sent folder:', error)
    // Don't throw - email was sent successfully, IMAP save is optional
  }
}

export async function sendTicketConfirmation(data: TicketEmailData): Promise<void> {
  const { ticketID, userEmail, userName, subject, category, priority, description } = data

  const categoryLabels: Record<string, string> = {
    technical: 'Technical Issue',
    billing: 'Billing',
    feature: 'Feature Request',
    data: 'Data Issue',
    other: 'Other',
  }

  const priorityLabels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  }

  const categoryLabel = categoryLabels[category] || category
  const priorityLabel = priorityLabels[priority] || priority

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket Confirmation</title>
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
          background-color: #4F46E5;
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
        .ticket-info {
          background-color: white;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #4F46E5;
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
          color: #4F46E5;
          display: inline-block;
          min-width: 100px;
        }
        .value {
          color: #333;
        }
        .description-box {
          background-color: #f3f4f6;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
        }
        .priority-high {
          color: #dc2626;
          font-weight: bold;
        }
        .priority-medium {
          color: #f59e0b;
          font-weight: bold;
        }
        .priority-low {
          color: #10b981;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Support Ticket Confirmation</h1>
      </div>
      <div class="content">
        <p>Hello ${userName || userEmail},</p>
        <p>Your support ticket has been successfully created. We have received your request and our team will review it shortly.</p>

        <div class="ticket-info">
          <h2 style="margin-top: 0; color: #4F46E5;">Ticket Details</h2>

          <div class="info-row">
            <span class="label">Ticket ID:</span>
            <span class="value">#${ticketID}</span>
          </div>

          <div class="info-row">
            <span class="label">Subject:</span>
            <span class="value">${subject}</span>
          </div>

          <div class="info-row">
            <span class="label">Category:</span>
            <span class="value">${categoryLabel}</span>
          </div>

          <div class="info-row">
            <span class="label">Priority:</span>
            <span class="value priority-${priority}">${priorityLabel}</span>
          </div>

          <div class="info-row">
            <span class="label">Description:</span>
          </div>
          <div class="description-box">${description}</div>
        </div>

        <p><strong>What happens next?</strong></p>
        <ul>
          <li>Our support team will review your ticket</li>
          <li>You will receive updates via email</li>
          <li>Average response time: ${priority === 'high' ? '2-4 hours' : priority === 'medium' ? '4-8 hours' : '24 hours'}</li>
        </ul>

        <p>If you have any additional information to add, please reply to this email with your ticket ID <strong>#${ticketID}</strong>.</p>
      </div>
      <div class="footer">
        <p>Moment LBS Support Team</p>
        <p>This is an automated email. Please do not reply directly to this message.</p>
      </div>
    </body>
    </html>
  `

  const textContent = `
Support Ticket Confirmation

Hello ${userName || userEmail},

Your support ticket has been successfully created. We have received your request and our team will review it shortly.

Ticket Details:
--------------
Ticket ID: #${ticketID}
Subject: ${subject}
Category: ${categoryLabel}
Priority: ${priorityLabel}

Description:
${description}

What happens next?
- Our support team will review your ticket
- You will receive updates via email
- Average response time: ${priority === 'high' ? '2-4 hours' : priority === 'medium' ? '4-8 hours' : '24 hours'}

If you have any additional information to add, please reply to this email with your ticket ID #${ticketID}.

Moment LBS Support Team
This is an automated email. Please do not reply directly to this message.
  `

  // Send confirmation to user
  const userMailOptions = {
    from: process.env.SMTP_FROM || 'info@moment-lbs.app',
    to: userEmail,
    subject: `[Ticket #${ticketID}] ${subject}`,
    text: textContent,
    html: htmlContent,
    headers: {
      // Header required for bulk mail senders to prevent spam classification
      'List-Unsubscribe': `<mailto:${process.env.SMTP_FROM || 'info@moment-lbs.app'}?subject=unsubscribe>`,
    },
  }

  // Send notification to admin
  const adminMailOptions = {
    from: process.env.SMTP_FROM || 'info@moment-lbs.app',
    to: 'info@moment-lbs.app',
    subject: `[New Ticket #${ticketID}] ${priorityLabel} - ${subject}`,
    text: `New support ticket received:\n\n${textContent}`,
    html: htmlContent,
  }

  // Send both emails and save to Sent folder
  await Promise.all([
    sendMailAndSaveToSent(userMailOptions),
    sendMailAndSaveToSent(adminMailOptions),
  ])
}

export interface NewUserEmailData {
  userEmail: string
  userName: string
  provider: string
  date: Date
  organisation: string
}

export async function sendNewUserNotification(data: NewUserEmailData): Promise<void> {
  const { userEmail, userName, provider, date, organisation } = data

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date)

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New User Registration</title>
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
          background-color: #10b981;
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
        .user-info {
          background-color: white;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #10b981;
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
          color: #10b981;
          display: inline-block;
          min-width: 120px;
        }
        .value {
          color: #333;
        }
        .provider-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .provider-google {
          background-color: #fef3c7;
          color: #92400e;
        }
        .provider-apple {
          background-color: #dbeafe;
          color: #1e3a8a;
        }
        .provider-credentials {
          background-color: #dcfce7;
          color: #166534;
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
        <h1>🎉 New User Registration</h1>
      </div>
      <div class="content">
        <p>A new user has successfully registered on Moment LBS platform.</p>

        <div class="user-info">
          <h2 style="margin-top: 0; color: #10b981;">User Details</h2>

          <div class="info-row">
            <span class="label">Name:</span>
            <span class="value">${userName}</span>
          </div>

          <div class="info-row">
            <span class="label">Email:</span>
            <span class="value">${userEmail}</span>
          </div>

          <div class="info-row">
            <span class="label">Organisation:</span>
            <span class="value">${organisation}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Provider:</span>
            <span class="provider-badge provider-${provider.toLowerCase()}">${provider}</span>
          </div>

          <div class="info-row">
            <span class="label">Registration Date:</span>
            <span class="value">${formattedDate} UTC</span>
          </div>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          This is an automated notification from the Moment LBS user registration system.
        </p>
      </div>
      <div class="footer">
        <p>Moment LBS Admin Notifications</p>
        <p>This is an automated email.</p>
      </div>
    </body>
    </html>
  `

  const textContent = `
New User Registration

A new user has successfully registered on Moment LBS platform.

User Details:
-------------
Name: ${userName}
Email: ${userEmail}
Provider: ${provider}
Registration Date: ${formattedDate} UTC

This is an automated notification from the Moment LBS user registration system.

Moment LBS Admin Notifications
  `

  const adminMailOptions = {
    from: process.env.SMTP_FROM || 'info@moment-lbs.app',
    to: 'info@moment-lbs.app',
    subject: `[New User] ${userName} (${provider})`,
    text: textContent,
    html: htmlContent,
  }

  try {
    await sendMailAndSaveToSent(adminMailOptions)
    console.log('[sendNewUserNotification] Email sent successfully for user:', userEmail)
  } catch (error) {
    console.error('[sendNewUserNotification] Error sending email:', error)
    // Don't throw error to prevent registration failure if email fails
  }
}

export interface EmailVerificationData {
  email: string
  name: string
  confirmUrl: string
}

export async function sendEmailVerification(data: EmailVerificationData): Promise<void> {
  const { email, name, confirmUrl } = data

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
        <h1 style="margin: 0;">Confirm Your Email</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hello ${name},</p>
        <p>Thank you for registering! Please confirm your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
            Confirm Email
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #4F46E5; font-size: 14px; word-break: break-all;">${confirmUrl}</p>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
        <p>Moment LBS</p>
      </div>
    </body>
    </html>
  `

  const textContent = `
Hello ${name},

Thank you for registering! Please confirm your email address by visiting the link below:

${confirmUrl}

This link expires in 24 hours.

Moment LBS
  `

  const mailOptions = {
    from: process.env.SMTP_FROM || 'info@moment-lbs.app',
    to: email,
    subject: 'Confirm your email — Moment LBS',
    text: textContent,
    html: htmlContent,
  }

  try {
    await sendMailAndSaveToSent(mailOptions)
    console.log('[sendEmailVerification] Verification email sent to:', email)
  } catch (error) {
    console.error('[sendEmailVerification] Error:', error)
    throw error
  }
}

export interface PasswordResetData {
  email: string
  name: string
  resetUrl: string
}

export async function sendPasswordReset(data: PasswordResetData): Promise<void> {
  const { email, name, resetUrl } = data

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
        <h1 style="margin: 0;">Password Reset</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #dc2626; color: white; font-weight: bold; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #dc2626; font-size: 14px; word-break: break-all;">${resetUrl}</p>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
        <p>Moment LBS</p>
      </div>
    </body>
    </html>
  `

  const textContent = `
Hello ${name},

We received a request to reset your password. Visit the link below to set a new password:

${resetUrl}

This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.

Moment LBS
  `

  const mailOptions = {
    from: process.env.SMTP_FROM || 'info@moment-lbs.app',
    to: email,
    subject: 'Password Reset — Moment LBS',
    text: textContent,
    html: htmlContent,
  }

  try {
    await sendMailAndSaveToSent(mailOptions)
    console.log('[sendPasswordReset] Reset email sent to:', email)
  } catch (error) {
    console.error('[sendPasswordReset] Error:', error)
    throw error
  }
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify()
    return true
  } catch (error) {
    console.error('Email connection verification failed:', error)
    return false
  }
}
