'use client'

import dynamic from 'next/dynamic'
import { use } from 'react'

const AppointmentsMap = dynamic(() => import('./AppointmentsMap'), { ssr: false })

export default function MapPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = use(params)

  return <AppointmentsMap slug={slug?.[0]} />
}
