const existingAppointment = {
  date: new Date('2026-02-28T00:00:00.000Z'), // Server parsed DB Date
  startTime: new Date('2026-02-28T09:00:00.000Z')
};

const data = {
  date: '2026-03-01', // Front-end sent
  startTime: '2026-03-01T09:00:00.000Z'
};

const ed = existingAppointment.date
const existingDateStr = ed 
  ? `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`
  : ''

const newDateStr = data.date && typeof data.date === 'string' 
  ? data.date.split('T')[0] 
  : (data.date ? new Date(data.date).toISOString().split('T')[0] : existingDateStr)

const isDateChanged = newDateStr !== existingDateStr

const est = existingAppointment.startTime
const existingTimeStr = est 
  ? `${String(est.getHours()).padStart(2, '0')}:${String(est.getMinutes()).padStart(2, '0')}`
  : ''

const newTimeStr = data.startTime
  ? `${String(new Date(data.startTime).getHours()).padStart(2, '0')}:${String(new Date(data.startTime).getMinutes()).padStart(2, '0')}`
  : existingTimeStr

const isTimeChanged = newTimeStr !== existingTimeStr

console.log(`[push-debug] date: ${newDateStr} vs ${existingDateStr} -> ${isDateChanged}`)
console.log(`[push-debug] startTime: ${newTimeStr} vs ${existingTimeStr} -> ${isTimeChanged}`)
