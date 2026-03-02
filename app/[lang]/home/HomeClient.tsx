'use client'

import { useTranslation } from '@/components/Providers'
import { useLanguage } from '@/hooks/useLanguage'
import { Button, Card } from '@heroui/react'
import {
  CheckCircle2,
  Map,
  Star,
  Smartphone,
  CalendarDays,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { FAQ } from './FAQ'

export default function HomeClient() {
  const { t } = useTranslation()
  const lang = useLanguage()

  return (
    <div className="min-h-screen bg-default-50 font-sans selection:bg-primary/30">
      {/* Navbar Minimal */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/70 border-b border-default-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary-600 flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-default-800 to-default-500">
                Moment LBS
              </span>
            </div>
            <div className="flex gap-4">
              <Link href={`/${lang}/auth/login`} className="hidden sm:flex">
                <Button variant="ghost" className="font-medium text-primary">
                  Log in
                </Button>
              </Link>
              <Link href={`/${lang}/auth/login`}>
                <Button className="font-medium shadow-md shadow-primary/20 bg-primary text-primary-foreground">
                  Start for Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-32 lg:pt-32 lg:pb-40">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
          <div className="w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px] opacity-60" />
        </div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
          <div className="w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[100px] opacity-60" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">
              {t('landing.hero.badge')}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-default-900 mb-6 max-w-4xl">
            {t('landing.hero.title')}
          </h1>

          <p className="text-lg md:text-xl text-default-600 mb-10 max-w-2xl leading-relaxed">
            {t('landing.hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center sm:w-auto">
            <Link href={`/${lang}/auth/login`}>
              <Button
                size="lg"
                className="font-semibold shadow-xl shadow-primary/30 h-14 px-8 text-lg bg-primary text-primary-foreground"
              >
                {t('landing.hero.ctaStart')} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 font-semibold text-lg border-2 border-default-200"
            >
              {t('landing.hero.ctaHow')}
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits / Target Audience */}
      <section className="bg-background py-24 border-y border-default-200 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-default-900 mb-4">{t('landing.benefits.title')}</h2>
            <p className="text-default-600 max-w-2xl mx-auto">
              {t('landing.benefits.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-none bg-default-50 hover:bg-default-100 transition-colors">
              <Card.Content className="p-8 pb-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-default-900 mb-3">{t('landing.benefits.pwa.title')}</h3>
                <p className="text-default-600 leading-relaxed">
                  {t('landing.benefits.pwa.desc')}
                </p>
              </Card.Content>
            </Card>

            <Card className="border-none bg-default-50 hover:bg-default-100 transition-colors">
              <Card.Content className="p-8 pb-10">
                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-6">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-default-900 mb-3">{t('landing.benefits.scheduling.title')}</h3>
                <p className="text-default-600 leading-relaxed">
                  {t('landing.benefits.scheduling.desc')}
                </p>
              </Card.Content>
            </Card>

            <Card className="border-none bg-default-50 hover:bg-default-100 transition-colors">
              <Card.Content className="p-8 pb-10">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
                  <Map className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-default-900 mb-3">{t('landing.benefits.tracking.title')}</h3>
                <p className="text-default-600 leading-relaxed">
                  {t('landing.benefits.tracking.desc')}
                </p>
              </Card.Content>
            </Card>
          </div>
        </div>
      </section>

      {/* Advanced Features (Roadmap / Current) */}
      <section className="py-24 bg-gradient-to-b from-default-50 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-extrabold text-default-900 mb-6 leading-tight">
                {t('landing.features.title')}
              </h2>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-default-900">{t('landing.features.qr.title')}</h4>
                    <p className="text-default-600">
                      {t('landing.features.qr.desc')}
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-default-900">{t('landing.features.routes.title')}</h4>
                    <p className="text-default-600 leading-relaxed">
                      {t('landing.features.routes.desc')}
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-default-900">{t('landing.features.reports.title')}</h4>
                    <p className="text-default-600">
                      {t('landing.features.reports.desc')}
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            {/* Visual Placeholder */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-100 to-blue-100 rounded-[2.5rem] transform rotate-3 scale-105" />
              <div className="relative bg-content1 rounded-3xl shadow-2xl border border-default-200 p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-full h-12 bg-default-100 rounded-xl mb-4" />
                <div className="w-full flex gap-4 h-32 mb-4">
                  <div className="flex-1 bg-primary/10 rounded-xl" />
                  <div className="flex-1 bg-blue-500/10 rounded-xl" />
                </div>
                <div className="w-full h-48 bg-default-50 rounded-xl flex items-center justify-center border-2 border-dashed border-default-200">
                  <div className="flex flex-col items-center gap-2">
                    <Star className="w-10 h-10 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-default-400">Client Rating KPIs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Freemium */}
      <section className="bg-content2 py-24 text-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('landing.pricing.title')}</h2>
          <p className="text-default-500 max-w-2xl mx-auto mb-16 text-lg">
            {t('landing.pricing.subtitle')}
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <Card className="bg-content1 text-foreground border border-default-200 text-left shadow-md">
              <Card.Content className="p-8">
                <h3 className="text-2xl font-bold mb-2">{t('landing.pricing.free.name')}</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-extrabold text-primary">{t('landing.pricing.free.price')}</span>
                  <span className="text-default-500 font-medium">{t('landing.pricing.free.unit')}</span>
                </div>
                <div className="w-full h-px bg-default-200 my-6" />
                <ul className="space-y-4 mb-8 text-default-600">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" /> {t('landing.pricing.free.feat1')}
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" /> {t('landing.pricing.free.feat2')}
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" /> {t('landing.pricing.free.feat3')}
                  </li>
                </ul>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full font-semibold text-primary border-primary"
                >
                  {t('landing.pricing.free.cta')}
                </Button>
              </Card.Content>
            </Card>

            {/* Pro Tier */}
            <Card className="bg-gradient-to-br from-primary-600 to-blue-700 text-white border-none text-left relative overflow-hidden shadow-xl shadow-primary/20">
              <Card.Content className="p-8">
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">{t('landing.pricing.pro.name')}</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-extrabold text-white">{t('landing.pricing.pro.price')}</span>
                  <span className="text-blue-200 font-medium whitespace-nowrap">{t('landing.pricing.pro.unit')}</span>
                </div>
                <div className="w-full h-px bg-white/20 my-6" />
                <ul className="space-y-4 mb-8 text-blue-50">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-yellow-300" /> {t('landing.pricing.pro.feat1')}
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-yellow-300" /> {t('landing.pricing.pro.feat2')}
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-yellow-300" /> {t('landing.pricing.pro.feat3')}
                  </li>
                </ul>
                <Button
                  size="lg"
                  className="w-full font-semibold !bg-white !text-blue-600 shadow-xl shadow-black/20 hover:scale-[1.02] transition-transform"
                >
                  {t('landing.pricing.pro.cta')}
                </Button>
              </Card.Content>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative overflow-hidden pt-8 pb-8 lg:pt-8 lg:pb-8 pr-4 pl-4">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
          <div className="w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px] opacity-60" />
        </div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
          <div className="w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[100px] opacity-60" />
        </div>

        <Card className="bg-gradient-to-br from-primary-600 to-blue-700 text-white border-none text-left relative overflow-hidden shadow-xl shadow-primary/20 w-full max-w-4xl mx-auto dark">
          <Card.Content className="p-8">
            <FAQ />
          </Card.Content>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-default-50 border-t border-default-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-default-900 flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-semibold text-default-900">Moment LBS</span>
          </div>
          <p className="text-default-500 text-sm">
            © {new Date().getFullYear()} Moment LBS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
