'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@heroui/react'
import { useTranslation } from './Providers'
import { useLanguage } from '@/hooks/useLanguage'
import { localizedLink } from '@/utils/localizedLink'
import LanguageSwitcher from './LanguageSwitcher'
import { ThemeSwitch } from './theme-switch'
import { MenuIcon, CloseIcon, LogoMoment } from './icons'
import { SupportButtons } from './SupportButtons'

interface NavbarProps {
  onMenuToggle?: () => void
  sidebarExpanded?: boolean
  isHydrated?: boolean
}

export default function Navbar({
  onMenuToggle,
  sidebarExpanded = true,
  isHydrated = false,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { t } = useTranslation()
  const lang = useLanguage()

  // Мемоизируем callback для предотвращения ре-рендеров SupportButtons
  const handleSupportAction = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])
  return (
    <nav
      suppressHydrationWarning
      className={`fixed top-0 left-0 right-0 z-40  backdrop-blur-sm ${
        isHydrated ? 'transition-all duration-300' : ''
      } ${sidebarExpanded ? 'md:left-56' : 'md:left-16'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end h-16">
          {/* Mobile Center Section: App Store Badge + Language Switcher + Sidebar Menu Button */}
          <div className="lg:hidden flex items-center gap-3">
            <SupportButtons lang={lang} onAction={handleSupportAction} t={t} />
            <div className="flex items-center">
              <LanguageSwitcher currentLang={lang} />
            </div>
            <ThemeSwitch />
            {/* Mobile Sidebar Toggle Button */}
            <Button
              isIconOnly
              variant="tertiary"
              onPress={onMenuToggle}
              aria-label="Toggle sidebar"
              className="text-sand-50 dark:text-white min-w-10 h-10"
            >
              <MenuIcon size={24} />
            </Button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            <Link
              href={localizedLink('about', lang)}
              className="text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm font-medium text-right"
            >
              {t('navbar.about')}
            </Link>
            <Link
              href={localizedLink('get-started', lang)}
              className="text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm font-medium text-right"
            >
              {t('navbar.get_started')}
            </Link>
            {/*  <Link
              href={localizedLink('terms-of-use', lang)}
              className="text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm font-medium text-right"
            >
              {t("navbar.terms")}
            </Link>
            <Link
              href={localizedLink('privacy-policy', lang)}
              className="text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm font-medium text-right"
            >
              {t("navbar.privacy")}
            </Link> */}
            <SupportButtons lang={lang} onAction={handleSupportAction} t={t} />
            <div className="shrink-0">
              <LanguageSwitcher currentLang={lang} />
            </div>
            <ThemeSwitch />
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto">
            <Link
              href={localizedLink('about', lang)}
              className="block text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('navbar.about')}
            </Link>

            <Link
              href={localizedLink('terms-of-use', lang)}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm font-medium py-2"
            >
              {t('navbar.terms')}
            </Link>
            <Link
              href={localizedLink('privacy-policy', lang)}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm font-medium py-2"
            >
              {t('navbar.privacy')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
