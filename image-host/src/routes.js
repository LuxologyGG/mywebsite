const crypto = require("crypto");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const config = require("./config");
const storage = require("./storage");
const logger = require("./logger");
const { upload } = require("./middleware");

const router = express.Router();

function isCrawler(ua = "") {
  const s = ua.toLowerCase();
  return ["bot", "spider", "crawl", "slurp", "bingpreview", "headless",
    "discordbot", "telegrambot", "twitterbot", "facebookexternalhit",
    "whatsapp", "linkedinbot", "imessagebot"].some(k => s.includes(k));
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Generate a deletion token for a file
const SECRET = config.deleteSecret || config.apiKey || crypto.randomBytes(32).toString("hex");

function deletionToken(filename) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(filename)
    .digest("hex")
    .slice(0, 32);
}

// --- POST /files ---
router.post("/files", upload.single("file"), (req, res) => {
  (async () => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;

    await storage.save(filename, req.file.buffer);

    const imageUrl = `${config.baseUrl}/i/${filename}`;
    const token = deletionToken(filename);
    const deletionUrl = `${config.baseUrl}/delete/${filename}?token=${token}`;

    logger.info(`upload: ${filename} (${(req.file.size / 1024).toFixed(1)}KB) from ${req.ip}`);

    res.json({ imageUrl, deletionUrl });
  })().catch((err) => {
    logger.error(`upload error: ${err.message}`);
    res.status(500).json({ error: "Upload failed" });
  });
});

// Handle multer errors (file too large, invalid type)
router.use((err, _req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: `File too large. Max ${config.maxFileSize / 1024 / 1024}MB` });
  }
  if (err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// --- GET /i/:filename ---
router.get("/i/:filename", (req, res) => {
  (async () => {
    const filename = path.basename(req.params.filename);

    // Validate extension
    const ext = path.extname(filename).toLowerCase();
    if (!config.allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    // Serve OG embed page for bot crawlers (unless ?raw=1)
    const ua = req.headers["user-agent"] || "";
    if (isCrawler(ua) && !req.query.raw) {
      const meta = await storage.getMeta(filename);
      const imageUrl = `${config.baseUrl}/i/${filename}?raw=1`;

      let desc = "Image hosted on camr.one";
      if (meta && meta.uploadedAt) {
        const created = new Intl.DateTimeFormat("en-US", {
          month: "short", day: "numeric", year: "numeric",
        }).format(new Date(meta.uploadedAt));
        const expiresAt = meta.uploadedAt + config.fileTtlMinutes * 60000;
        const diff = expiresAt - Date.now();
        let expiry;
        if (diff <= 0) expiry = "Expired";
        else if (diff > 86400000) expiry = `Expires in ${Math.floor(diff / 86400000)}d`;
        else if (diff > 3600000) expiry = `Expires in ${Math.floor(diff / 3600000)}h`;
        else expiry = `Expires in ${Math.floor(diff / 60000)}m`;
        desc = `Uploaded ${created} · ${expiry}`;
      }

      const html = `<!doctype html>
<html><head>
  <meta charset="UTF-8">
  <meta name="theme-color" content="#ffffff">
  <meta property="og:title" content="camr.one image">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
</head><body></body></html>`;
      return res.set("Content-Type", "text/html").send(html);
    }

    // Try streaming (local storage)
    const filePath = await storage.stream(filename);
    if (filePath) {
      return res.sendFile(filePath);
    }

    // Fall back to buffer (S3)
    const file = await storage.get(filename);
    if (!file) {
      return res.status(404).json({ error: "Image not found" });
    }

    if (file.contentType) {
      res.set("Content-Type", file.contentType);
    }
    res.send(file.buffer);
  })().catch((err) => {
    logger.error(`serve error: ${err.message}`);
    res.status(500).json({ error: "Failed to serve image" });
  });
});

// --- DELETE /delete/:filename  &  GET /delete/:filename (ShareX compat) ---
async function handleDelete(req, res) {
  const filename = path.basename(req.params.filename);
  const key = req.headers["key"] || req.headers["authorization"];
  const token = req.query.token;

  // Auth: require either API key or valid deletion token
  const validKey = key === config.apiKey;
  const validToken = token === deletionToken(filename);

  if (!validKey && !validToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const file = await storage.get(filename);
  if (!file) {
    return res.status(404).json({ error: "Image not found" });
  }

  await storage.remove(filename);
  logger.info(`deleted: ${filename} by ${req.ip}`);

  res.json({ message: "Deleted" });
}

router.delete("/delete/:filename", (req, res) => {
  handleDelete(req, res).catch((err) => {
    logger.error(`delete error: ${err.message}`);
    res.status(500).json({ error: "Delete failed" });
  });
});

router.get("/delete/:filename", (req, res) => {
  handleDelete(req, res).catch((err) => {
    logger.error(`delete error: ${err.message}`);
    res.status(500).json({ error: "Delete failed" });
  });
});

module.exports = router;
