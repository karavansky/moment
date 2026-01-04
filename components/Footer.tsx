'use client'
import Link from 'next/link'
import { localizedLink } from '@/utils/localizedLink'
import type { SupportedLocale } from '@/config/locales'
import { useTranslation } from '@/components/Providers'

interface FooterProps {
  lang: SupportedLocale
}

export default function Footer({ lang }: FooterProps) {
  const { t } = useTranslation()

  return (
    <footer className="pt-6 px-4 sm:px-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border-t border-sand-300 dark:border-gray-600 text-sand-100 dark:text-gray-300 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-center items-center gap-2 mb-6">
          <Link
            href={localizedLink('support', lang)}
            className="text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm"
          >
            {t('navbar.support')}
          </Link>
          <span className="hidden md:inline text-sand-400 dark:text-gray-600">•</span>
          <Link
            href={localizedLink('privacy-policy', lang)}
            className="text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm"
          >
            {t('navbar.privacy')}
          </Link>
          <span className="hidden md:inline text-sand-400 dark:text-gray-600">•</span>
          <Link
            href={localizedLink('terms-of-use', lang)}
            className="text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm"
          >
            {t('navbar.terms')}
          </Link>
          <span className="hidden md:inline text-sand-400 dark:text-gray-600">•</span>
          <Link
            href={localizedLink('about', lang)}
            className="text-sand-200 hover:text-sand-100 dark:text-gray-300 dark:hover:text-white transition-colors text-sm"
          >
            {t('navbar.about')}
          </Link>
        </div>
        <p className="text-sm tracking-wide text-center text-sand-300 dark:text-gray-400">
          © 2024 QuailBreeder. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
