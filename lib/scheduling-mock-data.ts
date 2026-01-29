import {
  Groupe,
  Client,
  Team,
  Worker,
  Appointment,
  Report,
  User,
  DateAppointmentView,
  Service,
  ServiceGroup,
  ServiceTreeItem,
} from '@/types/scheduling'

// Генерация UUID (простая версия для мок-данных)
const generateId = () => crypto.randomUUID()

// Функция для добавления дней к дате
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Функция для добавления часов к дате
const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}
const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}
// Функция для получения только даты без времени
const getOnlyDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Функция генерации всех Sample данных (как в Swift getAllSampleObjects)
// Данные генерируются динамически относительно текущей даты
export const getAllSampleObjects = () => {
  const currentDate = new Date()
  const firmaID = generateId()

  // User
  const user: User = {
    id: generateId(),
    firmaID: firmaID,
    userName: 'Warsteiner',
  }

  // Teams
  const team1: Team = {
    id: generateId(),
    teamName: 'Pflege',
    firmaID: firmaID,
  }

  const team2: Team = {
    id: generateId(),
    teamName: 'Reinigung',
    firmaID: firmaID,
  }

  // Categories
  const group1: Groupe = {
    id: generateId(),
    firmaID: firmaID,
    groupeName: 'VIP',
  }

  const group2: Groupe = {
    id: generateId(),
    firmaID: firmaID,
    groupeName: 'Normal',
  }

  // Workers - Team 1 (Pflege)
  const worker_1: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Tom',
    surname: 'Hanks',
    teamId: team1.id,
    team: team1,
    isAdress: false,
    status: 0,
    email: 'tom.hanks@example.com',
  }

  const worker_2: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Leonardo',
    surname: 'DiCaprio',
    teamId: team2.id,
    team: team2,
    isAdress: false,
    status: 0,
    email: 'leonardo.dicaprio@example.com',
    }

  const worker_3: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Brad',
    surname: 'Pitt',
    teamId: team1.id,
    team: team1,
    isAdress: false,
    status: 0,
    email: 'brad.pitt@example.com',
  }

  const worker_4: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Johnny',
    surname: 'Depp',
    teamId: team1.id,
    team: team1,
    isAdress: false,
    status: 0,
    email: 'johnny.depp@example.com',
    }

  const worker_5: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Robert',
    surname: 'Downey',
    teamId: team1.id,
    team: team1,
    isAdress: false,
    status: 0,
    email: 'robert.downey@example.com',

  }

  const worker_6: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Denzel',
    surname: 'Washington',
    teamId: team1.id,
    team: team1,
    isAdress: false,
    status: 0,
    email: 'denzel.washington@example.com',
  }

  const worker_7: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Morgan',
    surname: 'Freeman',
    teamId: team1.id,
    team: team1,
    isAdress: false,
    status: 0,
    email: 'morgan.freeman@example.com',
  }

  const worker_8: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Matt',
    surname: 'Damon',
    teamId: team1.id,
    team: team1,
    isAdress: false,
    status: 0,
    email: 'matt.damon@example.com',
  }

  // Workers - Team 2 (Reinigung)
  const worker_11: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Ryan',
    surname: 'Gosling',
    teamId: team2.id,
    team: team2,
    isAdress: false,
    status: 0,
    email: 'ryan.gosling@example.com',

  }

  const worker_21: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Chris',
    surname: 'Hemsworth',
    teamId: team2.id,
    team: team2,
    isAdress: false,
    status: 0,
    email: 'chris.hemsworth@example.com',
  }

  const worker_31: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Scarlett',
    surname: 'Johansson',
    teamId: team2.id,
    team: team2,
    isAdress: false,
    status: 0,
    email: 'scarlett.johansson@example.com',
  }

  const worker_41: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Meryl',
    surname: 'Streep',
    teamId: team2.id,
    team: team2,
    isAdress: false,
    status: 0,
    email: 'meryl.streep@example.com',
  }

  const worker_51: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Angelina',
    surname: 'Jolie',
    teamId: team2.id,
    team: team2,
    isAdress: false,
    status: 0,
    email: 'angelina.jolie@example.com',
  }

  const worker_61: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Nicole',
    surname: 'Kidman',
    teamId: team2.id,
    team: team2,
    isAdress: false,
    status: 0,
    email: 'nicole.kidman@example.com',
  }

  const worker_71: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Natalie',
    surname: 'Portman',
    teamId: team2.id,
    team: team2,
    isAdress: false,
    status: 0,
    email: 'natalie.portman@example.com',
  }

  const worker_81: Worker = {
    id: generateId(),
    firmaID: firmaID,
    name: 'Julia',
    surname: 'Roberts',
    teamId: team2.id,
    team: team2,
    isAdress: false,
    status: 0,
    email: 'julia.roberts@example.com',
  }

  // Clients
  const client_1: Client = {
    id: generateId(),
    firmaID: firmaID,
    status: 0,
    name: 'Emma',
    surname: 'Stone',
    email: 'emma.stone@example.com',
    street: 'Burgstarsse',
    postalCode: '53177',
    city: 'München',
    country: 'DE',
    houseNumber: '157',
    latitude: 0,
    longitude: 0,
    groupe: group1,
  }

  const client_2: Client = {
    id: generateId(),
    firmaID: firmaID,
    status: 0,
    name: 'Jennifer',
    surname: 'Lawrence',
    email: 'jennifer.lawrence@example.com',
    country: 'DE',
    street: 'Taunusstraße',
    postalCode: '51105',
    city: 'Köln',
    houseNumber: '5',
    latitude: 50.9346808,
    longitude: 6.9977416,
    groupe: group2,
  }
  const client_3: Client = {
    id: generateId(),
    firmaID: firmaID,
    status: 1,
    name: 'Anne',
    surname: 'Hathaway',
    email: 'anne.hathaway@example.com',
    street: 'Burgstarsse',
    postalCode: '53177',
    city: 'München',
    country: 'DE',
    houseNumber: '157',
    latitude: 0,
    longitude: 0,
    groupe: group1,
  }

  const client_4: Client = {
    id: generateId(),
    firmaID: firmaID,
    status: 2,
    name: 'George',
    surname: 'Clooney',
    email: 'george.clooney@example.com',
    street: 'Probsteigasse',
    district: 'Altstadt-Nord', 
    postalCode: '50670',
    city: 'Köln',
    houseNumber: '5',
    country: 'DE',
    latitude:  50.9441319,
    longitude: 6.945430631046603,
    groupe: group2,
  }

  // Appointment Dates - динамически относительно текущей даты
  const appointmentDate_1 = addDays(currentDate, -1) // вчера
  const appointmentDate_2 = addDays(currentDate, -3) // 3 дня назад
  const appointmentDate_3 = addDays(currentDate, 3) // через 3 дня
  const appointmentDate_4 = addDays(currentDate, 4) // через 4 дня
  const appointmentDate_5 = addDays(currentDate, -2) // 2 дня назад
  const appointmentDate_6 = addDays(currentDate, 0) // сегодня
  const appointmentDate_7 = addDays(currentDate, 1) // завтра
  const appointmentDate_8 = addDays(currentDate, 3) // через 3 дня

  // Добавляем больше дат для следующих месяцев
  const appointmentDate_9 = addDays(currentDate, 7) // через неделю
  const appointmentDate_10 = addDays(currentDate, 10) // через 10 дней
  const appointmentDate_11 = addDays(currentDate, -14) // через 2 недели
  const appointmentDate_12 = addDays(currentDate, 20) // через 20 дней
  const appointmentDate_13 = addDays(currentDate, 25) // через 25 дней
  const appointmentDate_14 = addDays(currentDate, -30) // через месяц
  const appointmentDate_15 = addDays(currentDate, 35) // через 35 дней
  const appointmentDate_16 = addDays(currentDate, 40) // через 40 дней
  const appointmentDate_17 = addDays(currentDate, 45) // через 45 дней
  const appointmentDate_18 = addDays(currentDate, 50) // через 50 дней
  const appointmentDate_19 = addDays(currentDate, 55) // через 55 дней
  const appointmentDate_20 = addDays(currentDate, 60) // через 2 месяца

    // Services (дерево услуг)
  const serviceGroup_1: ServiceGroup = {
    id: generateId(),
    firmaID,
    name: 'Grundpflege',
    description: 'Grundlegende Pflegeleistungen',
    parentId: null,
    isGroup: true,
    order: 1,
  }

  const serviceGroup_2: ServiceGroup = {
    id: generateId(),
    firmaID,
    name: 'Behandlungspflege',
    description: 'Medizinische Behandlungspflege',
    parentId: null,
    isGroup: true,
    order: 2,
  }

  const serviceGroup_3: ServiceGroup = {
    id: generateId(),
    firmaID,
    name: 'Hauswirtschaft',
    description: 'Hauswirtschaftliche Versorgung',
    parentId: null,
    isGroup: true,
    order: 3,
  }

  const serviceGroup_1_1: ServiceGroup = {
    id: generateId(),
    firmaID,
    name: 'Körperpflege',
    description: 'Körperpflege und Hygiene',
    parentId: serviceGroup_1.id,
    isGroup: true,
    order: 1,
  }

  const serviceGroup_1_2: ServiceGroup = {
    id: generateId(),
    firmaID,
    name: 'Mobilität',
    description: 'Hilfe bei der Mobilität',
    parentId: serviceGroup_1.id,
    isGroup: true,
    order: 2,
  }

  const serviceGroup_3_1: ServiceGroup = {
    id: generateId(),
    firmaID,
    name: 'Bei Bedarf',
    description: 'Verschiedene hauswirtschaftliche Tätigkeiten',
    parentId: serviceGroup_3.id,
    isGroup: true,
    order: 1,
  }

  const service_1: Service = {
    id: generateId(),
    firmaID,
    name: 'Ganzkörperwäsche',
    description: 'Vollständige Körperwäsche',
    duration: 30,
    price: 25,
    parentId: serviceGroup_1_1.id,
    isGroup: false,
    order: 1,
  }

  const service_2: Service = {
    id: generateId(),
    firmaID,
    name: 'Teilwäsche',
    description: 'Teilweise Körperwäsche',
    duration: 15,
    price: 15,
    parentId: serviceGroup_1_1.id,
    isGroup: false,
    order: 2,
  }

  const service_3: Service = {
    id: generateId(),
    firmaID,
    name: 'Duschen/Baden',
    description: 'Hilfe beim Duschen oder Baden',
    duration: 45,
    price: 35,
    parentId: serviceGroup_1_1.id,
    isGroup: false,
    order: 3,
  }

  const service_4: Service = {
    id: generateId(),
    firmaID,
    name: 'Hilfe beim Aufstehen',
    description: 'Unterstützung beim Aufstehen aus dem Bett',
    duration: 10,
    price: 10,
    parentId: serviceGroup_1_2.id,
    isGroup: false,
    order: 1,
  }

  const service_5: Service = {
    id: generateId(),
    firmaID,
    name: 'Transfer Rollstuhl',
    description: 'Transfer in den Rollstuhl',
    duration: 15,
    price: 12,
    parentId: serviceGroup_1_2.id,
    isGroup: false,
    order: 2,
  }

  const service_6: Service = {
    id: generateId(),
    firmaID,
    name: 'Medikamentengabe',
    description: 'Verabreichung von Medikamenten',
    duration: 10,
    price: 8,
    parentId: serviceGroup_2.id,
    isGroup: false,
    order: 1,
  }

  const service_7: Service = {
    id: generateId(),
    firmaID,
    name: 'Wundversorgung',
    description: 'Versorgung von Wunden',
    duration: 20,
    price: 20,
    parentId: serviceGroup_2.id,
    isGroup: false,
    order: 2,
  }

  const service_8: Service = {
    id: generateId(),
    firmaID,
    name: 'Insulininjektion',
    description: 'Verabreichung von Insulin',
    duration: 10,
    price: 10,
    parentId: serviceGroup_2.id,
    isGroup: false,
    order: 3,
  }

  const service_9: Service = {
    id: generateId(),
    firmaID,
    name: 'Einkaufen',
    description: 'Einkäufe erledigen',
    duration: 60,
    price: 30,
    parentId: serviceGroup_3.id,
    isGroup: false,
    order: 1,
  }

  const service_10: Service = {
    id: generateId(),
    firmaID,
    name: 'Kochen',
    description: 'Zubereitung von Mahlzeiten',
    duration: 45,
    price: 25,
    parentId: serviceGroup_3.id,
    isGroup: false,
    order: 2,
  }

  const service_11: Service = {
    id: generateId(),
    firmaID,
    name: 'Wäsche waschen',
    description: 'Waschen und Trocknen von Wäsche',
    duration: 30,
    price: 18,
    parentId: serviceGroup_3.id,
    isGroup: false,
    order: 3,
  }
  const service_12: Service = {
    id: generateId(),
    firmaID,
    name: '30 Minuten',
    description: 'Hilfe',
    duration: 30,
    price: 18,
    parentId: serviceGroup_3_1.id,
    isGroup: false,
    order: 1,
  }
  
  // Appointments
  const appointment_1: Appointment = {
    id: generateId(),
    userID: worker_1.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_1),
    isFixedTime: false,
    startTime: appointmentDate_1,
    endTime: addHours(appointmentDate_1, 1),
    duration: 90,
    fahrzeit: 0,
    workerId: worker_1.id,
    worker: [worker_1],
    isOpen: false,
    services: [],
  }

  const appointment_2: Appointment = {
    id: generateId(),
    userID: worker_2.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_2),
    isFixedTime: false,
    startTime: appointmentDate_2,
    endTime: addHours(appointmentDate_2, 1),
    duration: 60,
    fahrzeit: 0,
    workerId: worker_2.id,
    worker: [worker_2],
    isOpen: false,
    services: [],
  }

  const appointment_3: Appointment = {
    id: generateId(),
    userID: worker_3.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_3),
    isFixedTime: false,
    startTime: appointmentDate_3,
    endTime: addHours(appointmentDate_3, 1),
    duration: 30,
    fahrzeit: 0,
    workerId: worker_3.id,
    worker: [worker_3],
    isOpen: false,
    services: [],
  }

  const appointment_4: Appointment = {
    id: generateId(),
    userID: worker_4.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_4),
    isFixedTime: false,
    startTime: appointmentDate_4,
    endTime: addHours(appointmentDate_4, 1),
    duration: 30,
    fahrzeit: 0,
    workerId: worker_4.id,
    worker: [worker_4],
    isOpen: false,
    services: [],
  }

  const appointment_5: Appointment = {
    id: generateId(),
    userID: worker_5.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_5),
    isFixedTime: false,
    startTime: appointmentDate_5,
    endTime: addHours(appointmentDate_5, 1),
    duration: 60,
    fahrzeit: 0,
    workerId: worker_5.id,
    worker: [worker_5],
    isOpen: false,
    services: [],
  }

  const appointment_6: Appointment = {
    id: "001", //generateId(),
    userID: worker_6.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_6),
    isFixedTime: false,
    startTime: appointmentDate_6,
    endTime: addHours(appointmentDate_6, 1),
    duration: 30,
    fahrzeit: 0,
    workerId: worker_6.id,
    worker: [worker_6],
    isOpen: false,
    latitude: 50.9346808,
    longitude: 6.9977416,
    services: [service_12],
   // openedAt: addMinutes(appointmentDate_6, -3),
  }

  const appointment_7: Appointment = {
    id: generateId(),
    userID: worker_7.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_7),
    isFixedTime: false,
    startTime: appointmentDate_7,
    endTime: addHours(appointmentDate_7, 1),
    duration: 30,
    fahrzeit: 0,
    workerId: worker_7.id,
    worker: [worker_7],
    isOpen: false,
    services: [],
  }

  const appointment_8: Appointment = {
    id: generateId(),
    userID: worker_8.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_8),
    isFixedTime: false,
    startTime: appointmentDate_8,
    endTime: addHours(appointmentDate_8, 1),
    duration: 30,
    fahrzeit: 0,
    workerId: worker_8.id,
    worker: [worker_8],
    isOpen: false,
    services: [],
  }

  // Дополнительные appointments на следующие месяцы
  const appointment_9: Appointment = {
    id: generateId(),
    userID: worker_11.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_9),
    isFixedTime: false,
    startTime: appointmentDate_9,
    endTime: addHours(appointmentDate_9, 1),
    duration: 60,
    fahrzeit: 0,
    workerId: worker_11.id,
    worker: [worker_11],
    isOpen: false,
    services: [],
  }

  const appointment_10: Appointment = {
    id: generateId(),
    userID: worker_21.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_10),
    isFixedTime: true,
    startTime: appointmentDate_10,
    endTime: addHours(appointmentDate_10, 1),
    duration: 45,
    fahrzeit: 0,
    workerId: worker_21.id,
    worker: [worker_21],
    isOpen: false,
    services: [],
  }

  const appointment_11: Appointment = {
    id: generateId(),
    userID: worker_31.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_11),
    isFixedTime: false,
    startTime: appointmentDate_11,
    endTime: addHours(appointmentDate_11, 1),
    duration: 30,
    fahrzeit: 0,
    workerId: worker_31.id,
    worker: [worker_31],
    isOpen: false,
    services: [],
  }

  const appointment_12: Appointment = {
    id: generateId(),
    userID: worker_41.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_12),
    isFixedTime: true,
    startTime: appointmentDate_12,
    endTime: addHours(appointmentDate_12, 1),
    duration: 90,
    fahrzeit: 0,
    workerId: worker_41.id,
    worker: [worker_41],
    isOpen: false,
    services: [],
  }

  const appointment_13: Appointment = {
    id: generateId(),
    userID: worker_51.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_13),
    isFixedTime: false,
    startTime: appointmentDate_13,
    endTime: addHours(appointmentDate_13, 1),
    duration: 60,
    fahrzeit: 0,
    workerId: worker_51.id,
    worker: [worker_51],
    isOpen: false,
    services: [],
  }

  const appointment_14: Appointment = {
    id: generateId(),
    userID: worker_61.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_14),
    isFixedTime: true,
    startTime: appointmentDate_14,
    endTime: addHours(appointmentDate_14, 1),
    duration: 45,
    fahrzeit: 0,
    workerId: worker_61.id,
    worker: [worker_61],
    isOpen: false,
    services: [],
  }

  const appointment_15: Appointment = {
    id: generateId(),
    userID: worker_71.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_15),
    isFixedTime: false,
    startTime: appointmentDate_15,
    endTime: addHours(appointmentDate_15, 1),
    duration: 30,
    fahrzeit: 0,
    workerId: worker_71.id,
    worker: [worker_71],
    isOpen: false,
    services: [],
  }

  const appointment_16: Appointment = {
    id: generateId(),
    userID: worker_81.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_16),
    isFixedTime: true,
    startTime: appointmentDate_16,
    endTime: addHours(appointmentDate_16, 1),
    duration: 60,
    fahrzeit: 0,
    workerId: worker_81.id,
    worker: [worker_81],
    isOpen: false,
    services: [],
  }

  const appointment_17: Appointment = {
    id: generateId(),
    userID: worker_1.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_17),
    isFixedTime: false,
    startTime: appointmentDate_17,
    endTime: addHours(appointmentDate_17, 1),
    duration: 90,
    fahrzeit: 0,
    workerId: worker_1.id,
    worker: [worker_1],
    isOpen: false,
    services: [],
  }

  const appointment_18: Appointment = {
    id: generateId(),
    userID: worker_2.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_18),
    isFixedTime: true,
    startTime: appointmentDate_18,
    endTime: addHours(appointmentDate_18, 1),
    duration: 45,
    fahrzeit: 0,
    workerId: worker_2.id,
    worker: [worker_2],
    isOpen: false,
    services: [],
  }

  const appointment_19: Appointment = {
    id: generateId(),
    userID: worker_3.id,
    clientID: client_1.id,
    client: client_1,
    date: getOnlyDate(appointmentDate_19),
    isFixedTime: false,
    startTime: appointmentDate_19,
    endTime: addHours(appointmentDate_19, 1),
    duration: 60,
    fahrzeit: 0,
    workerId: worker_3.id,
    worker: [worker_3],
    isOpen: false,
    services: [],
  }

  const appointment_20: Appointment = {
    id: generateId(),
    userID: worker_4.id,
    clientID: client_2.id,
    client: client_2,
    date: getOnlyDate(appointmentDate_20),
    isFixedTime: true,
    startTime: appointmentDate_20,
    endTime: addHours(appointmentDate_20, 1),
    duration: 30,
    fahrzeit: 0,
    workerId: worker_4.id,
    worker: [worker_4],
    isOpen: false,
    services: [],
  }

  // Reports
  const report1: Report = {
    id: generateId(),
    firmaID: firmaID,
    worker: worker_1,
    photos: 'twinlake',
    appointmentId: appointment_1.id,
    appointment: appointment_1,
    workerId: worker_1.id,
  }

  const report2: Report = {
    id: generateId(),
    firmaID: firmaID,
    worker: worker_1,
    photos: 'chilkoottrail',
    appointmentId: appointment_1.id,
    appointment: appointment_1,
    workerId: worker_1.id,
  }

  // Добавляем reports к appointments
  appointment_1.reports = [report1]
  appointment_5.reports = [report2]



  const services: ServiceTreeItem[] = [
    serviceGroup_1,
    serviceGroup_2,
    serviceGroup_3,
    serviceGroup_1_1,
    serviceGroup_1_2,
    serviceGroup_3_1,
    service_1,
    service_2,
    service_3,
    service_4,
    service_5,
    service_6,
    service_7,
    service_8,
    service_9,
    service_10,
    service_11,
    service_12,
  ]

  return {
    user,
    teams: [team1, team2],
    groups: [group1, group2],
    workers: [
      worker_1,
      worker_2,
      worker_3,
      worker_4,
      worker_5,
      worker_6,
      worker_7,
      worker_8,
      worker_11,
      worker_21,
      worker_31,
      worker_41,
      worker_51,
      worker_61,
      worker_71,
      worker_81,
    ],
    clients: [client_1, client_2, client_3, client_4],
    appointments: [
      appointment_1,
      appointment_2,
      appointment_3,
      appointment_4,
      appointment_5,
      appointment_6,
      appointment_7,
      appointment_8,
      appointment_9,
      appointment_10,
      appointment_11,
      appointment_12,
      appointment_13,
      appointment_14,
      appointment_15,
      appointment_16,
      appointment_17,
      appointment_18,
      appointment_19,
      appointment_20,
    ],
    reports: [report1, report2],
    services,
    firmaID,
  }
}

