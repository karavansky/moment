import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q')
  const osm_tag = searchParams.getAll('osm_tag')
  const limit = searchParams.get('limit')
  const lang = searchParams.get('lang') || 'de'

  if (!q) {
    return NextResponse.json({ features: [] }, { status: 400 })
  }

  // Use official Photon API (Komoot) for planet coverage without high resource usage
  //  const baseUrl = process.env.PHOTON_URL || 'http://photon:2322/api'
  const baseUrl = process.env.PHOTON_URL || 'https://photon.komoot.io/api/'

  const photonUrl = new URL(baseUrl)
  photonUrl.searchParams.set('q', q)
  photonUrl.searchParams.set('lang', lang)
  if (limit) photonUrl.searchParams.set('limit', limit)
  osm_tag.forEach(tag => photonUrl.searchParams.append('osm_tag', tag))

  const urlString = photonUrl.toString()

  try {
    const res = await fetch(urlString)
    if (!res.ok) {
      const text = await res.text()
      console.error(`[Photon Proxy] Upstream error ${res.status}: ${text}`)
      throw new Error(`Photon API returned ${res.status}: ${text}`)
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[Photon Proxy] Connection failed:', error.message)
    return NextResponse.json({ features: [], error: error.message }, { status: 500 })
  }
}
