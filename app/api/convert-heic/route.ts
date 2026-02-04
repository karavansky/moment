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

    // Check file type with 'file' command for diagnostics
    try {
      const { stdout } = await execAsync(`file "${inputPath}"`)
      console.log(`File type detection: ${stdout.trim()}`)
    } catch {
      console.log('Could not detect file type')
    }

    // Try different tools for HEIC conversion
    // Ubuntu: sudo apt-get install imagemagick libheif-examples
    // macOS: sips is built-in
    console.log(`Platform: ${process.platform}`)

    let converted = false
    const errors: string[] = []

    // Try sips (macOS)
    if (!converted) {
      try {
        await execAsync(`sips -s format jpeg -s formatOptions 90 "${inputPath}" --out "${outputPath}"`)
        console.log('Converted using sips (macOS)')
        converted = true
      } catch (e) {
        errors.push(`sips: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Try ImageMagick magick (v7+)
    if (!converted) {
      try {
        await execAsync(`magick "${inputPath}" -quality 90 "${outputPath}"`)
        console.log('Converted using ImageMagick (magick)')
        converted = true
      } catch (e) {
        errors.push(`magick: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Try ImageMagick convert (v6)
    if (!converted) {
      try {
        await execAsync(`convert "${inputPath}" -quality 90 "${outputPath}"`)
        console.log('Converted using ImageMagick (convert)')
        converted = true
      } catch (e) {
        errors.push(`convert: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Try heif-convert (libheif-examples) - without quality flag first
    if (!converted) {
      try {
        await execAsync(`heif-convert "${inputPath}" "${outputPath}"`)
        console.log('Converted using heif-convert')
        converted = true
      } catch (e) {
        errors.push(`heif-convert: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Try ffmpeg (often handles problematic files better)
    if (!converted) {
      try {
        await execAsync(`ffmpeg -i "${inputPath}" -q:v 2 "${outputPath}" -y`)
        console.log('Converted using ffmpeg')
        converted = true
      } catch (e) {
        errors.push(`ffmpeg: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Try Python pillow-heif (often has newer libheif)
    // Install: python3 -m venv /opt/heic-converter && /opt/heic-converter/bin/pip install pillow pillow-heif
    if (!converted) {
      const pythonScript = `
from PIL import Image
from pillow_heif import register_heif_opener
register_heif_opener()
img = Image.open("${inputPath}")
img.convert("RGB").save("${outputPath}", "JPEG", quality=90)
`
      // Try venv python first, then system python
      const pythonPaths = [
        '/opt/heic-converter/bin/python3',
        '/opt/heic-converter/bin/python',
        'python3',
        'python'
      ]

      for (const pythonPath of pythonPaths) {
        if (converted) break
        try {
          await execAsync(`${pythonPath} -c '${pythonScript}'`)
          console.log(`Converted using Python pillow-heif (${pythonPath})`)
          converted = true
        } catch (e) {
          errors.push(`${pythonPath} pillow-heif: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }

    if (!converted) {
      console.error('All conversion methods failed:', errors)
      return NextResponse.json(
        {
          error: 'HEIC conversion not available',
          details: 'HEIC-Format wird auf diesem Server nicht unterstützt. Bitte konvertieren Sie das Bild zu JPEG vor dem Hochladen.',
          technicalDetails: errors.join('; ')
        },
        { status: 500 }
      )
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
