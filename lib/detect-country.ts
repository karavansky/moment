/**
 * Detect user's country by IP address
 */

/**
 * Detect country by IP using ipapi.co service
 * Returns ISO 3166-1 alpha-2 code in lowercase (e.g., 'de', 'us', 'ru')
 * Returns empty string if detection fails
 */
export async function detectCountryByIP(ip: string | null): Promise<string> {
  if (!ip) {
    console.log('[detectCountryByIP] No IP address provided')
    return ''
  }

  // Skip private/local IPs
  if (
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.') ||
    ip === '::1' ||
    ip === 'localhost'
  ) {
    console.log('[detectCountryByIP] Local IP detected, skipping')
    return ''
  }

  try {
    // Use ipapi.co free tier (up to 1000 requests/day, no API key needed)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    const response = await fetch(`https://ipapi.co/${ip}/country/`, {
      headers: {
        'User-Agent': 'moment-app/1.0',
      },
      signal: controller.signal,
      // Don't cache - we want fresh data for each new user
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('[detectCountryByIP] API error:', response.status)
      return ''
    }

    const countryCode = (await response.text()).trim().toLowerCase()

    console.log('[detectCountryByIP] Detected country:', countryCode, 'for IP:', ip)

    // Validate it's a 2-letter ISO code
    if (countryCode.length === 2 && /^[a-z]{2}$/.test(countryCode)) {
      return countryCode
    }

    return ''
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[detectCountryByIP] Request timeout')
    } else {
      console.error('[detectCountryByIP] Error:', error)
    }
    return ''
  }
}
