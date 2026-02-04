// app/api/upload/route.js
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;
    const bucketName = "temp"; // Загружаем во временный бакет

    // Загрузка в SeaweedFS
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    }));

    return NextResponse.json({ 
      success: true, 
      url: `/api/files/buckets/${bucketName}/${filename}` 
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
