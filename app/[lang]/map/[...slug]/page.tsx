'use client'

import dynamic from 'next/dynamic'
import { use } from 'react'

const AppointmentsMap = dynamic(() => import('./AppointmentsMap'), { ssr: false })

export default function MapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params) as unknown as { slug: string }

  return <AppointmentsMap slug={slug} />
}
