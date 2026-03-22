#!/usr/bin/env node
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// Generate Firebase-style ID (21 chars)
function generateId(length = 21) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(
    array,
    b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62]
  ).join('')
}

// Hash password with bcrypt
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

async function main() {
  const firmaID = generateId()
  const userID = generateId()
  const passwordHash = await hashPassword('1111')

  console.log('\n=== Sport- und Bäderamt Account ===\n')
  console.log('Organisation:')
  console.log(`  firmaID: ${firmaID}`)
  console.log(`  name: Sport- und Bäderamt`)
  console.log('')
  console.log('User:')
  console.log(`  userID: ${userID}`)
  console.log(`  name: Sport- und Bäderamt`)
  console.log(`  email: sport@bonn`)
  console.log(`  password: 1111`)
  console.log(`  passwordHash: ${passwordHash}`)
  console.log(`  status: 7`)
  console.log(`  lang: de`)
  console.log(`  country: de`)
  console.log(`  firmaID: ${firmaID}`)
  console.log('')
  console.log('=== SQL Commands ===\n')

  console.log('-- Create organisation')
  console.log(`INSERT INTO organisations ("firmaID", name, "createdAt")`)
  console.log(`VALUES ('${firmaID}', 'Sport- und Bäderamt', CURRENT_TIMESTAMP);`)
  console.log('')

  console.log('-- Create user')
  console.log(`INSERT INTO users ("userID", name, email, "passwordHash", status, lang, country, "firmaID", "emailVerified", date, provider)`)
  console.log(`VALUES ('${userID}', 'Sport- und Bäderamt', 'sport@bonn', '${passwordHash}', 7, 'de', 'de', '${firmaID}', true, CURRENT_TIMESTAMP, 'credentials');`)
  console.log('')
}

main().catch(console.error)
