import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const lang = searchParams.get('lang') || 'de'

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  }

  // Strip /api/ suffix if present — reverse geocoding is at /reverse on the same host
  const baseUrl = (process.env.PHOTON_URL || 'https://photon.komoot.io').replace(/\/api\/?$/, '')

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
