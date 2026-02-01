const { S3Client, CreateBucketCommand, ListBucketsCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:8333",
  credentials: { accessKeyId: "any", secretAccessKey: "any" },
  forcePathStyle: true,
});

async function initS3() {
  const bucketName = "images";
  console.log(`Checking S3 at ${process.env.S3_ENDPOINT || "http://localhost:8333"}...`);

  try {
    const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
    const exists = Buckets && Buckets.some(b => b.Name === bucketName);

    if (exists) {
      console.log(`✅ Bucket '${bucketName}' already exists.`);
    } else {
      console.log(`⚠️ Bucket '${bucketName}' not found. Creating...`);
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log(`✅ Bucket '${bucketName}' created successfully!`);
    }
  } catch (err) {
    console.error("❌ Error initializing S3:", err);
  }
}

initS3();
