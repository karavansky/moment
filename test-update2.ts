import { getAppointmentsByFirmaID, updateAppointment } from './lib/appointments';

async function run() {
  const firmaID = process.env.FIRMA_ID || '1df29cfd-11d2-4828-87ee-c313a059dce8';
  console.log("Fetching appointments...");
  const apps = await getAppointmentsByFirmaID(firmaID);
  if (apps.length === 0) {
     console.log('No appointments found.');
     process.exit(0);
  }
  const apt = apps[0];
  console.log("Testing with appointment:", apt.appointmentID, "workerIds:", apt.workerIds);
  
  const originalDate = new Date(apt.date);
  const originalStartTime = new Date(apt.startTime);
  
  const newStartTime = new Date(originalStartTime);
  newStartTime.setHours(newStartTime.getHours() + 1);
  
  await updateAppointment(apt.appointmentID, firmaID, {
      date: originalDate.toISOString(),
      startTime: newStartTime.toISOString(),
      workerIds: apt.workerIds,
      isOpen: apt.isOpen
  });
  
  console.log("Update complete!");
  process.exit(0); // Exit immediately to close db pool
}

run().catch(e => { console.error(e); process.exit(1); });
