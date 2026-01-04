'use client'

import { motion } from 'framer-motion'
import { useTranslation } from '@/components/Providers'
import { Card, CardHeader, Separator } from '@heroui/react'

export default function PrivacyPolicyClient() {
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
            {t('policy.title')}
          </motion.h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto ">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="prose prose-lg max-w-none"
        >
          {/* Introduction */}
          <section className="mb-12">
            <p className="text-xl text-earth-700 dark:text-gray-300 leading-relaxed mb-6">
              {t('policy.intro')}
            </p>
          </section>

          {/* Data Collection */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">
                {t('policy.dataCollection.title')}
              </h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-6">
              <div>
                <h3 className="font-display text-2xl font-semibold mb-4">
                  {t('policy.dataCollection.confidential.title')}
                </h3>
                <p className="mb-4">{t('policy.dataCollection.confidential.text')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('policy.dataCollection.confidential.item1')}</li>
                  <li>{t('policy.dataCollection.confidential.item2')}</li>
                  <li>{t('policy.dataCollection.confidential.item3')}</li>
                  <li>{t('policy.dataCollection.confidential.item4')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-display text-2xl font-semibold mb-4">
                  {t('policy.dataCollection.subscriber.title')}
                </h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('policy.dataCollection.subscriber.item1')}</li>
                  <li>{t('policy.dataCollection.subscriber.item2')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-display text-2xl font-semibold mb-4">
                  {t('policy.dataCollection.notCollect.title')}
                </h3>
                <p className="mb-2">{t('policy.dataCollection.notCollect.text')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('policy.dataCollection.notCollect.item1')}</li>
                  <li>{t('policy.dataCollection.notCollect.item2')}</li>
                  <li>{t('policy.dataCollection.notCollect.item3')}</li>
                </ul>
              </div>
            </Card.Content>
          </Card>

          {/* Data Usage */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('policy.dataUsage.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-6">
              <div>
                <h3 className="font-display text-2xl font-semibold mb-3">
                  {t('policy.dataUsage.maintaining.title')}
                </h3>
                <p>{t('policy.dataUsage.maintaining.text')}</p>
              </div>

              <div>
                <h3 className="font-display text-2xl font-semibold mb-3">
                  {t('policy.dataUsage.communicating.title')}
                </h3>
                <p>{t('policy.dataUsage.communicating.text')}</p>
              </div>

              <div className="bg-amber-50 dark:bg-gray-700 p-6 rounded-xl border-l-4 border-amber-600">
                <p className="font-semibold">{t('policy.dataUsage.important')}</p>
              </div>
            </Card.Content>
          </Card>

          {/* User Access & Control */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('policy.userControl.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>{t('policy.userControl.text')}</p>

              <ul className="list-disc pl-6 space-y-3">
                <li>
                  <strong>{t('policy.userControl.manage.title')}</strong>{' '}
                  {t('policy.userControl.manage.text')}
                </li>
                <li>
                  <strong>{t('policy.userControl.delete.title')}</strong>{' '}
                  {t('policy.userControl.delete.text')}
                </li>
                <li>
                  <strong>{t('policy.userControl.stop.title')}</strong>{' '}
                  {t('policy.userControl.stop.text')}
                </li>
                <li>
                  <strong>{t('policy.userControl.export.title')}</strong>{' '}
                  {t('policy.userControl.export.text')}
                </li>
              </ul>
            </Card.Content>
          </Card>

          {/* Customer Support */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">
                {t('policy.customerSupport.title')}
              </h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>{t('policy.customerSupport.text')}</p>

              <div className="bg-amber-50 dark:bg-gray-700 p-6 rounded-xl">
                <p>
                  <strong>{t('policy.customerSupport.note')}</strong>
                </p>
              </div>
            </Card.Content>
          </Card>

          {/* Data Protection */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">
                {t('policy.dataProtection.title')}
              </h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>{t('policy.dataProtection.text')}</p>

              <ul className="list-disc pl-6 space-y-3">
                <li>{t('policy.dataProtection.item1')}</li>
                <li>{t('policy.dataProtection.item2')}</li>
                <li>{t('policy.dataProtection.item3')}</li>
              </ul>
            </Card.Content>
          </Card>

          {/* Changes to Policy */}
          <Card className="mb-12 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('policy.changes.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="space-y-4">
              <p>{t('policy.changes.text1')}</p>

              <p>{t('policy.changes.text2')}</p>
            </Card.Content>
          </Card>

          {/* Contact */}
          <Card className="mb-12 rounded-2xl p-8 shadow-2xl bg-amber-50 dark:shadow-gray-800/90 border border-amber-100 dark:border-gray-800 dark:bg-gray-800/90">
            <CardHeader>
              <h2 className="font-display text-3xl font-bold">{t('policy.contact.title')}</h2>
            </CardHeader>
            <Separator />
            <Card.Content>
              <p className="mb-4">{t('policy.contact.text')}</p>

              <div className="bg-amber-100 dark:bg-gray-700 p-6 rounded-xl">
                <p className="mb-2">
                  <strong>{t('policy.contact.email')}</strong>
                </p>
                <a
                  href="mailto:quailbreeding@gmail.com"
                  className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 text-lg transition-colors"
                >
                  quailbreeding@gmail.com
                </a>
              </div>
            </Card.Content>
          </Card>

          {/* Last Updated */}
          <div className="text-center pt-8 border-t border-earth-200 dark:border-gray-700">
            <p className="text-earth-600 dark:text-gray-400 italic">{t('policy.lastUpdated')}</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
