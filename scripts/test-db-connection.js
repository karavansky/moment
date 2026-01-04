require('dotenv').config({ path: '.env' })
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
})

async function testConnection() {
  console.log('Testing PostgreSQL connection...')
  console.log(`Host: ${process.env.DATABASE_HOST}`)
  console.log(`Port: ${process.env.DATABASE_PORT}`)
  console.log(`Database: ${process.env.DATABASE_NAME}`)
  console.log(`User: ${process.env.DATABASE_USER}`)
  console.log('')

  try {
    // Test connection
    const client = await pool.connect()
    console.log('✅ Successfully connected to PostgreSQL')

    // Test users table
    const usersResult = await client.query('SELECT COUNT(*) FROM users')
    console.log(`✅ Users table: ${usersResult.rows[0].count} records`)

    // Test ticket table
    const ticketResult = await client.query('SELECT COUNT(*) FROM ticket')
    console.log(`✅ Ticket table: ${ticketResult.rows[0].count} records`)

    // Test table structure
    const usersStructure = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
    `)
    console.log('\n📋 Users table structure:')
    usersStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

    const ticketStructure = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'ticket'
    `)
    console.log('\n📋 Ticket table structure:')
    ticketStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

    client.release()
    console.log('\n✅ All database checks passed!')
  } catch (error) {
    console.error('❌ Database connection error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

testConnection()
