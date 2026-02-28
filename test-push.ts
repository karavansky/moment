import dotenv from 'dotenv';
dotenv.config();

import { sendPushToWorkers } from './lib/push-notifications.js';

async function run() {
  try {
    console.log("Sending test push...");
    // Replace with a valid worker UUID from your DB if needed, or we just rely on it failing and catching the exact error
    await sendPushToWorkers(['00000000-0000-0000-0000-000000000000'], {
      title: 'Direct API Test',
      body: 'Testing web push functionality directly',
    });
    console.log("Push sent (or skipped if no user found).");
  } catch (err) {
    console.error("Caught error testing push:", err);
  }
}

run().then(() => process.exit(0)).catch(console.error);
