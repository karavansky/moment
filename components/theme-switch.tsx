'use client'

import { FC } from 'react'
import { Switch } from '@heroui/react'
import { useTheme } from 'next-themes'
import { useIsSSR } from '@react-aria/ssr'
import clsx from 'clsx'

import { SunFilledIcon, MoonFilledIcon } from './icons'

export interface ThemeSwitchProps {
  className?: string
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({ className }) => {
  const { theme, setTheme } = useTheme()
  const isSSR = useIsSSR()

  const onChange = (isSelected: boolean) => {
    setTheme(isSelected ? 'light' : 'dark')
  }

  return (
    <Switch
      isSelected={theme === 'light' || isSSR}
      onChange={onChange}
      aria-label={`Switch to ${theme === 'light' || isSSR ? 'dark' : 'light'} mode`}
      className={clsx('px-px transition-opacity hover:opacity-80 cursor-pointer', className)}
    >
      {({ isSelected }) => (
        <Switch.Control className="w-auto h-auto bg-transparent rounded-lg">
          <Switch.Thumb className="w-auto h-auto bg-transparent flex items-center justify-center text-gray-900 dark:text-gray-100 pt-px px-0 mx-0 shadow-none">
            {!isSelected || isSSR ? <SunFilledIcon size={22} /> : <MoonFilledIcon size={22} />}
          </Switch.Thumb>
        </Switch.Control>
      )}
    </Switch>
  )
}
