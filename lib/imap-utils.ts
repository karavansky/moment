import Imap from 'imap'

interface ImapConfig {
  user: string
  password: string
  host: string
  port: number
  tls: boolean
}

/**
 * Saves an email message to the Sent folder via IMAP
 * This ensures sent emails appear in the IMAP Sent folder
 */
export async function saveToSentFolder(
  rawMessage: string,
  imapConfig: ImapConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: imapConfig.user,
      password: imapConfig.password,
      host: imapConfig.host,
      port: imapConfig.port,
      tls: imapConfig.tls,
      tlsOptions: {
        rejectUnauthorized: false, // Accept self-signed certificates
      },
    })

    imap.once('ready', () => {
      // Common Sent folder names to try
      const sentFolderNames = ['Sent', 'INBOX.Sent', '[Gmail]/Sent Mail', 'Sent Items']

      // Try to open Sent folder
      const tryNextFolder = (index: number) => {
        if (index >= sentFolderNames.length) {
          imap.end()
          reject(new Error('Could not find Sent folder'))
          return
        }

        imap.openBox(sentFolderNames[index], false, err => {
          if (err) {
            // Try next folder name
            tryNextFolder(index + 1)
            return
          }

          // Successfully opened Sent folder, now append the message
          imap.append(rawMessage, { mailbox: sentFolderNames[index] }, appendErr => {
            imap.end()

            if (appendErr) {
              reject(new Error(`Failed to append message: ${appendErr.message}`))
            } else {
              console.log(`[IMAP] Message saved to ${sentFolderNames[index]} folder`)
              resolve()
            }
          })
        })
      }

      tryNextFolder(0)
    })

    imap.once('error', err => {
      console.error('[IMAP] Connection error:', err)
      reject(err)
    })

    imap.once('end', () => {
      console.log('[IMAP] Connection ended')
    })

    imap.connect()
  })
}

/**
 * Builds a raw RFC822 email message from nodemailer options
 */
export function buildRawMessage(mailOptions: {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
  headers?: Record<string, string>
}): string {
  const { from, to, subject, text, html, headers } = mailOptions

  const date = new Date().toUTCString()
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 11)}@${from.split('@')[1]}>`

  let rawMessage = ''
  rawMessage += `From: ${from}\r\n`
  rawMessage += `To: ${to}\r\n`
  rawMessage += `Subject: ${subject}\r\n`
  rawMessage += `Date: ${date}\r\n`
  rawMessage += `Message-ID: ${messageId}\r\n`

  // Add custom headers
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      rawMessage += `${key}: ${value}\r\n`
    })
  }

  rawMessage += `MIME-Version: 1.0\r\n`

  if (html && text) {
    // Multipart message
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    rawMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`
    rawMessage += `\r\n`
    rawMessage += `--${boundary}\r\n`
    rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n`
    rawMessage += `Content-Transfer-Encoding: 7bit\r\n`
    rawMessage += `\r\n`
    rawMessage += `${text}\r\n`
    rawMessage += `\r\n`
    rawMessage += `--${boundary}\r\n`
    rawMessage += `Content-Type: text/html; charset=UTF-8\r\n`
    rawMessage += `Content-Transfer-Encoding: 7bit\r\n`
    rawMessage += `\r\n`
    rawMessage += `${html}\r\n`
    rawMessage += `\r\n`
    rawMessage += `--${boundary}--\r\n`
  } else if (html) {
    // HTML only
    rawMessage += `Content-Type: text/html; charset=UTF-8\r\n`
    rawMessage += `Content-Transfer-Encoding: 7bit\r\n`
    rawMessage += `\r\n`
    rawMessage += `${html}\r\n`
  } else {
    // Plain text only
    rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n`
    rawMessage += `Content-Transfer-Encoding: 7bit\r\n`
    rawMessage += `\r\n`
    rawMessage += `${text || ''}\r\n`
  }

  return rawMessage
}

/**
 * Helper function to get IMAP config from environment variables
 */
export function getImapConfig(): ImapConfig {
  return {
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.IMAP_PORT || '993'),
    tls: process.env.IMAP_TLS !== 'false', // Default to true for IMAP
  }
}
