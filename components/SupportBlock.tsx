'use client'

import React from 'react'
import { Button, Separator, Chip, Card, Link } from '@heroui/react'
import { MessageSquare, Clock, ShieldCheck, MailX, UserCheck, Zap } from 'lucide-react'
import { useTranslation } from '@/components/Providers'
import { localizedLink } from '@/utils/localizedLink'
import { useLanguage } from '@/hooks/useLanguage'
import { useRouter } from 'next/navigation'

export default function SupportBlock() {
  const { t } = useTranslation()
  const lang = useLanguage()
  const router = useRouter()

  return (
    <section className="py-12 w-full max-w-5xl mx-auto">
      <Card className="border-none bg-content1 shadow-lg">
        <Card.Content className="p-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Левая колонка: Основной оффер */}
            <div className="md:col-span-5 p-4 bg-primary/5 flex flex-col justify-between">
              <div>
                <Chip color="accent" variant="soft" size="lg">
                  <Clock size={14} />
                  {t('sla.badge')}
                </Chip>
                <h2 className="text-2xl font-bold my-4">{t('sla.hero.title')}</h2>
                <p className="text-default-600 text-sm leading-relaxed mb-6">
                  {t('sla.hero.description')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-success/10 text-success">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t('sla.guaranteeTitle')}</p>
                    <p className="text-xs text-default-500">{t('sla.guaranteeDesc')}</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full font-semibold shadow-xl"
                  variant="primary"
                  onPress={() => router.push(localizedLink('get-started', lang))}
                >
                  {t('home.get')}
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-semibold shadow-xl"
                  onPress={() =>
                    router.push('https://apps.apple.com/us/app/quail-breeder/id1527993430')
                  }
                >
                  {t('sla.ctaButton')}
                </Button>
              </div>
            </div>

            {/* Правая колонка: Процесс и преимущества */}
            <div className="md:col-span-7 p-6 md:p-8 bg-background  dark:bg-gray-800/90   flex flex-row flex-nowrap md:flex-col gap-4 md:gap-0 text-left">
              <div className="mb-0 flex-1 min-w-0 md:w-full md:mb-8">
                <p className="text-xs uppercase tracking-widest text-default-400 font-bold mb-6">
                  {t('sla.howItWorks.title')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-6">
                  <Step
                    number="1"
                    title={t('sla.step1Short.title')}
                    desc={t('sla.step1Short.desc')}
                  />
                  <Step
                    number="2"
                    title={t('sla.step2Short.title')}
                    desc={t('sla.step2Short.desc')}
                  />
                  <Step
                    number="3"
                    title={t('sla.step3Short.title')}
                    desc={t('sla.step3Short.desc')}
                  />
                </div>
              </div>

              <div className="hidden md:block w-full">
                <Separator className="my-6" />
              </div>

              <div className="space-y-4 flex-1 min-w-0 md:w-full">
                <p className="text-xs uppercase tracking-widest text-default-400 font-bold">
                  {t('sla.benefits.title')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
                  <Benefit
                    icon={<UserCheck className="text-primary" size={18} />}
                    title={t('sla.benefit1Short.title')}
                    text={t('sla.benefit1Short.desc')}
                  />
                  <Benefit
                    icon={<MailX className="text-danger" size={18} />}
                    title={t('sla.benefit2Short.title')}
                    text={t('sla.benefit2Short.desc')}
                  />
                  <Benefit
                    icon={<Zap className="text-warning" size={18} />}
                    title={t('sla.benefit3Short.title')}
                    text={t('sla.benefit3Short.desc')}
                  />
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full font-semibold shadow-xl"
                    onPress={() =>
                      router.push(localizedLink('support', lang))
                    }
                  >
                    {t('navbar.support')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </section>
  )
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-2 items-start">
      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-default-500 leading-tight">{desc}</p>
    </div>
  )
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col md:flex-row gap-3 items-start">
      <div className="mt-0 md:mt-1">{icon}</div>
      <div className="text-left">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-default-500">{text}</p>
      </div>
    </div>
  )
}
