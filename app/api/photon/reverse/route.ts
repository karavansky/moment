import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const lang = searchParams.get('lang') || 'de'

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  }

  // For German: use local container if PHOTON_URL is configured (strips /api/ suffix)
  // For other languages: always use public Komoot API (worldwide coverage)
  let baseUrl: string
  if (lang === 'de' && process.env.PHOTON_URL) {
    baseUrl = process.env.PHOTON_URL.replace(/\/api\/?$/, '')
  } else {
    baseUrl = 'https://photon.komoot.io'
  }

  const url = new URL(`${baseUrl}/reverse`)
  url.searchParams.set('lat', lat)
  url.searchParams.set('lon', lon)
  url.searchParams.set('lang', lang)

  try {
    const res = await fetch(url.toString())
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[Photon Reverse Proxy] Connection failed:', error.message)
    return NextResponse.json({ features: [], error: error.message }, { status: 500 })
  }
}
