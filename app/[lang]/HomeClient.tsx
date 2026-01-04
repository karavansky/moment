'use client'

import { m, useScroll, useTransform, LazyMotion, domAnimation } from 'framer-motion'
import { useMemo, useRef } from 'react'
import Image from 'next/image'
import Script from 'next/script'
import { generateOrganizationJsonLd, generateWebApplicationJsonLd } from '@/lib/seo/metadata'
import { useTranslation } from '@/components/Providers'
import { localizedLink } from '@/utils/localizedLink'
import { useLanguage } from '@/hooks/useLanguage'
import { Card, Separator } from '@heroui/react'
import SupportBlock from '@/components/SupportBlock'

// Separate component for Hero with Parallax to avoid hydration issues
function HeroSection({ t }: { t: (path: string, fallback?: string) => string }) {
  const heroRef = useRef<HTMLElement>(null)

  // Проверяем размер экрана для отключения параллакса на мобильных
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // Используем parallax только на desktop
  const y = useTransform(scrollYProgress, [0, 1], isMobile ? ['0%', '0%'] : ['0%', '-20%'])

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen-dynamic flex items-center justify-center overflow-hidden"
    >
      {/* Hero Content Container - Flexible Layout */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
        {/* Desktop Layout: Text Left, Image Right */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="text-left">
            <h1
              className="font-display text-4xl md:text-5xl lg:text-5xl font-bold text-white mb-6 tracking-tight backdrop-blur-md p-6 rounded-4xl animate-slide-up"
              style={{
                textShadow:
                  '2px 2px 8px rgba(0, 0, 0, 0.54), -1px -1px 4px rgba(0, 0, 0, 0.42), 0 0 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              {t('home.topmoto')}
            </h1>
            <div>
              {' '}
              {/*className="animate-slide-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]"*/}
              <Card className="bg-background/5 backdrop-blur-md  dark:bg-default/5 rounded-4xl shadow-2xl p-4 mt-8">
                <Card.Header>
                  <h2
                    className="text-3xl md:text-4xl lg:text-3xl text-white max-w-xl font-semibold "
                    style={{
                      textShadow: '1px 1px 6px rgba(0, 0, 0, 0.54), 0 0 12px rgba(0, 0, 0, 0.36)',
                    }}
                  >
                    {t('home.botmototitel')}
                  </h2>
                </Card.Header>
                <Separator />
                <Card.Content className="p-4">
                  <p
                    style={{
                      textShadow: '1px 1px 6px rgba(0, 0, 0, 0.54), 0 0 12px rgba(0, 0, 0, 0.36)',
                    }}
                    className="text-3xl md:text-4xl lg:text-3xl text-white max-w-xl font-semibold "
                  >
                    {t('home.botmoto')}
                  </p>
                </Card.Content>
              </Card>
            </div>
          </div>

          {/* Right Side - Parallax Image */}
          <m.div style={{ y }} className="flex items-center justify-center h-[80vh] relative ">
            <div
              className="relative h-[80vh]  w-[40vw] max-w-120"
              style={{ aspectRatio: '480/969' }}
            >
              <Image
                src="/quail-breeder-application-sm.webp"
                alt="Quail Breeder Application"
                fill
                priority
                fetchPriority="high"
                quality={70}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain drop-shadow-2xl"
              />
            </div>
          </m.div>
        </div>

        {/* Mobile Layout: Title, Image, Subtitle */}
        <div className="flex lg:hidden flex-col items-center text-center gap-8 pt-18 pb-0">
          {/* Title with background for readability 
                      className="bg-white/70 dark:bg-gray-800/90 backdrop-blur-md p-8 md:p-12 rounded-3xl  border border-sand-300 dark:border-gray-600 shadow-2xl mb-8"
*/}
          <div
            className="font-display text-4xl md:text-5xl lg:text-5xl font-bold text-white mb-6 tracking-tight backdrop-blur-md p-6 rounded-4xl animate-slide-up"
            style={{
              textShadow:
                '2px 2px 8px rgba(0, 0, 0, 0.54), -1px -1px 4px rgba(0, 0, 0, 0.42), 0 0 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold text-sand-50 dark:text-white tracking-tight">
              {t('home.topmoto')}
            </h1>
          </div>

          {/* Image with Parallax on Mobile */}
          <m.div style={{ y }} className="flex items-center justify-center w-full ">
            <div className="relative w-[80vw] max-w-120" style={{ aspectRatio: '480/969' }}>
              <Image
                src="/quail-breeder-application-sm.webp"
                alt="Quail Breeder Application"
                fill
                priority
                fetchPriority="high"
                quality={70}
                sizes="(max-width: 640px) 90vw, (max-width: 1023px) 45vw, 330px"
                className="object-contain drop-shadow-2xl"
              />
            </div>
          </m.div>

          {/* Subtitle with background for readability
           className="bg-white/70 dark:bg-gray-800/90 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-sand-300 dark:border-gray-600 shadow-2xl mb-8"
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="font-display text-4xl md:text-5xl lg:text-5xl font-bold text-white mb-6 tracking-tight backdrop-blur-md p-6 rounded-2xl"
            style={{
              textShadow:
                '2px 2px 8px rgba(0, 0, 0, 0.54), -1px -1px 4px rgba(0, 0, 0, 0.42), 0 0 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <p className="text-2xl md:text-4xl lg:text-4xl text-sand-50 dark:text-white max-w-xl font-semibold">
              {t('home.botmoto')}
            </p>
          </m.div> */}
          <Card className="bg-background/5 backdrop-blur-md  dark:bg-default/5 rounded-4xl shadow-2xl p-4 mt-8">
            <Card.Header>
              <h2
                className="text-3xl md:text-4xl lg:text-3xl text-white max-w-xl font-semibold "
                style={{
                  textShadow: '1px 1px 6px rgba(0, 0, 0, 0.54), 0 0 12px rgba(0, 0, 0, 0.36)',
                }}
              >
                {t('home.botmototitel')}
              </h2>
            </Card.Header>
            <Separator />
            <Card.Content className="p-4">
              <p
                style={{
                  textShadow: '1px 1px 6px rgba(0, 0, 0, 0.54), 0 0 12px rgba(0, 0, 0, 0.36)',
                }}
                className="text-3xl md:text-4xl lg:text-3xl text-white max-w-xl font-semibold "
              >
                {t('home.botmoto')}
              </p>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Scroll Indicator - Hidden on Mobile */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="hidden lg:flex absolute bottom-12 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-sand-200 text-sm tracking-widest">SCROLL</span>
          <m.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-px h-16 bg-linear-to-b from-sand-200 to-transparent"
          />
        </div>
      </m.div>
    </section>
  )
}

export default function HomeClient() {
  const { t } = useTranslation()
  const lang = useLanguage()

  const processSteps = useMemo(
    () => [
      {
        number: '01',
        title: t('process.incubation.title'),
        description: t('process.incubation.desc'),
        details: t('process.incubation.details'),
        image: '/incubation.webp',
      },
      {
        number: '02',
        title: t('process.hatching.title'),
        description: t('process.hatching.desc'),
        details: t('process.hatching.details'),
        image: '/hatching.webp',
      },
      {
        number: '03',
        title: t('process.brooding.title'),
        description: t('process.brooding.desc'),
        details: t('process.brooding.details'),
        image: '/brooding.webp',
      },
      {
        number: '04',
        title: t('process.feeding.title'),
        description: t('process.feeding.desc'),
        details: t('process.feeding.details'),
        image: '/feeding.webp',
      },
      {
        number: '05',
        title: t('process.slaughter.title'),
        description: t('process.slaughter.desc'),
        details: t('process.slaughter.details'),
        image: '/slaughter.webp',
      },
      {
        number: '06',
        title: t('process.selling.title'),
        description: t('process.selling.desc'),
        details: t('process.selling.details'),
        image: '/selling.webp',
      },
    ],
    [t]
  )
  const features = useMemo(
    () => [
      { title: t('features.feat1.title'), text: t('features.feat1.text') },
      {
        title: t('features.feat2.title'),
        text: t('features.feat2.text'),
      },
      {
        title: t('features.feat3.title'),
        text: t('features.feat3.text'),
      },
      {
        title: t('features.feat4.title'),
        text: t('features.feat4.text'),
      },
      {
        title: t('features.feat5.title'),
        text: t('features.feat5.text'),
      },
      {
        title: t('features.feat6.title'),
        text: t('features.feat6.text'),
      },
    ],
    [t]
  )
  const heroRefTop = useRef<HTMLElement>(null)

  // Проверяем размер экрана для отключения параллакса на мобильных
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  const { scrollYProgress } = useScroll({
    target: heroRefTop,
    offset: ['start start', 'end start'],
  })

  // Используем parallax только на desktop
  const yTop = useTransform(scrollYProgress, [0, 1], isMobile ? ['0%', '0%'] : ['0%', '-20%'])
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="relative">
        {/* JSON-LD Structured Data for SEO */}
        <Script
          id="organization-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationJsonLd()),
          }}
        />
        <Script
          id="webapp-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateWebApplicationJsonLd()),
          }}
        />

        {/* Background Pattern - Desktop (fixed, covers viewport) */}
        <div className="hidden lg:block fixed top-0 left-0 w-screen z-0 h-screen-dynamic">
          <Image
            src="/quail_eggs_sm_new.webp"
            alt="Quail eggs pattern"
            fill
            priority
            fetchPriority="high"
            quality={60}
            sizes="100vw"
            className="object-cover"
          />
        </div>
        {/* Background Pattern - Mobile (fixed, covers viewport) */}
        <div className="lg:hidden fixed top-0 left-0 w-screen z-0 h-screen">
          <Image
            src="/quail_eggs_vertical.webp"
            alt="Quail eggs pattern"
            fill
            priority
            fetchPriority="high"
            quality={50}
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="min-h-screen relative z-10">
          {/* Hero Section */}
          <HeroSection t={t} />

          {/* What is QuailBreeder Section */}
          <section id="features" className="py-16 px-6 relative">
            <div className="max-w-6xl mx-auto">
              <m.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.6 }}
                className="mb-20"
              >
                <div className="bg-white/70 dark:bg-gray-800/90 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-sand-300 dark:border-gray-600 shadow-2xl mb-8">
                  <h2 className="font-display text-5xl md:text-7xl font-bold text-earth-900 dark:text-white mb-8 text-balance">
                    {t('home.what')}
                  </h2>
                  <div className="prose prose-lg max-w-4xl">
                    <p className="text-xl md:text-2xl text-earth-800 dark:text-gray-200 leading-relaxed font-light">
                      {t('home.expl')}
                    </p>
                  </div>
                </div>
                {/* "bg-linear-to-br from-sand-100 to-sand-200 dark:from-gray-800 dark:to-gray-700 p-12 rounded-3xl border border-sand-300 dark:border-gray-600 shadow-xl"*/}
                <div className=" lg:grid lg:grid-cols-2 gap-12 items-center">
                  <div className="prose prose-lg max-w-4xl mx-auto">
                    <div className=" bg-white/70 dark:bg-gray-800/80 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-sand-300 dark:border-gray-600 shadow-2xl mb-8">
                      <h3 className="font-display text-3xl font-bold text-earth-900 dark:text-white mb-8">
                        {t('features.title')}
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        {features.map((feature, index) => (
                          <m.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="flex items-start gap-3"
                          >
                            <div className="shrink-0 w-2 h-2 rounded-full bg-earth-600 dark:bg-blue-400 mt-2" />
                            <div className="flex flex-col gap-1">
                              <p className="text-earth-800 dark:text-gray-100 text-lg font-semibold">
                                {feature.title}
                              </p>
                              <p className="text-earth-700 dark:text-gray-300 text-base">
                                {feature.text}
                              </p>
                            </div>
                          </m.div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <m.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      style={{
                        textShadow:
                          '2px 2px 8px rgba(0, 0, 0, 0.54), -1px -1px 4px rgba(0, 0, 0, 0.42), 0 0 20px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <h2 className="pt-12 font-display text-5xl md:text-7xl lg:text-6xl font-bold text-white tracking-tight text-center mb-6">
                        {t('home.flow')}
                      </h2>
                    </m.div>
                    <m.div
                      style={{ y: yTop }}
                      className="flex items-center justify-center h-[80vh] relative "
                    >
                      <div
                        className="relative h-[80vh]  w-[80vw] max-w-120"
                        style={{ aspectRatio: '480/969' }}
                      >
                        <Image
                          src="/flow_map_quail_breeder_sm.webp"
                          alt="Quail Breeder Flow Map"
                          fill
                          quality={70}
                          sizes="(max-width: 1024px) 100vw, 80vw"
                          className="object-contain drop-shadow-2xl"
                          placeholder="blur"
                          blurDataURL="data:image/webp;base64,UklGRh4AAABXRUJQVlA4IBIAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"
                        />
                      </div>
                    </m.div>
                  </div>
                </div>
              </m.div>
            </div>
          </section>

          {/* Flow Map Section */}
          <section ref={heroRefTop} className="pb-16 px-6 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-20 right-10 w-64 h-64 bg-sand-300/20 dark:bg-blue-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-earth-300/10 dark:bg-purple-400/10 rounded-full blur-3xl" />
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex justify-center mb-12"
            >
              <div className=" bg-white/70 dark:bg-gray-800/80 backdrop-blur-md px-8 py-6 rounded-2xl border border-sand-300/30 dark:border-gray-600/40 shadow-2xl">
                <h3 className="font-display text-4xl md:text-5xl lg:text-5xl font-bold text-sand-50 dark:text-white tracking-tight text-center">
                  {t('home.content')}
                </h3>
              </div>
            </m.div>
            <div className="max-w-6xl mx-auto relative z-10">
              {/* Desktop Layout: Text Left, Image Right */}
              <div className="space-y-16">
                {processSteps.map((step, index) => (
                  <m.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px', amount: 0.2 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="relative"
                  >
                    <div className="flex flex-col gap-4 md:gap-8">
                      {/* Number and Title row on mobile */}
                      <div className="flex md:hidden gap-4 items-center">
                        {/* Number */}
                        <m.div
                          whileHover={{ scale: 1.05 }}
                          className="w-20 h-20 rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-sand-300 dark:border-gray-600  flex items-center justify-center shadow-2xl shrink-0"
                        >
                          <span className="font-display text-2xl font-bold text-sand-100">
                            {step.number}
                          </span>
                        </m.div>

                        {/* Title */}
                        <div className="flex-1 h-20 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-6 rounded-2xl border border-sand-300 dark:border-gray-600 shadow-2xl flex items-center justify-center">
                          <h2 className="font-display text-3xl font-bold text-earth-900 dark:text-white text-center">
                            {step.title}
                          </h2>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden md:flex gap-8 items-start">
                        {/* Number (desktop only) "bg-white/80 dark:bg-gray-800/90 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-sand-300 dark:border-gray-600 shadow-2xl mb-8"*/}
                        <m.div
                          whileHover={{ scale: 1.05 }}
                          className="w-24 h-24 rounded-2xl bg-white/70 dark:bg-gray-800/80 backdrop-blur-sm border border-sand-300 dark:border-gray-600 flex items-center justify-center shadow-2xl shrink-0"
                        >
                          <span className="font-display text-3xl font-bold text-sand-100">
                            {step.number}
                          </span>
                        </m.div>

                        {/* Content */}
                        <div className="flex-1 bg-white/70 dark:bg-gray-800/80 backdrop-blur-sm p-6 md:p-10 rounded-3xl border border-sand-300 dark:border-gray-600 shadow-lg hover:shadow-2xl transition-shadow duration-300">
                          <div className="flex flex-col lg:flex-row gap-6">
                            {/* Text Content */}
                            <div className="flex-1">
                              {/* Title visible only on desktop */}
                              <h3 className="hidden md:block font-display text-3xl md:text-4xl font-bold text-earth-900 dark:text-white mb-4">
                                {step.title}
                              </h3>
                              <p className="text-base md:text-lg text-earth-700 dark:text-gray-200 mb-4 leading-relaxed">
                                {step.description}
                              </p>
                              {step.details && (
                                <p className="text-sm md:text-base text-earth-600 dark:text-gray-400 italic">
                                  {step.details}
                                </p>
                              )}
                            </div>

                            {/* Image */}
                            <div className="lg:w-64 shrink-0 w-full">
                              <m.div
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.3 }}
                                className="relative w-full aspect-video lg:aspect-auto lg:h-full rounded-2xl overflow-hidden shadow-2xl"
                                style={{
                                  background: 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)',
                                }}
                              >
                                {/* Outer border */}
                                <div className="absolute inset-0 rounded-2xl border-4 border-gray-400 pointer-events-none z-20" />

                                {/* Inner border (blue accent) */}
                                <div className="absolute inset-1 rounded-xl border-2 border-cyan-400 pointer-events-none z-10" />

                                {/* Image */}
                                <div className="absolute inset-3 rounded-lg overflow-hidden bg-gray-800">
                                  <Image
                                    src={step.image}
                                    alt={step.title}
                                    fill
                                    // Constrain intrinsic request size for small rendered thumbnails
                                    sizes="200px"
                                    quality={60}
                                    className="object-contain"
                                  />
                                </div>
                              </m.div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content for mobile */}
                      <div className="md:hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-3xl border border-sand-300 dark:border-gray-600 shadow-lg">
                        <div className="flex flex-col gap-6">
                          {/* Text Content */}
                          <div>
                            <p className="text-xl text-earth-700 dark:text-gray-200 mb-4 leading-relaxed">
                              {step.description}
                            </p>
                            {step.details && (
                              <p className="text-md text-earth-600 dark:text-gray-400 italic">
                                {step.details}
                              </p>
                            )}
                          </div>

                          {/* Image */}
                          <div className="w-full">
                            <m.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.3 }}
                              className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl"
                              style={{
                                background: 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)',
                              }}
                            >
                              {/* Outer border */}
                              <div className="absolute inset-0 rounded-2xl border-4 border-gray-400 pointer-events-none z-20" />

                              {/* Inner border (blue accent) */}
                              <div className="absolute inset-1 rounded-xl border-2 border-cyan-400 pointer-events-none z-10" />

                              {/* Image */}
                              <div className="absolute inset-3 rounded-lg overflow-hidden bg-gray-800">
                                <Image
                                  src={step.image}
                                  alt={step.title}
                                  fill
                                  loading="eager"
                                  // Mobile thumbnails render ~150px; request only what we need
                                  sizes="150px"
                                  quality={60}
                                  className="object-contain"
                                />
                              </div>
                            </m.div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Connecting Line */}
                    {index < processSteps.length - 1 && (
                      <div className="hidden md:block absolute left-12 top-24 w-px h-16 bg-linear-to-b from-earth-400 to-transparent" />
                    )}
                  </m.div>
                ))}
              </div>
            </div>
          </section>
          <SupportBlock />
        </div>
      </div>
    </LazyMotion>
  )
}
