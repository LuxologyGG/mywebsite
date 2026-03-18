const fs = require("fs");
const path = require("path");
const config = require("../config");

const metaPath = path.join(config.uploadsDir, ".meta.json");

function ensureDir() {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

function loadMeta() {
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {
    return {};
  }
}

function saveMeta(meta) {
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

const local = {
  async save(filename, buffer) {
    ensureDir();
    const filePath = path.join(config.uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    const meta = loadMeta();
    meta[filename] = { uploadedAt: Date.now() };
    saveMeta(meta);
  },

  async get(filename) {
    const safeName = path.basename(filename);
    const filePath = path.join(config.uploadsDir, safeName);
    if (!fs.existsSync(filePath)) return null;
    return {
      buffer: fs.readFileSync(filePath),
      path: filePath,
    };
  },

  async stream(filename) {
    const safeName = path.basename(filename);
    const filePath = path.join(config.uploadsDir, safeName);
    if (!fs.existsSync(filePath)) return null;
    return filePath;
  },

  async remove(filename) {
    const safeName = path.basename(filename);
    const filePath = path.join(config.uploadsDir, safeName);
    try {
      fs.unlinkSync(filePath);
    } catch {}

    const meta = loadMeta();
    delete meta[safeName];
    saveMeta(meta);
  },

  async listExpired(ttlMs) {
    const meta = loadMeta();
    const now = Date.now();
    const expired = [];

    for (const [filename, info] of Object.entries(meta)) {
      if (now - info.uploadedAt > ttlMs) {
        expired.push(filename);
      }
    }
    return expired;
  },
};

module.exports = local;
