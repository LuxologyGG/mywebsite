const path = require("path");

const config = {
  apiKey: process.env.API_KEY,
  port: parseInt(process.env.PORT, 10) || 3001,
  baseUrl: (process.env.BASE_URL || "http://localhost:3001").replace(/\/$/, ""),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
  fileTtlMinutes: parseInt(process.env.FILE_TTL_MINUTES, 10) || 60,

  // Storage
  storage: process.env.STORAGE || "local",
  uploadsDir: path.join(__dirname, "..", "uploads"),

  // S3 / R2
  s3: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
  },

  // Allowed image types
  allowedMimeTypes: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ],
  allowedExtensions: [".png", ".jpg", ".jpeg", ".webp", ".gif"],
};

module.exports = config;
