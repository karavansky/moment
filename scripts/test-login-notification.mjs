#!/usr/bin/env node

/**
 * Test script to send a login notification email
 * This simulates what happens when a user logs in
 */

import { sendLoginNotification } from '../lib/email.ts'

async function main() {
  console.log('🧪 Testing login notification email...\n')

  const testData = {
    userEmail: 'test@example.com',
    userName: 'Test User',
    provider: 'credentials',
    date: new Date(),
    ip: '192.168.1.100',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }

  console.log('Test data:')
  console.log(JSON.stringify(testData, null, 2))
  console.log('\n📧 Sending email to info@moment-lbs.app...\n')

  try {
    await sendLoginNotification(testData)
    console.log('✅ Email sent successfully!')
    console.log('\nCheck your inbox at info@moment-lbs.app')
  } catch (error) {
    console.error('❌ Error sending email:', error)
    process.exit(1)
  }
}

main()
