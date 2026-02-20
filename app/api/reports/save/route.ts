import { NextResponse } from 'next/server'
import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/lib/s3'
import { auth } from '@/lib/auth'
import { addPhotoToReport } from '@/lib/reports'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { reportId, photo } = await request.json()
    // photo: { id: string, url: string, note: string }

    let finalUrl = photo.url

    if (photo.url?.includes('/buckets/temp/')) {
      const key = photo.url.split('/buckets/temp/')[1]

      if (!key) {
        console.error('[reports/save] Could not extract key from URL:', photo.url)
      } else {
        console.log(`[reports/save] Moving file ${key} from temp to images...`)
        try {
          await s3Client.send(new CopyObjectCommand({
            Bucket: 'images',
            Key: key,
            CopySource: `/temp/${key}`,
          }))
          await s3Client.send(new DeleteObjectCommand({
            Bucket: 'temp',
            Key: key,
          }))
          finalUrl = photo.url.replace('/buckets/temp/', '/buckets/images/')
        } catch (err) {
          console.error(`[reports/save] Failed to move file ${key}:`, err)
          // Keep temp URL if move fails — temp cleaner will remove it later
        }
      }
    }

    await addPhotoToReport(reportId, photo.id, { url: finalUrl, note: photo.note || '' })

    return NextResponse.json({ photo: { ...photo, url: finalUrl } })
  } catch (error) {
    console.error('[reports/save] Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
