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
    console.log("Buckets found:", buckets.Buckets?.map(b => b.Name));

    if (!buckets.Buckets || buckets.Buckets.length === 0) {
      console.log("No buckets found.");
      return;
    }

    // Check 'images' bucket
    const bucketName = "images";
    if (buckets.Buckets.some(b => b.Name === bucketName)) {
      console.log(`\nListing files in '${bucketName}':`);
      const files = await s3Client.send(new ListObjectsCommand({ Bucket: bucketName }));
      
      if (files.Contents) {
        files.Contents.forEach(f => {
            console.log(` - ${f.Key} (Size: ${f.Size})`);
            console.log(`   Expected URL path: /api/files/buckets/${bucketName}/${f.Key}`);
            console.log(`   SeaweedFS Filer path: /buckets/${bucketName}/${f.Key}`);
        });
      } else {
        console.log("Bucket is empty.");
      }
    } else {
      console.log(`Bucket '${bucketName}' does not exist.`);
    }

  } catch (err) {
    console.error("Error connecting to SeaweedFS:", err.message);
  }
}

checkSeaweed();