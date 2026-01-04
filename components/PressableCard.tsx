'use client'

import Link from 'next/link'
import { Card, Spinner } from '@heroui/react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import type { ReactNode } from 'react'

type BaseProps = {
  children: ReactNode
  className?: string
  loading?: boolean
}

type ButtonProps = BaseProps & {
  onClick: () => void
  href?: never
}

type LinkProps = BaseProps & {
  href: string
  onClick?: never
}

type PressableCardProps = ButtonProps | LinkProps

const MotionCard = motion(Card)

export function PressableCard(props: PressableCardProps) {
  const { children, className, loading = false } = props

  const content = (
    <MotionCard
      whileHover={!loading ? { scale: 1.02 } : undefined}
      whileTap={!loading ? { scale: 0.98 } : undefined}
      className={clsx(
        'relative transition-shadow cursor-pointer ',
        !loading && 'hover:shadow-lg ',
        loading && 'opacity-60 pointer-events-none cursor-default',
        className
      )}
    >
      {/* CONTENT */}
      <div className={clsx(loading && 'opacity-0')}>{children}</div>

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
    </MotionCard>
  )

  if ('href' in props && props.href) {
    return (
      <Link
        href={props.href}
        aria-disabled={loading}
        tabIndex={loading ? -1 : 0}
        className="block focus:outline-none"
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={loading}
      className="block text-left focus:outline-none"
    >
      {content}
    </button>
  )
}
