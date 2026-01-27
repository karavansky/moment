'use client'

import dynamic from 'next/dynamic'
import { use } from 'react'

const AppointmentsMap = dynamic(() => import('./AppointmentsMap'), { ssr: false })

export default function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return <AppointmentsMap slug={id} />
}
