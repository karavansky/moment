import { ChevronDown } from 'lucide-react'
import { Accordion } from '@heroui/react'
import { useTranslation } from '@/components/Providers'

export function FAQ() {
  const { t } = useTranslation()
  const categories = [
    {
      items: [
        {
          content: t('landing.faq.items.pwa_what.a'),
          title: t('landing.faq.items.pwa_what.q'),
        },
        {
          content:  t('landing.faq.items.offline.a'),
          title: t('landing.faq.items.offline.q'),
        },
      ],
      title: t('landing.faq.categories.setup'),
    },
    {
      items: [
        {
          content:
            t('landing.faq.items.privacy_legal.a'),
          title: t('landing.faq.items.privacy_legal.q'),
        },

      ],
      title: t('landing.faq.categories.privacy'),
    },
    {
      items: [
        {
          content: t('landing.faq.items.kpi_qr.a'),
          title: t('landing.faq.items.kpi_qr.q'),
        },
        {
          content:  t('landing.faq.items.export.a'),
          title: t('landing.faq.items.export.q'),
        },
      ],
      title: t('landing.faq.categories.performance'),
    },
  ]

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1 text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('landing.faq.title')}</h2>
        <p className="mb-4 text-lg md:text-xl font-medium text-blue-100 max-w-2xl mx-auto">
          {t('landing.faq.subtitle')}
        </p>
      </div>
      {categories.map(category => (
        <div key={category.title}>
          <p className="text-xl mb-4 font-bold text-blue-200">{category.title}</p>
          <Accordion className="w-full text-white" variant="surface">
            {category.items.map((item, index) => (
              <Accordion.Item key={index}>
                <Accordion.Heading>
                  <Accordion.Trigger className="text-lg font-semibold text-white">
                    {item.title}
                    <Accordion.Indicator>
                      <ChevronDown />
                    </Accordion.Indicator>
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="text-base md:text-lg text-blue-50 leading-relaxed pb-6">
                    {item.content}
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  )
}
