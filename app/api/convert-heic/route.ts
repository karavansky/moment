import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  const tempDir = join(tmpdir(), 'heic-convert')
  let inputPath = ''
  let outputPath = ''

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log(`Converting HEIC: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)

    const buffer = Buffer.from(await file.arrayBuffer())

    // Create temp directory if not exists
    await mkdir(tempDir, { recursive: true })

    const fileId = randomUUID()
    inputPath = join(tempDir, `${fileId}.heic`)
    outputPath = join(tempDir, `${fileId}.jpeg`)

    // Write HEIC to temp file
    await writeFile(inputPath, buffer)

    // Use sips (macOS) or convert (ImageMagick) for conversion
    const isMac = process.platform === 'darwin'

    if (isMac) {
      // macOS: use sips (native HEIC support)
      await execAsync(`sips -s format jpeg -s formatOptions 90 "${inputPath}" --out "${outputPath}"`)
    } else {
      // Linux: try ImageMagick (needs libheif)
      await execAsync(`convert "${inputPath}" -quality 90 "${outputPath}"`)
    }

    // Read converted file
    const jpegBuffer = await readFile(outputPath)

    console.log(`Converted to JPEG: ${(jpegBuffer.length / 1024 / 1024).toFixed(2)} MB`)

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
  } finally {
    // Cleanup temp files
    try {
      if (inputPath) await unlink(inputPath).catch(() => {})
      if (outputPath) await unlink(outputPath).catch(() => {})
    } catch {
      // Ignore cleanup errors
    }
  }
}
