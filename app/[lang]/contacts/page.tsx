'use client'

import ContactsTable, { Contact } from '@/components/contacts/ContactsTable'

// Простая детерминированная функция для генерации "случайных" чисел на основе seed
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Пример данных - генерируем больше контактов для демонстрации
const generateMockContacts = (): Contact[] => {
  const contacts: Contact[] = [
    {
      id: '1',
      email: 'karavansky@gmail.com',
      subscribed: {
        email: true,
        sms: true,
      },
      blocklisted: false,
      landlineNumber: '+1234567890',
      lastChanged: new Date('2025-12-21'),
    },
    {
      id: '2',
      email: 'john.doe@example.com',
      subscribed: {
        email: true,
        sms: false,
      },
      blocklisted: false,
      landlineNumber: undefined,
      lastChanged: new Date('2025-11-15'),
    },
    {
      id: '3',
      email: 'jane.smith@example.com',
      subscribed: {
        email: false,
        sms: true,
      },
      blocklisted: true,
      landlineNumber: '+0987654321',
      lastChanged: new Date('2025-10-03'),
    },
  ]

  // Добавляем больше контактов для демонстрации пагинации (детерминированно)
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'test.com']
  const names = ['alice', 'bob', 'charlie', 'david', 'emma', 'frank', 'grace', 'henry', 'iris', 'jack']

  for (let i = 4; i <= 50; i++) {
    const nameIndex = Math.floor(seededRandom(i * 7) * names.length)
    const domainIndex = Math.floor(seededRandom(i * 13) * domains.length)
    const name = names[nameIndex]
    const domain = domains[domainIndex]

    contacts.push({
      id: `${i}`,
      email: `${name}${i}@${domain}`,
      subscribed: {
        email: seededRandom(i * 17) > 0.3,
        sms: seededRandom(i * 19) > 0.5,
      },
      blocklisted: seededRandom(i * 23) > 0.9,
      landlineNumber: seededRandom(i * 29) > 0.5
        ? `+${1000000000 + Math.floor(seededRandom(i * 31) * 9000000000)}`
        : undefined,
      lastChanged: new Date(2025, Math.floor(seededRandom(i * 37) * 12), Math.floor(seededRandom(i * 41) * 28) + 1),
    })
  }

  return contacts
}

const mockContacts = generateMockContacts()

export default function ContactsPage() {
  const handleCreateContact = () => {
    console.log('Create contact clicked')
    // Здесь можно открыть модальное окно для создания контакта
  }

  const handleImportContacts = () => {
    console.log('Import contacts clicked')
    // Здесь можно открыть диалог импорта контактов
  }

  return (
    <ContactsTable
      contacts={mockContacts}
      onCreateContact={handleCreateContact}
      onImportContacts={handleImportContacts}
    />
  )
}
