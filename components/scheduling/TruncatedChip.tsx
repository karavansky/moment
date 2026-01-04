'use client';

import React from 'react';
import type { ComponentPropsWithRef } from 'react';

interface TruncatedChipProps extends Omit<ComponentPropsWithRef<'span'>, 'color'> {
  children: React.ReactNode;
  color?: 'accent' | 'danger' | 'default' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'tertiary' | 'soft';
}

/**
 * Chip компонент с поддержкой truncate для мобильной версии
 * Полностью кастомная реализация для корректной работы truncate
 */
export default function TruncatedChip({
  children,
  className = '',
  color = 'default',
  size = 'sm',
  variant = 'soft',
  ...props
}: TruncatedChipProps) {
  // Мапинг цветов на Tailwind классы
  const colorClasses = {
    accent: variant === 'soft' ? 'bg-accent-soft text-accent-soft-foreground' : 'bg-accent text-accent-foreground',
    success: variant === 'soft' ? 'bg-success-soft text-success-soft-foreground' : 'bg-success text-success-foreground',
    warning: variant === 'soft' ? 'bg-warning-soft text-warning-soft-foreground' : 'bg-warning text-warning-foreground',
    danger: variant === 'soft' ? 'bg-danger-soft text-danger-soft-foreground' : 'bg-danger text-danger-foreground',
    default: 'bg-default text-default-foreground',
  };

  const sizeClasses = {
    sm: 'px-1 py-0 text-xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`
        flex items-center gap-1.5 rounded-2xl font-medium leading-5
        max-w-full min-w-0
        ${colorClasses[color]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}
