'use client'

import { useState, useEffect } from 'react'

export function usePlatform() {
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase()

    // Определение iOS
    // iPadOS 13+ часто маскируется под Macintosh, но имеет touch points
    const isIpad = /macintosh/.test(userAgent) && 'ontouchend' in document
    const isIphone = /iphone|ipod/.test(userAgent) || isIpad

    // Определение Android
    const isAndroidDevice = /android/.test(userAgent)

    setIsIOS(isIphone)
    setIsAndroid(isAndroidDevice)
    setIsMobile(isIphone || isAndroidDevice)
    setIsReady(true)
  }, [])

  return { isIOS, isAndroid, isMobile, isReady }
}
