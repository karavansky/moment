'use client'

import { useState, useTransition, useRef, useEffect, useCallback, memo } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Button, Card, ScrollShadow, Separator } from '@heroui/react'
import { Client, Worker } from '@/types/scheduling'
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
  item: Client | Worker
  type: 'client' | 'worker'
  onDragStart: (e: React.DragEvent, type: 'client' | 'worker', id: string) => void
}) => {
  const name =
    type === 'client'
      ? (item as Client).surname + ' ' + (item as Client).name
      : (item as Worker).surname + ' ' + (item as Worker).name

  const handleDragStartLocal = (e: React.DragEvent) => {
    console.log('[DraggableItem] Drag start', { type, name })
    onDragStart(e, type, item.id)

    // --- Canvas Generation Logic ---
    try {
      const canvas = document.createElement('canvas')
      const width = 200
      const height = 64
      const scale = window.devicePixelRatio > 1 ? 2 : 1 // Cap at 2x for performance/compatibility

      canvas.width = width * scale
      canvas.height = height * scale
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('Failed to get 2D context')
        return
      }

      ctx.scale(scale, scale)

      const isDark = document.documentElement.classList.contains('dark')

      // --- Workaround for WebKit alpha channel bug ---
      // Fill the entire canvas with a solid color matching the page background.
      // This avoids transparency, which iOS renders as black corners.
    //  ctx.fillStyle = isDark ? '#111827' : '#ffffff' // bg-gray-900 or white
     
      
      // Draw rounded rectangle (fallback for older browsers)
      const x = 2,
        y = 2,
        w = width - 4,
        h = height - 4,
        r = 12
        /* End workaround ---

      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
*/
      // Fill and Stroke
      ctx.fillStyle = isDark ? '#1f2937' : '#ffffff' // bg-gray-800 or white
      ctx.fillRect(0, 0, width, height)

     // ctx.fill()
     // ctx.lineWidth = 2
      // ctx.strokeStyle = '#006FEE' // primary color
      // ctx.stroke()

      // Text
      ctx.fillStyle = isDark ? '#ffffff' : '#000000'
      ctx.font = 'bold 14px system-ui, sans-serif'
      ctx.fillText(name, x + 12, y + 24, w - 24)

      ctx.fillStyle = '#71717a' // text-default-500
      ctx.font = '12px system-ui, sans-serif'
      ctx.fillText(type === 'client' ? 'Kunde' : 'Fachkraft', x + 12, y + 44, w - 24)

      // Add to DOM for iOS compatibility
      canvas.style.position = 'fixed'
      canvas.style.top = '-9999px'
      canvas.style.left = '-9999px'
      document.body.appendChild(canvas)

      // Set drag image
      let offsetX = width
      let offsetY = height
      if (e.clientX < width) offsetX = 0
      if (e.clientY < height) offsetY = 0
      e.dataTransfer.setDragImage(canvas, offsetX, offsetY)

      // Cleanup
      setTimeout(() => {
        if (document.body.contains(canvas)) {
          document.body.removeChild(canvas)
        }
      }, 0)
    } catch (err) {
      console.error('[DraggableItem] Error generating canvas drag image:', err)
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStartLocal}
      onContextMenu={(e) => e.preventDefault()}
      className="flex flex-row gap-3 p-3 border border-divider cursor-grab active:cursor-grabbing hover:border-primary transition-colors bg-white dark:bg-gray-800 rounded-xl shadow-sm"
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      <div className="flex flex-col justify-center gap-1 flex-1">
        <div className="text-sm font-semibold whitespace-nowrap">{name}</div>
      </div>
    </div>
  )
}