// Функция генерации календарных дней с назначениями
// Принимает массив appointments и генерирует календарь
export const generateDateAppointmentViews = (
  appointments: Appointment[],
  startOffset: number = -7,
  monthsAhead: number = 3
): DateAppointmentView[] => {
  const result: DateAppointmentView[] = []
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() + startOffset)

  const endDate = new Date(today)
  endDate.setMonth(endDate.getMonth() + monthsAhead)

  const dayMs = 24 * 60 * 60 * 1000
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs)

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + i)

    const dayOfWeek = currentDate.toLocaleDateString('de-DE', { weekday: 'short' })
    const day = currentDate.getDate().toString()

    // Фильтруем назначения для этого дня
    const dayAppointments = appointments.filter(
      (apt: Appointment) => apt.date.toDateString() === currentDate.toDateString()
    )

    result.push({
      id: generateId(),
      date: currentDate,
      dayOfWeek,
      day,
      appointments: dayAppointments,
    })
  }

  return result
}

// Экспорт функции для получения полного набора мок-данных
export default getAllSampleObjects

{/* 

Workers (Team 1 - Pflege):

worker_1: Tom Hanks
worker_2: Leonardo DiCaprio
worker_3: Brad Pitt
worker_4: Johnny Depp
worker_5: Robert Downey
worker_6: Denzel Washington
worker_7: Morgan Freeman
worker_8: Matt Damon

Workers (Team 2 - Reinigung):

worker_11: Ryan Gosling
worker_21: Chris Hemsworth
worker_31: Scarlett Johansson
worker_41: Meryl Streep
worker_51: Angelina Jolie
worker_61: Nicole Kidman
worker_71: Natalie Portman
worker_81: Julia Roberts

Clients:

client_1: Emma Stone
client_2: Jennifer Lawrence
client_3: Anne Hathaway
client_4: George Clooney (уже был)

  */}