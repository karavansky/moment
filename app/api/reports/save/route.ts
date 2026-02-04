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
      // Assuming temp URLs look like: .../buckets/temp/filename.jpg
      if (photo.url && photo.url.includes('/buckets/temp/')) {
        const urlParts = photo.url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        console.log(`Moving file ${fileName} from temp to images...`);

        try {
          // 1. Copy to permanent bucket
          await s3Client.send(new CopyObjectCommand({
            Bucket: "images",
            Key: fileName,
            CopySource: `/temp/${fileName}`, // Source format: /bucket/key
          }));

          // 2. Delete from temp bucket
          await s3Client.send(new DeleteObjectCommand({
            Bucket: "temp",
            Key: fileName,
          }));

          // 3. Update URL
          return {
            ...photo,
            url: photo.url.replace('/buckets/temp/', '/buckets/images/')
          };
        } catch (err) {
          console.error(`Failed to move file ${fileName}:`, err);
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
