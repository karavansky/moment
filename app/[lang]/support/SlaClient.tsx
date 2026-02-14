'use client'
import { useAuth } from '@/components/AuthProvider'
import { useTranslation } from '@/components/Providers'
import { useLanguage } from '@/hooks/useLanguage'
import { Button, Card, CardHeader, Link, Separator } from '@heroui/react'
import type { IconSvgProps } from '@/components/icons'
import { AuthModal } from '@/components/AuthModal'
import { startTransition, use, useEffect, useTransition } from 'react'
import { on } from 'node:cluster'
import { useRouter } from 'next/navigation'
import MyTickets from '../tickets/MyTickets'
import type { Ticket } from '@/lib/interface'
import { ticketExample } from '@/lib/interface'
import { useState, useCallback } from 'react'
import { useDisclosure } from '@/lib/useDisclosure'
import DemoTickets from './DemoTickets'

const CheckCircleIcon = ({ size = 24, ...props }: IconSvgProps) => (
  <svg
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M0 0h24v24H0z" fill="none" stroke="none" />
    <circle cx="12" cy="12" r="9" />
    <path d="M9 12l2 2l4 -4" />
  </svg>
)

const BellIcon = ({ size = 24, ...props }: IconSvgProps) => (
  <svg
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M0 0h24v24H0z" fill="none" stroke="none" />
    <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
    <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
  </svg>
)

const ChatBubbleIcon = ({ size = 24, ...props }: IconSvgProps) => (
  <svg
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M0 0h24v24H0z" fill="none" stroke="none" />
    <path d="M8 9h8" />
    <path d="M8 13h6" />
    <path d="M9 18h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-3l-3 3l-3 -3z" />
  </svg>
)

function StepCard({
  icon,
  title,
  description,
  stepNumber,
}: {
  icon: React.ReactNode
  title: string
  description: string
  stepNumber: number
}) {
  return (
    <div className="relative">
      <div className="absolute -top-4 -left-4 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg z-10">
        {stepNumber}
      </div>
      <Card className="rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-md">
        <CardHeader className="flex flex-col items-center pb-4 pt-2">
          <div className="text-primary mb-3">{icon}</div>
          <h3 className="font-semibold text-xl text-center">{title}</h3>
        </CardHeader>
        <Separator />
        <Card.Content>
          <p className="text-md text-center">{description}</p>
        </Card.Content>
      </Card>
    </div>
  )
}

function BenefitCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-xl border border-gray-100 dark:border-gray-800 shadow-md">
      <CardHeader>
        <CheckCircleIcon size={24} className="text-success shrink-0 mt-1 mr-3" />
        <h4 className="font-semibold text-lg">{title}</h4>
      </CardHeader>
      <Card.Content>
        <p className="text-md">{description}</p>
      </Card.Content>
    </Card>
  )
}

export default function SlaClient() {
  const { session, status, signIn, signInWithCredentials, signOut } = useAuth()
  const { t } = useTranslation()
  const lang = useLanguage()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const router = useRouter()


  const handleSignIn = async (provider: 'google' | 'apple') => {
    await signIn(provider, `/${lang}/tickets`)
  }

  const handleCredentialsSignIn = async (email: string, password: string) => {
    return signInWithCredentials(email, password, `/${lang}/tickets`)
  }
  /*
  useEffect(() => {
    if (typeof window === 'undefined') return

    //console.log('SLA Client session:', session)
   // if (status === 'unauthenticated') {
   //   onOpen()
      // User is signed in, you can perform additional actions if needed
   // }
  }, [status, onOpen])
*/
  return (
    <div className="container mx-auto pb-8 pt-18 px-2 lg:px-20">
      {/* HERO SECTION */}
      <Card className="relative rounded-2xl p-2 md:p-6 shadow-2xl border border-gray-100 dark:border-gray-800 bg-linear-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-900">
        <Card.Content>
          <div className="flex flex-col items-center text-center gap-6">
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              {t('sla.hero.title')}
            </h1>
            <p className="mt-2 text-lg md:text-xl max-w-3xl">{t('sla.hero.description')}</p>
            <div className="pb-4">
              <Button
                variant="primary"
                size="lg"
                className="shadow-md shadow-gray-500 dark:shadow-gray-700"
                onPress={() => {
                  if (status === 'authenticated') {
                    startTransition(() => {
                      router.push(`/tickets/`)
                    })
                  } else onOpen()
                }}
              >
                {t('sla.hero.button')}
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* COMMITMENT SECTION */}
      <section className="mt-12">
        <Card className="rounded-2xl p-2 md:p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
          <Card.Content>
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('sla.commitment.title')}</h2>
              <p className="text-lg md:text-xl mb-6 leading-relaxed">
                {t('sla.commitment.description')}
              </p>

              <div className="bg-amber-50 dark:bg-gray-700 p-6 rounded-xl border-l-4 border-amber-600">
                <p className="font-semibold">{t('sla.commitment.whyImportant')}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="mt-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold">{t('sla.howItWorks.title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            stepNumber={1}
            icon={<ChatBubbleIcon size={48} />}
            title={t('sla.howItWorks.step1.title')}
            description={t('sla.howItWorks.step1.description')}
          />
          <StepCard
            stepNumber={2}
            icon={<BellIcon size={48} />}
            title={t('sla.howItWorks.step2.title')}
            description={t('sla.howItWorks.step2.description')}
          />
          <StepCard
            stepNumber={3}
            icon={<CheckCircleIcon size={48} />}
            title={t('sla.howItWorks.step3.title')}
            description={t('sla.howItWorks.step3.description')}
          />
        </div>
      </section>
      <Separator className="mt-4 mb-4" />
      <DemoTickets lang={lang} authOpen={onOpen}/>
      <Separator className="mt-4 mb-4" />
      {/* BENEFITS SECTION */}
      <section className="mt-4 mb-4">
        <Card className="rounded-2xl p-4 md:p-4 shadow-2xl border border-gray-100 dark:border-gray-800">
          <CardHeader>
            <h2 className="text-3xl md:text-4xl font-bold text-center w-full">
              {t('sla.benefits.title')}
            </h2>
          </CardHeader>
          <Separator className="my-6" />
          <Card.Content className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BenefitCard
              title={t('sla.benefits.benefit1.title')}
              description={t('sla.benefits.benefit1.description')}
            />
            <BenefitCard
              title={t('sla.benefits.benefit2.title')}
              description={t('sla.benefits.benefit2.description')}
            />
            <BenefitCard
              title={t('sla.benefits.benefit3.title')}
              description={t('sla.benefits.benefit3.description')}
            />
          </Card.Content>
        </Card>
      </section>

      {/* CTA SECTION */}
      <section className="mt-12 mb-4">
        <Card className="rounded-2xl shadow-2xl p-8 md:p-10 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">{t('sla.cta.title')}</h3>
            <p className="text-lg">{t('sla.cta.description')}</p>
          </div>
          <div>
            {/* 
            as={Link}
                          href="https://apps.apple.com/us/app/quail-breeder/id1527993430"

            */}
            <Button
              variant="primary"
              size="lg"
              className="shadow-md px-6 py-3 transition shadow-gray-500 dark:shadow-gray-700"
            >
              {t('sla.cta.button')}
            </Button>
          </div>
        </Card>
      </section>
      <AuthModal
        isOpen={isOpen}
        onOpenChange={() => onOpenChange()}
        onSignIn={handleSignIn}
        onSignInWithCredentials={handleCredentialsSignIn}
        t={t}
        lang={lang}
      />
    </div>
  )
}

