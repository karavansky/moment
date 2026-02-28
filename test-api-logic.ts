import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
const pool = new Pool();

async function run() {
  const result = await pool.query('SELECT "appointmentID", "date", "startTime" FROM appointments LIMIT 1');
  const existingAppointment = result.rows[0];
  console.log("DB returned:", existingAppointment);
  
  const ed = existingAppointment.date;
  const existingDateStr = ed 
    ? `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`
    : '';
    
  const est = existingAppointment.startTime;
  const existingTimeStr = est 
    ? `${String(est.getHours()).padStart(2, '0')}:${String(est.getMinutes()).padStart(2, '0')}`
    : '';

  console.log("Extracted DB date:", existingDateStr);
  console.log("Extracted DB time:", existingTimeStr);
  
  // Simulated incoming data
  const data = {
     date: new Date(ed.getTime() + 86400000).toISOString(),
     startTime: new Date(est.getTime() + 3600000).toISOString()
  };
  console.log("Incoming data:", data);

  const newDateStr = data.date && typeof data.date === 'string' 
    ? data.date.split('T')[0] 
    : (data.date ? new Date(data.date).toISOString().split('T')[0] : existingDateStr);
    
  const newTimeStr = data.startTime
    ? `${String(new Date(data.startTime).getHours()).padStart(2, '0')}:${String(new Date(data.startTime).getMinutes()).padStart(2, '0')}`
    : existingTimeStr;

  console.log("Extracted incoming date:", newDateStr);
  console.log("Extracted incoming time:", newTimeStr);

  pool.end();
}
run().catch(console.error);
