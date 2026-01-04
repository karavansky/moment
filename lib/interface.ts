

export type Ticket = {
  ticketID: string,
  subject: string,
  category: number,
  pripority: number,
  date: string | Date,
  userID: string,
  messageCount?: number,
  unreadCount?: number
}
export type Message = {
  messageID: string,    
  ticketID: string,
  userID: string,
  message: string,
  isAdmin: boolean,
  isRead: boolean,
  date: string,
  dateRead: string | null
}
// What devices does QuailBreeder support?
// Is there an Android or Web version available?'
// A: QuailBreeder is available exclusively for iOS. You can download it directly from the Apple App Store for your iPhone or iPad. We chose iOS to provide a high-performance, native experience optimized specifically for the Apple ecosystem.
// What types of equipment can I manage?
// A: You can configure and track three distinct types of equipment: Incubators, Brooders, and Cages. The system provides a visual display of the current load for each type, helping you optimize your batch scheduling.

export const ticketExample: Ticket[] = [{
  ticketID: '12345',
  subject: 'Is there an Android or Web version available?',
  category: 1,
  pripority: 2,
  date: '2024-01-01 10:12:00',
  userID: 'ExampleUserID',
  messageCount: 3,
  unreadCount: 0,
},
{
  ticketID: '12346',
  subject: 'What types of equipment can I manage?',
  category: 1,
  pripority: 2,
  date: '2024-03-01 19:40:00',
  userID: 'ExampleUserID',
  messageCount: 2,
  unreadCount: 1,
}]