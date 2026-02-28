import dotenv from 'dotenv';
import fs from 'fs';
const env = dotenv.parse(fs.readFileSync('.env'));

import { Pool } from 'pg';
const pool = new Pool({
  host: env.DATABASE_HOST,
  port: parseInt(env.DATABASE_PORT || '5432'),
  database: env.DATABASE_NAME,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
});

async function run() {
  const result = await pool.query('SELECT "appointmentID", "date", "startTime", "endTime" FROM appointments LIMIT 1');
  const existingAppointment = result.rows[0];
  console.log("DB returned:", existingAppointment);
  console.log("date type:", typeof existingAppointment.date, existingAppointment.date instanceof Date);
  console.log("startTime type:", typeof existingAppointment.startTime, existingAppointment.startTime instanceof Date);
  
  pool.end();
}
run().catch(console.error);
