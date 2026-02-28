import dotenv from 'dotenv';
import fs from 'fs';
const env = dotenv.parse(fs.readFileSync('.env'));
process.env = { ...process.env, ...env };

import { createAppointment } from './lib/appointments';

async function run() {
  const firmaID = process.env.FIRMA_ID || '1df29cfd-11d2-4828-87ee-c313a059dce8';
  try {
    console.log("Creating test appointment...");
    const apt = await createAppointment(firmaID, {
      userID: '0Yz2ej0jBgu3lignhmFc', // Valid UUIDish or admin ID usually
      clientID: '875f56b1-6b27-4cbe-98c4-c8c7c7f3e098', // Must exist in DB
      workerIds: [],
      date: new Date().toISOString(),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 60
    });
    console.log("Success!", apt);
  } catch (err) {
    console.error("Create failed:", err);
  }
}
run().then(() => process.exit(0)).catch(console.error);
