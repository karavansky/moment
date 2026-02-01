const { S3Client, ListObjectsCommand, DeleteObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

// Конфигурация
const TEMP_BUCKET = "temp"; // Или папка в бакете, например "images" с префиксом "temp/"
const MAX_AGE_HOURS = 24;
const ENDPOINT = process.env.S3_ENDPOINT || "http://127.0.0.1:8333";

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: ENDPOINT,
  credentials: { accessKeyId: "any", secretAccessKey: "any" },
  forcePathStyle: true,
});

async function cleanup() {
  console.log(`[${new Date().toISOString()}] Starting cleanup for bucket '${TEMP_BUCKET}'...`);

  try {
    // 1. Получаем список файлов
    const listCommand = new ListObjectsCommand({ Bucket: TEMP_BUCKET });
    const data = await s3Client.send(listCommand);

    if (!data.Contents || data.Contents.length === 0) {
      console.log("Bucket is empty. Nothing to clean.");
      return;
    }

    const now = new Date();
    let deletedCount = 0;

    for (const file of data.Contents) {
      // LastModified возвращается S3
      const fileDate = file.LastModified;
      const ageInHours = (now - fileDate) / (1000 * 60 * 60);

      if (ageInHours > MAX_AGE_HOURS) {
        console.log(`Deleting old file: ${file.Key} (Age: ${ageInHours.toFixed(1)}h)`);
        
        await s3Client.send(new DeleteObjectCommand({
            Bucket: TEMP_BUCKET,
            Key: file.Key
        }));
        deletedCount++;
      }
    }

    console.log(`Cleanup finished. Deleted ${deletedCount} files.`);

  } catch (error) {
    if (error.name === 'NoSuchBucket') {
        console.log(`Bucket '${TEMP_BUCKET}' does not exist. Skipping.`);
    } else {
        console.error("Cleanup failed:", error);
    }
  }
}

cleanup();
