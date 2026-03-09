'use client'

import dynamic from 'next/dynamic'
import { use } from 'react'
import { Tabs } from '@heroui/react'

const AppointmentsMap = dynamic(() => import('./AppointmentsMap'), { ssr: false })
const DispatcherView = dynamic(() => import('./DispatcherView'), { ssr: false })

export default function MapPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = use(params)

  return (
    <div className="h-screen flex flex-col">
      <Tabs defaultSelectedKey="appointments" className="flex-1 flex flex-col">
        <Tabs.ListContainer className="px-4 pt-4">
          <Tabs.List aria-label="Map views">
            <Tabs.Tab id="appointments">
              Записи
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="dispatcher">
              Диспетчерская
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="appointments" className="flex-1 overflow-hidden">
          <AppointmentsMap slug={slug?.[0]} />
        </Tabs.Panel>
        <Tabs.Panel id="dispatcher" className="flex-1 overflow-hidden">
          <DispatcherView />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
