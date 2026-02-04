import { NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log(`Converting HEIC: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)

    const buffer = Buffer.from(await file.arrayBuffer())

    // Convert HEIC to JPEG using Sharp
    const jpegBuffer = await sharp(buffer)
      .jpeg({ quality: 90 })
      .toBuffer()

    console.log(`Converted to JPEG: ${(jpegBuffer.length / 1024 / 1024).toFixed(2)} MB`)

    // Return as base64 for simplicity (or could return as blob)
    return NextResponse.json({
      success: true,
      data: jpegBuffer.toString('base64'),
      mimeType: 'image/jpeg',
      originalName: file.name.replace(/\.(heic|heif)$/i, '.jpeg'),
    })
  } catch (error) {
    console.error('HEIC conversion error:', error)
    return NextResponse.json(
      {
        error: 'Conversion failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
