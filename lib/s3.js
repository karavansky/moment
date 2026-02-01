import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: "us-east-1", // Стандарт для SeaweedFS
  endpoint: process.env.S3_ENDPOINT || (process.env.NODE_ENV === 'production' ? "http://seaweedfs:8333" : "http://127.0.0.1:8333"),
  credentials: {
    accessKeyId: "any",     // По умолчанию SeaweedFS принимает любые ключи
    secretAccessKey: "any"  // (если не настроен security.toml)
  },
  forcePathStyle: true, // ВАЖНО: SeaweedFS требует path-style (http://host/bucket/key)
});

// Функция для получения публичной ссылки
export function getPublicUrl(bucket, key) {
  // S3 бакеты в SeaweedFS по умолчанию отображаются в Filer в папке /buckets/
  return `https://storage.moment-lbs.app/buckets/${bucket}/${key}`;
}
