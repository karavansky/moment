'use client'

import { useTranslation } from '@/components/Providers';
import { localizedLink } from '@/utils/localizedLink'
import { useLanguage } from '@/hooks/useLanguage'

// AboutPage.tsx
// Next.js (React) component styled with Tailwind CSS
// Default export a functional component so you can drop it into /app/about/page.tsx



// Small presentational component
function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-amber-100 p-5 bg-white shadow-sm">
      <h4 className="font-semibold">{title}</h4>
      <p className="mt-2 text-gray-700 text-sm">{desc}</p>
    </div>
  );
}


export default function AboutClient() {
  const { t } = useTranslation()
    const lang = useLanguage()

  return (
      <div className="container mx-auto pb-8 pt-18 px-6 lg:px-20">
        {/* HERO */}
        <section className="relative bg-amber-200/60 rounded-2xl p-8 md:p-12 shadow-md overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
                {t('about.cardIntro.title')}
              </h1>
              <p className="mt-4 text-lg md:text-xl text-gray-700">
                {t('about.cardIntro.text')}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={localizedLink('get-started', lang)}
                  className="inline-block rounded-lg bg-amber-600 text-white px-4 py-2 font-medium shadow hover:bg-amber-700 transition"
                >
                  {t('home.get')}
                </a>

                <a
                  href="#story"
                  className="inline-block rounded-lg border border-amber-600 text-amber-700 px-4 py-2 font-medium hover:bg-amber-50 transition"
                >
                  {t('about.cardIntro.story')}
                </a>
              </div>
            </div>

            <div className="w-full md:w-1/3 shrink-0">
              <div className="rounded-xl bg-white p-4 shadow-sm border border-amber-100">
                <div className="text-sm text-gray-500">{t('about.cardIntro.facts')}</div>
                <ul className="mt-3 space-y-2 text-gray-700">
                  <li>🐣 {t('about.cardIntro.fact1')}</li>
                  <li>⚙️ {t('about.cardIntro.fact2')}</li>
                  <li>📱 {t('about.cardIntro.fact3')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* playful background ornament */}
          <div className="pointer-events-none absolute -right-10 -top-10 opacity-10 text-7xl">🐤</div>
        </section>

        {/* STORY */}
        <section id="story" className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <article className="md:col-span-2 bg-white rounded-2xl p-8 shadow">
            <h2 className="text-2xl font-bold">{t('about.cardStory.title')}</h2>
            <p className="mt-4 text-gray-700 leading-relaxed">
              {t('about.cardStory.text1')}
             </p>
            <p className="mt-4 text-gray-700 leading-relaxed">
              {t('about.cardStory.text2')}
            </p>
            <p className="mt-4 text-gray-700 leading-relaxed">
              {t('about.cardStory.text3')}
            </p>
            <p className="mt-4 text-gray-700 leading-relaxed">
              {t('about.cardStory.text4')}
            </p>
            <div className="mt-6">
              <a
                href="/#features"
                className="inline-block rounded-lg bg-amber-600 text-white px-4 py-2 font-medium shadow hover:bg-amber-700 transition"
              >
              {t('about.cardStory.button')}
              </a>
            </div>
          </article>

          <aside className="bg-amber-50 border border-amber-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold">{t('about.cardFounder.founder')}</h3>
            <p className="mt-2 text-gray-700">{t('about.cardFounder.text')}</p>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-600">{t('about.cardFounder.funFacts')}</h4>
              <ul className="mt-2 text-gray-700 space-y-2 text-sm">
                <li>• {t('about.cardFounder.fact1')}</li>
                <li>• {t('about.cardFounder.fact2')}</li>
                <li>• {t('about.cardFounder.fact3')}</li>
              </ul>
            </div>
          </aside>
        </section>

        {/* FEATURES / VALUE */}
        <section className="mt-12 bg-white rounded-2xl p-8 shadow">
          <h2 className="text-2xl font-bold">{t('about.cardWhy.title')}</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
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
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 rounded-2xl p-8 bg-amber-50 border border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">{t('about.cardPromo.title')}</h3>
            <p className="mt-2 text-gray-700">{t('about.cardPromo.text')}</p>
          </div>

          <div className="flex gap-3">
            <a
              href="https://apps.apple.com/us/app/quail-breeder/id1527993430"
              className="inline-block rounded-lg bg-amber-700 text-white px-4 py-2 font-semibold shadow hover:bg-amber-800 transition"
            >
              {t('about.cardPromo.button')}
            </a>

            <a
              href="mailto:quailbreeding@gmail.com"
              className="inline-block rounded-lg border border-amber-700 text-amber-700 px-4 py-2 font-medium hover:bg-amber-50 transition"
            >
              {t('about.cardPromo.contact')}
            </a>
          </div>
        </section>
      </div>
  )
}
