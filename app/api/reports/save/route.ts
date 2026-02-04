import { NextResponse } from 'next/server';
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from '@/lib/s3';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { appointmentId, report } = await request.json();

    // Process photos: move temp files to permanent storage
    const processedPhotos = await Promise.all(report.photos.map(async (photo: any) => {
      // Check if URL indicates a temporary file
      // URL format: /api/files/buckets/temp/{firmaID}/{appointmentId}/{reportId}/{photoId}.{ext}
      if (photo.url && photo.url.includes('/buckets/temp/')) {
        // Extract the key (path after bucket name)
        // e.g., "firmaID/appointmentId/reportId/photoId.jpeg"
        const key = photo.url.split('/buckets/temp/')[1];

        if (!key) {
          console.error('Could not extract key from URL:', photo.url);
          return photo;
        }

        console.log(`Moving file ${key} from temp to images...`);

        try {
          // 1. Copy to permanent bucket (preserving the full path structure)
          await s3Client.send(new CopyObjectCommand({
            Bucket: "images",
            Key: key,
            CopySource: `/temp/${key}`,
          }));

          // 2. Delete from temp bucket
          await s3Client.send(new DeleteObjectCommand({
            Bucket: "temp",
            Key: key,
          }));

          // 3. Update URL (replace temp with images in the path)
          return {
            ...photo,
            url: photo.url.replace('/buckets/temp/', '/buckets/images/')
          };
        } catch (err) {
          console.error(`Failed to move file ${key}:`, err);
          // If move fails, keep original URL (better than losing data, though it will be deleted by cleaner later)
          return photo;
        }
      }
      return photo;
    }));

    const updatedReport = {
      ...report,
      photos: processedPhotos
    };

    return NextResponse.json({ success: true, report: updatedReport });

  } catch (error) {
    console.error("Error saving report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
