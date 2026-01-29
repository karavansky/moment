'use client'

import { useTranslation } from '@/components/Providers'
import { localizedLink } from '@/utils/localizedLink'
import { useLanguage } from '@/hooks/useLanguage'
import { Button, Card, CardFooter, CardHeader, Separator, Link } from '@heroui/react'
import SupportBlock from '@/components/SupportBlock'

// AboutPage.tsx
// Next.js (React) component styled with Tailwind CSS
// Default export a functional component so you can drop it into /app/about/page.tsx

// Small presentational component
function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="rounded-xl border border-gray-100  dark:border-gray-800  p-5 shadow-md">
      <CardHeader>
        <h4 className="font-semibold">{title}</h4>
      </CardHeader>
      <Card.Content>
        <p className="text-md">{desc}</p>
      </Card.Content>
    </Card>
  )
}

export default function AboutClient() {
  const { t } = useTranslation()
  const lang = useLanguage()

  return (
    <div className="w-full pb-6 pt-12 md:pt-12 px-0 md:px-6 lg:px-20">
      {/* HERO */}
      <label htmlFor="ice-cream-choice">Choose a flavor:</label>
      <input list="ice-cream-flavors" id="ice-cream-choice" name="ice-cream-choice" />

      <datalist id="ice-cream-flavors">
        <option value="Chocolate"></option>
        <option value="Coconut"></option>
        <option value="Mint"></option>
        <option value="Strawberry"></option>
        <option value="Vanilla"></option>
      </datalist>

      <Card className="relative rounded-2xl p-4 md:p-12 shadow-2xl border border-gray-100 dark:border-gray-800">
        <Card.Content>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
                {t('about.cardIntro.title')}
              </h1>
              <p className="mt-4 text-lg md:text-xl">{t('about.cardIntro.text')}</p>
              {/* CTA BUTTONS
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  as={Link}
                  color="primary"
                  href={localizedLink('get-started', lang)}
                  variant="solid"
                  size="lg"
                  className="shadow-md shadow-gray-500 dark:shadow-gray-700"
                >
                  {t('home.get')}
                </Button>
                <Button
                  as={Link}
                  color="primary"
                  href="#story"
                  variant="ghost"
                  size="lg"
                  className="shadow-md"
                >
                  {t('about.cardIntro.story')}
                </Button>
              </div>
               */}
            </div>

            <div className="w-full md:w-1/3 shrink-0">
              <Card className=" shadow-md  border border-gray-100  dark:border-gray-800 ">
                <CardHeader>
                  <h3 className="text-lg font-medium">{t('about.cardIntro.facts')}</h3>
                </CardHeader>
                <Separator />
                <Card.Content>
                  <ul className="mt-3 space-y-2">
                    <li>🐣 {t('about.cardIntro.fact1')}</li>
                    <li>⚙️ {t('about.cardIntro.fact2')}</li>
                    <li>📱 {t('about.cardIntro.fact3')}</li>
                  </ul>
                </Card.Content>
              </Card>
            </div>
          </div>

          {/* playful background ornament */}
        </Card.Content>
      </Card>

      {/* STORY */}
      <article id="story" className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <Card className="md:col-span-2 rounded-2xl p-5 shadow-2xl border border-gray-100  dark:border-gray-800 ">
          <CardHeader>
            <h2 className="text-2xl font-bold">{t('about.cardStory.title')}</h2>
          </CardHeader>
          <Separator />
          <Card.Content>
            <p className="mt-4 leading-relaxed">{t('about.cardStory.text1')}</p>
            <p className="mt-4 leading-relaxed">{t('about.cardStory.text2')}</p>
            <p className="mt-4 leading-relaxed">{t('about.cardStory.text3')}</p>
            <p className="mt-4 leading-relaxed">{t('about.cardStory.text4')}</p>
            {/* CTA BUTTON 
            <div className="mt-6">
              <Button
                as={Link}
                color="primary"
                href="/#features"
                variant="solid"
                size="lg"
                className="shadow-md shadow-gray-500 dark:shadow-gray-700"
              >
                {t('about.cardStory.button')}
              </Button>
            </div>
              */}
          </Card.Content>
        </Card>

        <Card className="bg-amber-50 dark:shadow-gray-800/90  border border-amber-100  dark:border-gray-800 dark:bg-gray-800/90  rounded-2xl p-6 shadow-2xl">
          <h3 className="text-2xl font-bold">{t('about.cardFounder.founder')}</h3>
          <p className="mt-6">{t('about.cardFounder.text')}</p>

          <div className="mt-6">
            <h4 className="text-md font-medium">{t('about.cardFounder.funFacts')}</h4>
            <ul className="mt-2 space-y-2 text-md">
              <li>• {t('about.cardFounder.fact1')}</li>
              <li>• {t('about.cardFounder.fact2')}</li>
              <li>• {t('about.cardFounder.fact3')}</li>
            </ul>
          </div>
        </Card>
      </article>

      {/* FEATURES / VALUE */}
      <Card className="mt-12 rounded-2xl p-6 shadow-2xl border border-gray-100  dark:border-gray-800 ">
        <CardHeader>
          <h2 className="text-2xl font-bold">{t('about.cardWhy.title')}</h2>
        </CardHeader>
        <Card.Content className=" grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title={t('about.cardWhy.reason1.title')}
            desc={t('about.cardWhy.reason1.text')}
          />
          <FeatureCard
            title={t('about.cardWhy.reason2.title')}
            desc={t('about.cardWhy.reason2.text')}
          />
          <FeatureCard
            title={t('about.cardWhy.reason3.title')}
            desc={t('about.cardWhy.reason3.text')}
          />
        </Card.Content>
      </Card>
      <SupportBlock />
      {/* CTA 
      
//        className="mt-2 mb-4 rounded-2xl shadow-2xl p-8 bg-amber-50 dark:shadow-gray-800/90  border border-amber-100  dark:border-gray-800 dark:bg-gray-800/90  flex flex-col md:flex-row items-center justify-between gap-6"

      <Card className="mt-12 mb-4 rounded-2xl shadow-2xl p-4 md:p-8 border border-gray-100 dark:border-gray-800">
        <CardHeader>
          <h3 className="text-xl font-bold">{t('about.cardPromo.title')}</h3>
        </CardHeader>
        <Card.Content>
          <p className="mt-2 ">{t('about.cardPromo.text')}</p>
        </Card.Content>
        <CardFooter className="flex flex-col md:flex-row items-center gap-3 justify-center">
          <Button
            as={Link}
            color="success"
            href="https://apps.apple.com/us/app/quail-breeder/id1527993430"
            variant="solid"
            size="lg"
            className=" shadow-md px-4 py-2 transition shadow-gray-500 dark:shadow-gray-700"
          >
            {t('about.cardPromo.button')}
          </Button>
          <Button
            as={Link}
            color="success"
            href={localizedLink('support', lang)}
            variant="ghost"
            size="lg"
            className="shadow-md"
          >
            {t('sla.hero.title')}
          </Button>
        </CardFooter>
      </Card>
      */}
    </div>
  )
}
