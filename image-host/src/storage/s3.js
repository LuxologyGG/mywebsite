const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const config = require("../config");

let client = null;

function getClient() {
  if (!client) {
    client = new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
      forcePathStyle: true,
    });
  }
  return client;
}

const s3 = {
  async save(filename, buffer) {
    const ext = filename.split(".").pop().toLowerCase();
    const mimeMap = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
    };

    await getClient().send(
      new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: `uploads/${filename}`,
        Body: buffer,
        ContentType: mimeMap[ext] || "application/octet-stream",
        Metadata: { uploadedat: String(Date.now()) },
      })
    );
  },

  async get(filename) {
    try {
      const resp = await getClient().send(
        new GetObjectCommand({
          Bucket: config.s3.bucket,
          Key: `uploads/${filename}`,
        })
      );
      const chunks = [];
      for await (const chunk of resp.Body) {
        chunks.push(chunk);
      }
      return {
        buffer: Buffer.concat(chunks),
        contentType: resp.ContentType,
      };
    } catch (err) {
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  },

  // S3 doesn't support streaming to a file path, return null to force buffer mode
  async stream() {
    return null;
  },

  async remove(filename) {
    try {
      await getClient().send(
        new DeleteObjectCommand({
          Bucket: config.s3.bucket,
          Key: `uploads/${filename}`,
        })
      );
    } catch {}
  },

  async listExpired(ttlMs) {
    const now = Date.now();
    const expired = [];

    let continuationToken;
    do {
      const resp = await getClient().send(
        new ListObjectsV2Command({
          Bucket: config.s3.bucket,
          Prefix: "uploads/",
          ContinuationToken: continuationToken,
        })
      );

      for (const obj of resp.Contents || []) {
        // Check object metadata for upload time
        try {
          const head = await getClient().send(
            new HeadObjectCommand({
              Bucket: config.s3.bucket,
              Key: obj.Key,
            })
          );
          const uploadedAt = parseInt(head.Metadata?.uploadedat, 10);
          if (uploadedAt && now - uploadedAt > ttlMs) {
            const filename = obj.Key.replace("uploads/", "");
            expired.push(filename);
          }
        } catch {}
      }

      continuationToken = resp.IsTruncated ? resp.NextContinuationToken : null;
    } while (continuationToken);

    return expired;
  },
};

module.exports = s3;
