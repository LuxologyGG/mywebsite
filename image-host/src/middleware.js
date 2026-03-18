const multer = require("multer");
const path = require("path");
const rateLimit = require("express-rate-limit");
const config = require("./config");

// --- Auth ---
function auth(req, res, next) {
  const key = req.headers["key"] || req.headers["authorization"];
  if (!config.apiKey) {
    return res.status(500).json({ error: "Server API key not configured" });
  }
  if (key !== config.apiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// --- File upload (multer) ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      config.allowedMimeTypes.includes(file.mimetype) &&
      config.allowedExtensions.includes(ext)
    ) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type. Allowed: png, jpg, jpeg, webp, gif"));
  },
});

// --- Rate limiter ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
  validate: { trustProxy: false },
});

module.exports = { auth, upload, limiter };
