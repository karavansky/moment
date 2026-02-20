import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { removePhotoFromReport } from '@/lib/reports'

type Params = { params: Promise<{ photoId: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const { photoId } = await params
    await removePhotoFromReport(photoId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/reports/photos/[photoId]] Error:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
