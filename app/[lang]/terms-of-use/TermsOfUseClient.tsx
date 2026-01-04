'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/components/Providers'
import { Card, CardHeader, Separator } from '@heroui/react'

export default function TermsOfUseClient() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-4xl md:text-5xl font-bold mt-8 text-gray-900 dark:text-gray-100"
          >
            {t('terms.title')}
          </motion.h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="prose prose-lg max-w-none"
        >
          {/* Introduction */}
          <section className="mb-12">
            <p className="text-xl text-earth-700 dark:text-gray-300 leading-relaxed mb-6">
              {t('terms.intro')}
            </p>
          </section>

          {/* Application Purpose */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('terms.purpose.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content>
              <p className="mb-4">{t('terms.purpose.text')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('terms.purpose.item1')}</li>
                <li>{t('terms.purpose.item2')}</li>
                <li>{t('terms.purpose.item3')}</li>
                <li>{t('terms.purpose.item4')}</li>
                <li>{t('terms.purpose.item5')}</li>
              </ul>
            </Card.Content>
          </Card>

          {/* Subscription Model */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('terms.subscription.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>
                {t('terms.subscription.text')} <strong>"{t('terms.subscription.name')}"</strong>.
              </p>
              <div className="bg-amber-50 dark:bg-gray-700 p-6 rounded-xl border-l-4 border-amber-600">
                <p className="font-semibold">{t('terms.subscription.important')}</p>
              </div>
            </Card.Content>
          </Card>

          {/* License Restrictions */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('terms.license.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>{t('terms.license.text')}</p>
              <p className="mb-2">
                <strong>{t('terms.license.prohibited')}</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('terms.license.item1')}</li>
                <li>{t('terms.license.item2')}</li>
                <li>{t('terms.license.item3')}</li>
                <li>{t('terms.license.item4')}</li>
                <li>{t('terms.license.item5')}</li>
              </ul>
            </Card.Content>
          </Card>

          {/* User Responsibilities */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">
                {t('terms.responsibilities.title')}
              </h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <h3 className="font-display text-2xl font-semibold mb-3">
                {t('terms.responsibilities.age.title')}
              </h3>
              <p>{t('terms.responsibilities.age.text')}</p>

              <h3 className="font-display text-2xl font-semibold mb-3 mt-6">
                {t('terms.responsibilities.defect.title')}
              </h3>
              <p>
                {t('terms.responsibilities.defect.text')}{' '}
                <a
                  href="mailto:quailbreeding@gmail.com"
                  className="text-amber-600 hover:text-amber-700 underline"
                >
                  quailbreeding@gmail.com
                </a>
              </p>

              <h3 className="font-display text-2xl font-semibold mb-3 mt-6">
                {t('terms.responsibilities.backup.title')}
              </h3>
              <p>{t('terms.responsibilities.backup.text')}</p>
            </Card.Content>
          </Card>

          {/* Liability Limitations */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('terms.liability.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>{t('terms.liability.text')}</p>
              <div className="bg-amber-50 dark:bg-gray-700 p-6 rounded-xl">
                <p>{t('terms.liability.note')}</p>
              </div>
            </Card.Content>
          </Card>

          {/* Intellectual Property */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('terms.intellectual.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>{t('terms.intellectual.text')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('terms.intellectual.item1')}</li>
                <li>{t('terms.intellectual.item2')}</li>
                <li>{t('terms.intellectual.item3')}</li>
                <li>{t('terms.intellectual.item4')}</li>
                <li>{t('terms.intellectual.item5')}</li>
              </ul>
              <p className="mt-4">
                <strong>{t('terms.intellectual.important')}</strong>
              </p>
            </Card.Content>
          </Card>

          {/* Termination */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('terms.termination.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>{t('terms.termination.text1')}</p>
              <p>{t('terms.termination.text2')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('terms.termination.item1')}</li>
                <li>{t('terms.termination.item2')}</li>
                <li>{t('terms.termination.item3')}</li>
              </ul>
            </Card.Content>
          </Card>

          {/* Governing Law */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('terms.governing.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>{t('terms.governing.text1')}</p>
              <p>{t('terms.governing.text2')}</p>
            </Card.Content>
          </Card>

          {/* Contact */}
          <Card className="mb-12 rounded-2xl p-8 shadow-2xl bg-amber-50 dark:shadow-gray-800/90 border border-amber-100 dark:border-gray-800 dark:bg-gray-800/90">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('terms.contact.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content>
              <p className="mb-6">{t('terms.contact.text')}</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-amber-100 dark:bg-gray-700 p-6 rounded-xl">
                  <p className="mb-2 text-sm">{t('terms.contact.email')}</p>
                  <a
                    href="mailto:quailbreeding@gmail.com"
                    className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 text-lg transition-colors"
                  >
                    quailbreeding@gmail.com
                  </a>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Last Updated */}
          <div className="text-center pt-8 border-t border-earth-200 dark:border-gray-700">
            <p className="text-earth-600 dark:text-gray-400 italic">{t('terms.lastUpdated')}</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
