'use client'

import GenericTabelle from '@/components/GenericTabelle'
import { useScheduling } from '@/contexts/SchedulingContext'
import { useLanguage } from '@/hooks/useLanguage'
import { UserStar } from 'lucide-react'

export default function ClientsTable() {
  const { clients, isLoading, selectedDate, selectedAppointment, setSelectedAppointment } =
    useScheduling()
  const lang = useLanguage()
  const clientsData = clients.map(client => ({
    id: client.id,
    client: client.surname + ' ' + client.name,
    email: client.email,
    strasse: client.strasse,
    plz: client.plz,
    ort: client.ort,
    houseNumber: client.houseNumber,
  }))

  const columns = [
    { name: 'Kunde', uid: 'client', sortable: true },
    { name: 'E-Mail', uid: 'email', sortable: true },
    { name: 'Straße', uid: 'strasse', sortable: true },
    { name: 'Hausnummer', uid: 'houseNumber', sortable: true },
    { name: 'PLZ', uid: 'plz', sortable: true },
    { name: 'Ort', uid: 'ort', sortable: true },
  ]
  return (
    <div className="w-full h-full flex flex-col gap-1 px-1 sm:px-6 overflow-hidden">
      <div className="flex items-center gap-2">
        <UserStar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">Kunden</h1>
      </div>
      <GenericTabelle
        list={clientsData}
        isLoading={isLoading}
        titel="Clients"
        columns={columns}
        onRowClick={id => console.log('Clicked row:', id)}
      />
    </div>
  )
}
