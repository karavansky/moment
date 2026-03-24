#!/usr/bin/env node

/**
 * Test script to send a failed login notification email
 * This simulates what happens when someone tries to login with wrong credentials
 */

import { sendFailedLoginNotification } from '../lib/email.ts'

async function main() {
  console.log('🧪 Testing failed login notification email...\n')

  const testCases = [
    {
      email: 'test@example.com',
      reason: 'invalid_password',
      description: 'Wrong password',
    },
    {
      email: 'nonexistent@example.com',
      reason: 'user_not_found',
      description: 'User does not exist',
    },
    {
      email: 'oauth-user@example.com',
      reason: 'no_password',
      description: 'OAuth-only account (no password set)',
    },
    {
      email: 'unverified@example.com',
      reason: 'email_not_verified',
      description: 'Email not verified',
    },
  ]

  console.log('Available test cases:')
  testCases.forEach((tc, i) => {
    console.log(`  ${i + 1}. ${tc.description} (${tc.reason})`)
  })

  // Test the first case by default (invalid password)
  const testCase = testCases[0]
  console.log(`\n📧 Testing: ${testCase.description}`)
  console.log(`   Reason: ${testCase.reason}`)
  console.log(`   Email: ${testCase.email}\n`)

  const testData = {
    email: testCase.email,
    reason: testCase.reason,
    date: new Date(),
    ip: '192.168.1.100',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }

  console.log('📧 Sending email to info@moment-lbs.app...\n')

  try {
    await sendFailedLoginNotification(testData)
    console.log('✅ Email sent successfully!')
    console.log('\nCheck your inbox at info@moment-lbs.app')
    console.log('\n💡 To test other cases, modify the testCase variable in the script')
  } catch (error) {
    console.error('❌ Error sending email:', error)
    process.exit(1)
  }
}

main()
