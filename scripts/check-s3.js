const { S3Client, ListBucketsCommand, ListObjectsCommand } = require("@aws-sdk/client-s3");

const endpoint = process.env.S3_ENDPOINT || "http://localhost:8333";
const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: endpoint,
  credentials: { accessKeyId: "any", secretAccessKey: "any" },
  forcePathStyle: true,
});

async function checkSeaweed() {
  console.log(`Checking SeaweedFS at ${endpoint}...`);

  try {
    // List Buckets
    const buckets = await s3Client.send(new ListBucketsCommand({}));
    // Note: SeaweedFS S3 API might return null for Buckets if empty, or array
    console.log("Buckets found:", buckets.Buckets?.map(b => b.Name));

    // Check 'images' bucket explicitly even if ListBuckets is empty (sometimes S3 API behaves differently than Filer)
    const bucketName = "images";
    console.log(`\nChecking bucket '${bucketName}' content...`);
    
    try {
        const files = await s3Client.send(new ListObjectsCommand({ Bucket: bucketName }));
        
        if (files.Contents) {
            console.log(`Files in '${bucketName}':`);
            files.Contents.forEach(f => {
                console.log(` - ${f.Key} (Size: ${f.Size})`);
                console.log(`   Expected URL path: /api/files/buckets/${bucketName}/${f.Key}`);
            });
        } else {
            console.log(`Bucket '${bucketName}' is empty (via S3 API).`);
        }
    } catch (e) {
        if (e.name === 'NoSuchBucket') {
             console.log(`Bucket '${bucketName}' does not exist (via S3 API).`);
        } else {
             console.error(`Error listing '${bucketName}':`, e.message);
        }
    }

  } catch (err) {
    console.error("Error connecting to SeaweedFS:", err.message);
  }
}

checkSeaweed();