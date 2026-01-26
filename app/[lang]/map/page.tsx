'use client'

import dynamic from 'next/dynamic'

const AppointmentsMap = dynamic(() => import('./AppointmentsMap'), { ssr: false })

export default function MapPage() {
  return <AppointmentsMap />
}
