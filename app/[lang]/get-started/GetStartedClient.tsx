'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useTranslation } from '@/components/Providers'
import { useMemo } from 'react'

export default function GetStartedClient() {
  const { t } = useTranslation()
  const steps = useMemo(
    () => [
      {
        title: t('getStarted.step1.title'),
        description: t('getStarted.step1.description'),
        image: '/set_up_incubator.webp',
      },
      {
        title: t('getStarted.step2.title'),
        description: t('getStarted.step2.description'),
        image: '/set_up_brooder.webp',
      },
      {
        title: t('getStarted.step3.title'),
        description: t('getStarted.step3.description'),
        image: '/set_up_location_cages.webp',
      },
      {
        title: t('getStarted.final.title'),
        description: t('getStarted.final.description'),
        image: '/new-batch.webp',
      },
    ],
    [t]
  )

  return (
    <main className="min-h-screen bg-sand-50 dark:bg-gray-900 text-earth-900 dark:text-gray-100 flex flex-col items-center">
      <section className="py-24 px-6 w-full max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-display text-5xl md:text-7xl font-bold text-earth-900 dark:text-gray-100 mb-8 text-center"
        >
          {t('getStarted.title')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl md:text-2xl text-earth-700 dark:text-gray-300 mb-16 text-center"
        >
          {t('getStarted.intro')}
        </motion.p>
        <div className="relative flex flex-col items-start">
          {/* Vertical line on the left */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600 dark:bg-gray-500 z-0"
            style={{ height: `calc(100% - 32px)` }}
          />
          <div className="flex flex-col gap-20 w-full z-10">
            {/* Preparation section */}
            <div className="mb-2 ml-8">
              <span className="inline-block bg-sand-200 dark:bg-gray-700 text-earth-700 dark:text-gray-200 text-xs font-semibold px-4 py-1 rounded-full shadow-sm uppercase tracking-widest">
                {t('getStarted.stepsTitle')}
              </span>
            </div>
            {steps.slice(0, 3).map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-start text-left w-full">
                {/* Dot on the line, left aligned */}
                <div className="flex flex-col items-center mr-8">
                  <div
                    className="w-6 h-6 rounded-full bg-amber-700 dark:bg-gray-400 border-4 border-white dark:border-gray-700 mb-4 z-10"
                    style={{ marginLeft: '-12px' }}
                  />
                </div>
                <h2 className="font-display text-3xl font-bold text-earth-900 dark:text-gray-100 mb-6 w-full text-center">
                  {step.title}
                </h2>
                <div className="flex flex-col md:flex-row w-full max-w-4xl items-start">
                  <div className="bg-white/80 dark:bg-gray-800/80 max-w-[calc(100%-20px)] backdrop-blur-md p-8 rounded-3xl border border-sand-300 dark:border-gray-600 shadow-xl flex flex-col md:w-1/2 min-w-0 ml-8 md:ml-16 mr-8 md:mr-0">
                    <p className="text-lg text-earth-700 dark:text-gray-300 mb-6 text-left w-full">
                      {step.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-start w-full md:w-1/2 min-w-0 md:pl-8 mt-8 md:mt-0">
                    <div className="flex items-center justify-center w-full">
                      <div className="relative w-full aspect-480/1039 max-w-87.5">
                        <Image
                          src={step.image}
                          alt={step.title}
                          fill
                          sizes="350px"
                          className="rounded-xl shadow-lg  object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Separatorfor Finally section */}
            <div className="flex flex-row items-center gap-4 my-4 ml-8">
              <div className="flex flex-col items-center mr-8">
                <div
                  className="w-4 h-4 rounded-full bg-cyan-500 dark:bg-cyan-400 border-4 border-white dark:border-gray-700 z-10"
                  style={{ marginLeft: '-10px' }}
                />
              </div>
              <span className="text-cyan-700 dark:text-cyan-400 font-bold text-lg tracking-wide uppercase">
                {t('getStarted.finalTitle')}
              </span>
              <div className="flex-1 h-0.5 bg-cyan-200 dark:bg-cyan-700 rounded-full" />
            </div>
            {/* Final step */}
            <div className="relative flex flex-col items-start text-left w-full">
              <div className="flex flex-col items-center mr-8">
                <div
                  className="w-6 h-6 rounded-full bg-cyan-500 dark:bg-cyan-400 border-4 border-white dark:border-gray-700 mb-4 z-10"
                  style={{ marginLeft: '-12px' }}
                />
              </div>
              <h2 className="font-display text-3xl font-bold text-cyan-900 dark:text-cyan-400 mb-6 w-full text-center">
                {steps[3].title}
              </h2>
              <div className="flex flex-col md:flex-row w-full max-w-4xl items-stretch">
                <div className="flex flex-col md:flex-row w-full max-w-4xl items-start">
                  <div className="bg-white/80 dark:bg-gray-800/80 max-w-[calc(100%-20px)] backdrop-blur-md p-8 rounded-3xl border border-sand-300 dark:border-gray-600 shadow-xl flex flex-col md:w-1/2 min-w-0 ml-8 md:ml-16 mr-8 md:mr-0">
                    <div className="text-cyan-800 dark:text-cyan-300 mb-6 text-left w-full whitespace-pre-line text-base">
                      {steps[3].description}
                    </div>
                  </div>
                  <div className="flex flex-col items-start w-full md:w-1/2 min-w-0 md:pl-8 mt-8 md:mt-0">
                    <div className="flex items-center justify-center w-full">
                      <div className="relative w-full aspect-480/1039 max-w-87.5">
                        <Image
                          src={steps[3].image}
                          alt="Creation of a New Batch screenshot"
                          fill
                          sizes="350px"
                          className="rounded-xl shadow-lg  object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-20 text-center">
          <a
            href="https://apps.apple.com/us/app/quail-breeder/id1527993430"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold shadow hover:bg-amber-700 transition"
          >
            {t('getStarted.download')}
          </a>
        </div>
      </section>
    </main>
  )
}
