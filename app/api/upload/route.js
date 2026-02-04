// app/api/upload/route.js
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";
import { NextResponse } from "next/server";
import { generateId } from "@/lib/generate-id";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const firmaID = formData.get("firmaID");
    const appointmentId = formData.get("appointmentId");
    const reportId = formData.get("reportId");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!firmaID || !appointmentId || !reportId) {
      return NextResponse.json({
        error: "Missing required parameters: firmaID, appointmentId, reportId"
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucketName = "temp";

    // Генерируем уникальный ID для фото
    const photoId = generateId();

    // Извлекаем расширение из оригинального файла
    const originalName = file.name;
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpeg';

    // Формируем путь: firmaID/appointmentId/reportId/photoId.ext
    const key = `${firmaID}/${appointmentId}/${reportId}/${photoId}.${ext}`;

    // Загрузка в SeaweedFS
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));

    return NextResponse.json({
      success: true,
      photoId: photoId,
      url: `/api/files/buckets/${bucketName}/${key}`
    });

  } catch (error) {
    console.error("Upload error:", error);
    // AWS SDK errors have specific properties
    if (error.name) console.error("Error name:", error.name);
    if (error.message) console.error("Error message:", error.message);
    if (error.$metadata) console.error("Error metadata:", error.$metadata);
    if (error.Code) console.error("S3 Error Code:", error.Code);

    return NextResponse.json({
      error: "Upload failed",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
