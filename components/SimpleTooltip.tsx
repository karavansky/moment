'use client'

import React, { useState, useRef, useEffect, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'

type Placement = 'top' | 'bottom' | 'left' | 'right'

interface SimpleTooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  delay?: number
  closeDelay?: number
  className?: string
  wrapperClassName?: string
  placement?: Placement
  offset?: number
  showArrow?: boolean
  isDisabled?: boolean
}

export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  children,
  delay = 200,
  closeDelay = 0,
  className = '',
  wrapperClassName = 'inline-block',
  placement = 'top',
  offset = 8,
  showArrow = true,
  isDisabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [actualPlacement, setActualPlacement] = useState<Placement>(placement)
  const [isMounted, setIsMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const tooltipId = useId()

  const updatePosition = useCallback(() => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const arrowSize = showArrow ? 6 : 0
      const totalOffset = offset + arrowSize

      let top = 0
      let left = 0
      let finalPlacement = placement

      // Вычисляем позицию в зависимости от placement
      switch (placement) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - totalOffset
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
          // Проверяем, помещается ли сверху
          if (top < 8) {
            finalPlacement = 'bottom'
            top = triggerRect.bottom + totalOffset
          }
          break

        case 'bottom':
          top = triggerRect.bottom + totalOffset
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
          // Проверяем, помещается ли снизу
          if (top + tooltipRect.height > window.innerHeight - 8) {
            finalPlacement = 'top'
            top = triggerRect.top - tooltipRect.height - totalOffset
          }
          break

        case 'left':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.left - tooltipRect.width - totalOffset
          // Проверяем, помещается ли слева
          if (left < 8) {
            finalPlacement = 'right'
            left = triggerRect.right + totalOffset
          }
          break

        case 'right':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.right + totalOffset
          // Проверяем, помещается ли справа
          if (left + tooltipRect.width > window.innerWidth - 8) {
            finalPlacement = 'left'
            left = triggerRect.left - tooltipRect.width - totalOffset
          }
          break
      }

      // Проверка горизонтальных границ для top/bottom placement
      if (finalPlacement === 'top' || finalPlacement === 'bottom') {
        if (left < 8) {
          left = 8
        } else if (left + tooltipRect.width > window.innerWidth - 8) {
          left = window.innerWidth - tooltipRect.width - 8
        }
      }

      // Проверка вертикальных границ для left/right placement
      if (finalPlacement === 'left' || finalPlacement === 'right') {
        if (top < 8) {
          top = 8
        } else if (top + tooltipRect.height > window.innerHeight - 8) {
          top = window.innerHeight - tooltipRect.height - 8
        }
      }

      setPosition({ top, left })
      setActualPlacement(finalPlacement)
    }
  }, [placement, offset, showArrow])

  const handleMouseEnter = () => {
    if (isDisabled) return

    // Очищаем таймер на скрытие, если он был запущен
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = undefined
    }

    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (isDisabled) return

    // Очищаем таймер на показ
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = undefined
    }

    // Задержка перед скрытием
    if (closeDelay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false)
      }, closeDelay)
    } else {
      setIsVisible(false)
    }
  }

  // Монтируем компонент на клиенте
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isVisible) {
      updatePosition()

      // Throttle для оптимизации - обновляем позицию не чаще раз в 100ms
      let rafId: number | null = null
      let lastUpdate = 0

      const throttledUpdate = () => {
        const now = Date.now()
        if (now - lastUpdate >= 100) {
          lastUpdate = now
          updatePosition()
        } else {
          // Если вызов слишком частый, планируем следующий через RAF
          if (rafId === null) {
            rafId = requestAnimationFrame(() => {
              rafId = null
              updatePosition()
              lastUpdate = Date.now()
            })
          }
        }
      }

      // Обновляем позицию при скролле или ресайзе
      window.addEventListener('scroll', throttledUpdate, true)
      window.addEventListener('resize', throttledUpdate)

      return () => {
        window.removeEventListener('scroll', throttledUpdate, true)
        window.removeEventListener('resize', throttledUpdate)
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
        }
      }
    }
  }, [isVisible, updatePosition])

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Получаем стили для стрелки в зависимости от placement
  const getArrowStyles = (): React.CSSProperties => {
    const arrowBaseStyles: React.CSSProperties = {
      position: 'absolute',
      width: '8px',
      height: '8px',
      transform: 'rotate(45deg)',
    }

    switch (actualPlacement) {
      case 'top':
        return {
          ...arrowBaseStyles,
          bottom: '-4px',
          left: '50%',
          marginLeft: '-4px',
        }
      case 'bottom':
        return {
          ...arrowBaseStyles,
          top: '-4px',
          left: '50%',
          marginLeft: '-4px',
        }
      case 'left':
        return {
          ...arrowBaseStyles,
          right: '-4px',
          top: '50%',
          marginTop: '-4px',
        }
      case 'right':
        return {
          ...arrowBaseStyles,
          left: '-4px',
          top: '50%',
          marginTop: '-4px',
        }
      default:
        return arrowBaseStyles
    }
  }

  const tooltipContent = isVisible && isMounted && (
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      aria-hidden={!isVisible}
      className={`fixed z-9999 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-lg pointer-events-none transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {content}
      {/* Стрелка */}
      {showArrow && (
        <div
          className="bg-gray-900 dark:bg-gray-800"
          style={getArrowStyles()}
        />
      )}
    </div>
  )

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        className={wrapperClassName}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>

      {isMounted && typeof window !== 'undefined' && createPortal(
        tooltipContent,
        document.body
      )}
    </>
  )
}