// DOM Clone version for non-iOS devices
const DraggableItemClone = ({
  item,
  type,
  onDragStart,
}: {
  item: Client | Worker
  type: 'client' | 'worker'
  onDragStart: (e: React.DragEvent, type: 'client' | 'worker', id: string) => void
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const name =
    type === 'client'
      ? (item as Client).surname + ' ' + (item as Client).name
      : (item as Worker).surname + ' ' + (item as Worker).name

  const handleMouseDown = () => {
    setIsPressed(true)
  }

  const handleMouseUp = () => {
    setIsPressed(false)
  }

  const handleDragStartLocal = (e: React.DragEvent) => {
    console.log('[DraggableItemClone] Drag start', { type, name })
    setIsDragging(true)
    setIsPressed(false)
    onDragStart(e, type, item.id)

    // --- DOM Clone Logic ---
    try {
      const target = e.currentTarget as HTMLElement

      // Add visual feedback to original element
      target.style.opacity = '0.5'

      // Clone the dragged element (deep clone with all children)
      const clone = target.cloneNode(true) as HTMLElement

      // Scale for drag image
      const scale = 1.25

      // Style the clone - use CSS zoom for better drag image support
      clone.style.position = 'fixed'
      clone.style.top = '-9999px'
      clone.style.left = '-9999px'
      clone.style.pointerEvents = 'none'
      clone.style.zIndex = '9999'
      clone.style.opacity = '1'
      clone.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)'
      // @ts-ignore - zoom is not in TypeScript definitions but works in all browsers
      clone.style.zoom = scale

      // Add to DOM
      document.body.appendChild(clone)

      // Calculate offset - cursor position relative to element
      const rect = target.getBoundingClientRect()
      const offsetX = (e.clientX - rect.left) * scale
      const offsetY = (e.clientY - rect.top) * scale

      // Set drag image
      e.dataTransfer.setDragImage(clone, offsetX, offsetY)

      // Cleanup after drag starts
      setTimeout(() => {
        if (document.body.contains(clone)) {
          document.body.removeChild(clone)
        }
      }, 0)
    } catch (err) {
      console.error('[DraggableItemClone] Error creating DOM clone drag image:', err)
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // Restore original element opacity
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    setIsDragging(false)
    setIsPressed(false)
  }

  return (
    <div
      draggable
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragStart={handleDragStartLocal}
      onDragEnd={handleDragEnd}
      onContextMenu={(e) => e.preventDefault()}
      className="flex flex-row gap-3 p-3 border border-divider cursor-grab active:cursor-grabbing hover:border-primary transition-all bg-white dark:bg-gray-800 rounded-xl shadow-sm"
      style={{
        opacity: isDragging ? 0.5 : 1,
        transform: isPressed ? 'scale(1.25)' : 'scale(1)',
        boxShadow: isPressed ? '0 8px 24px rgba(0, 0, 0, 0.2)' : undefined,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      <div className="flex flex-col justify-center gap-1 flex-1">
        <div className="text-sm font-semibold whitespace-nowrap">{name}</div>
      </div>
    </div>
  )
}

// Export both components for external use
export { DraggableItem, DraggableItemClone }

export default memo(FooterDienst)
function FooterDienst({ className }: FooterDienstProps) {
  const lang = useLanguage()
  const [activeTab, setActiveTab] = useState<'client' | 'staff'>('client')
  const [isPending, startTransition] = useTransition()
  const clientRef = useRef<HTMLButtonElement>(null)
  const staffRef = useRef<HTMLButtonElement>(null)
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
  const filteredClients = selectedGroups === 'All Kunden'
    ? clients
    : groupedClients.find(g => g.group.groupeName === selectedGroups)?.clients || []

  const filteredWorkers =
    selectedTeams === 'All Teams'
      ? workers
      : teamsWithWorkers.find(t => t.team.teamName === selectedTeams)?.workers || []

  const itemsToDisplay = activeTab === 'client' ? filteredClients : filteredWorkers

  // Determine which draggable component to use based on platform
  const DraggableComponent = isReady && isMobile ? DraggableItem : DraggableItemClone

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
              {itemsToDisplay.map(item => (
                <DraggableComponent
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
              <Button
                ref={clientRef}
                variant={activeTab === 'client' ? 'tertiary' : 'ghost'}
                className="px-2 md:px-6 relative  h-10 md:h-10 flex items-center rounded-xl w-auto max-w-full focus-within:outline-none focus-within:ring-0"
                onPress={e => {
                  console.log('onPress')
                  setActiveTab('client')
                }}
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
              </Button>
            </div>
            {/* Teams */}
            <div className="flex-1 flex justify-center">
              <Button
                ref={staffRef}
                variant={activeTab === 'staff' ? 'tertiary' : 'ghost'}
                className="px-2 md:px-6 relative  h-11 md:h-10 flex items-center rounded-xl w-auto max-w-full focus-within:outline-none focus-within:ring-0"
                onPress={e => {
                  console.log('onPress')
                  setActiveTab('staff')
                }}
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
              </Button>
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
