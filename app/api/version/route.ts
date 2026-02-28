import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { version: process.env.APP_VERSION || '0.1.0' },
    {
      headers: {
        // Prevent caching so clients always get the real version
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
