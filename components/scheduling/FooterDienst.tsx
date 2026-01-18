'use client'

import { createPortal } from 'react-dom'
import { useState, useTransition, useRef, useEffect, useCallback, memo } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Button, Card, ScrollShadow, Separator } from '@heroui/react'
import { Client } from '@/types/scheduling'
import { usePlatformContext } from '@/contexts/PlatformContext'
import { useScheduling } from '@/contexts/SchedulingContext'
import { lightLayout } from '@heroui/theme'
import { Space } from 'lucide-react'

interface FooterDienstProps {
  className?: string
}

const DraggableItem = ({
  item,
  type,
  onDragStart,
}: {
  item: any
  type: 'client' | 'worker'
  onDragStart: (e: React.DragEvent, type: 'client' | 'worker', id: string) => void
}) => {
  const dragPreviewRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const name =
    type === 'client'
      ? (item as Client).surname + ' ' + (item as Client).name
      : (item as any).workerName

  const handleDragStartLocal = (e: React.DragEvent) => {
    onDragStart(e, type, item.id)

    if (dragPreviewRef.current) {
      const rect = dragPreviewRef.current.getBoundingClientRect()

      // По умолчанию: курсор в правом нижнем углу карточки (карточка слева-сверху от пальца)
      let offsetX = rect.width
      let offsetY = rect.height

      // Если места слева недостаточно (курсор близко к левому краю),
      // смещаем точку захвата влево (карточка будет справа от курсора)
      if (e.clientX < rect.width) {
        offsetX = 0
      }

      // Если места сверху недостаточно, смещаем точку захвата вверх (карточка будет снизу от курсора)
      if (e.clientY < rect.height) {
        offsetY = 0
      }

      e.dataTransfer.setDragImage(dragPreviewRef.current, offsetX, offsetY)
    }
  }

  const handleInteractionStart = () => setIsInteracting(true)
  const handleInteractionEnd = () => setIsInteracting(false)

  return (
    <>
      {isMounted &&
        createPortal(
          <div
            ref={dragPreviewRef}
            style={{ top: isInteracting ? '-1000px' : '-99999px', left: '-1000px' }}
            className="fixed w-48 z-[9999] pointer-events-none"
          >
            <div className="bg-white dark:bg-gray-900 rounded-none shadow-xl border-2 border-primary p-3">
              <div className="font-bold text-sm text-foreground truncate mb-1">{name}</div>
              <div className="text-xs text-default-500 flex items-center gap-1">
                {type === 'client' ? 'Kunde' : 'Fachkraft'}
              </div>
            </div>
          </div>,
          document.body
        )}
      <div
        draggable
        onDragStart={handleDragStartLocal}
        onDragEnd={handleInteractionEnd}
        onMouseEnter={handleInteractionStart}
        onMouseLeave={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        onTouchCancel={handleInteractionEnd}
        className="flex min-w-62.5 flex-row gap-3 p-3 border border-divider cursor-grab active:cursor-grabbing hover:border-primary transition-colors bg-white dark:bg-gray-800 rounded-xl shadow-sm"
      >
        <div className="flex flex-col justify-center gap-1 flex-1">
          <div className="text-sm font-semibold truncate">{name}</div>
        </div>
      </div>
    </>
  )
}

export default memo(FooterDienst)
function FooterDienst({ className }: FooterDienstProps) {
  const lang = useLanguage()
  const [activeTab, setActiveTab] = useState<'client' | 'staff'>('client')
  const [isPending, startTransition] = useTransition()
  const clientRef = useRef<HTMLDivElement>(null)
  const staffRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })
  const { isMobile, isReady } = usePlatformContext()
  const { clients, groups, workers, teams, groupedClients, teamsWithWorkers } = useScheduling()

  const [selectedGroups, setSelectedGroups] = useState('All Kunden')
  const [selectedTeams, setSelectedTeams] = useState('All Teams')

  const listGroups = () => {
    let listGroups = ['All Kunden']
    return listGroups.concat(groups.map(group => group.groupeName))
  }
  const listTeams = () => {
    let listTeams = ['All Teams']
    return listTeams.concat(teams.map(team => team.teamName))
  }

  useEffect(() => {
    const updateIndicator = () => {
      if (activeTab === 'client' && clientRef.current) {
        setIndicatorStyle({
          width: clientRef.current.offsetWidth,
          left: clientRef.current.offsetLeft,
        })
      } else if (activeTab === 'staff' && staffRef.current) {
        setIndicatorStyle({
          width: staffRef.current.offsetWidth,
          left: staffRef.current.offsetLeft,
        })
      }
    }
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab])
  const onPressClient = useCallback(() => {
    startTransition(() => {
      setActiveTab('client')
    })
  }, [startTransition])

  const onPressStaff = useCallback(() => {
    startTransition(() => {
      setActiveTab('staff')
    })
  }, [startTransition])

  const handleDragStart = (e: React.DragEvent, type: 'client' | 'worker', id: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, id }))
    e.dataTransfer.effectAllowed = 'copyMove'
  }

  const itemsToDisplay = activeTab === 'client' ? clients : workers

  return (
    <div className="flex-none h-32 shrink-0">
      <Card className="h-full p-0 ">
        <Card.Content className="p-0  h-full overflow-hidden">
          <ScrollShadow
            className="h-full  select-none "
            orientation="horizontal"
            hideScrollBar={true}
          >
            <div className="flex flex-row gap-4 h-full items-center">
              {/* List */}
              {itemsToDisplay.slice(0, 10).map(item => (
                <DraggableItem
                  key={item.id}
                  item={item}
                  type={activeTab === 'staff' ? 'worker' : 'client'}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </ScrollShadow>
          {/* Tabs */}
          <div className="flex w-full pt-2">
            {/* Groupe */}
            <div className="flex-1 flex justify-center">
              <div
                ref={clientRef}
                className="px-2 md:px-6 relative surface surface--tertiary h-10 md:h-10 flex items-center rounded-xl w-auto max-w-full focus-within:outline-none focus-within:ring-0"
              >
                <select
                  name="groupe"
                  value={selectedGroups}
                  onChange={e => {
                    setSelectedGroups(e.target.value)
                  }}
                  id="groupe"
                  className="w-auto px-2 py-0 text-lg font-normal md:text-base border-0 border-transparent outline-none cursor-pointer bg-transparent"
                  required
                  style={{
                    // Ensure consistent height and appearance on iOS
                    //   WebkitAppearance: 'none',
                    minHeight: '100%',
                    lineHeight: 'normal',
                    outline: 'none',
                    boxShadow: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {listGroups().map(groupName => (
                    <option key={groupName} value={groupName}>
                      {groupName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Teams */}
            <div className="flex-1 flex justify-center">
              <div
                ref={staffRef}
                className="px-2 md:px-6 relative surface surface--tertiary h-11 md:h-10 flex items-center rounded-xl w-auto max-w-full focus-within:outline-none focus-within:ring-0"
              >
                <select
                  name="team"
                  value={selectedTeams}
                  onChange={e => {
                    setSelectedTeams(e.target.value)
                  }}
                  id="team"
                  className="w-auto px-2 py-0 text-lg font-normal md:text-base border-0 border-transparent outline-none cursor-pointer bg-transparent"
                  required
                  style={{
                    // Ensure consistent height and appearance on iOS
                    //   WebkitAppearance: 'none',
                    minHeight: '100%',
                    lineHeight: 'normal',
                    outline: 'none',
                    boxShadow: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {listTeams().map(teamName => (
                    <option key={teamName} value={teamName}>
                      {teamName}
                    </option>
                  ))}
                </select>{' '}
              </div>
            </div>
          </div>
          <div className="relative w-full">
            <Separator />
            <div
              className="absolute bottom-0 h-0.5 bg-blue-500 transition-all duration-200 ease-out"
              style={{
                width: `${indicatorStyle.width}px`,
                left: `${indicatorStyle.left}px`,
              }}
            />
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}
