import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q')
  const osm_tag = searchParams.getAll('osm_tag')
  const limit = searchParams.get('limit')
  const lang = searchParams.get('lang') || 'de'
  const country = searchParams.get('country')  // Get country filter for post-processing

  if (!q) {
    return NextResponse.json({ features: [] }, { status: 400 })
  }

  // Use official Photon API (Komoot) for planet coverage without high resource usage
  //  const baseUrl = process.env.PHOTON_URL || 'http://photon:2322/api'
  const baseUrl = process.env.PHOTON_URL || 'https://photon.komoot.io/api/'

  const photonUrl = new URL(baseUrl)
  photonUrl.searchParams.set('q', q)
  photonUrl.searchParams.set('lang', lang)
  // Request more results since we'll filter by country on the backend
  if (limit && country) {
    // Request 3x the limit to ensure we have enough results after filtering
    photonUrl.searchParams.set('limit', String(Math.min(parseInt(limit) * 3, 50)))
  } else if (limit) {
    photonUrl.searchParams.set('limit', limit)
  }
  osm_tag.forEach(tag => photonUrl.searchParams.append('osm_tag', tag))

  const urlString = photonUrl.toString()

  console.log('[Photon Proxy] Request:', {
    query: q,
    country: country || 'none',
    osm_tags: osm_tag,
    url: urlString
  })

  try {
    const res = await fetch(urlString)
    if (!res.ok) {
      const text = await res.text()
      console.error(`[Photon Proxy] Upstream error ${res.status}: ${text}`)
      throw new Error(`Photon API returned ${res.status}: ${text}`)
    }
    const data = await res.json()

    // Filter by country if specified
    // Photon returns countrycode in properties.countrycode (ISO 3166-1 alpha-2)
    if (country && data.features) {
      const countryUpper = country.toUpperCase()
      console.log(`[Photon Proxy] Before filter: ${data.features.length} features`)
      data.features = data.features.filter((feature: any) => {
        const featureCountry = feature.properties?.countrycode?.toUpperCase()
        return featureCountry === countryUpper
      })
      console.log(`[Photon Proxy] After filter: ${data.features.length} features for ${countryUpper}`)

      // Trim to original limit
      if (limit) {
        data.features = data.features.slice(0, parseInt(limit))
      }

      console.log(`[Photon Proxy] Filtered to ${data.features.length} features for country ${countryUpper}`)
    } else {
      console.log(`[Photon Proxy] Results: ${data.features?.length || 0} features`)
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[Photon Proxy] Connection failed:', error.message)
    return NextResponse.json({ features: [], error: error.message }, { status: 500 })
  }
}
