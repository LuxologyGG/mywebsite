const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = [
  "https://camr.one",
  "https://www.camr.one",
  "http://localhost:8787",
  "http://localhost:3000",
  "http://127.0.0.1:8787",
];

// trust proxy (important for Cloudflare + Render)
app.set("trust proxy", true);

app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI env var is required");
  process.exit(1);
}

const client = new MongoClient(uri);
let collection;

const EXPIRY_MAP = {
  "1h": 3600,
  "1d": 86400,
  "7d": 604800,
  "30d": 2592000,
};

async function start() {
  await client.connect();
  const db = client.db("pastes");
  collection = db.collection("entries");

  // TTL index — MongoDB auto-deletes docs when expiresAt passes
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});

  console.log("Connected to MongoDB");

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// CREATE paste
app.post("/paste", async (req, res) => {
  try {
    const { content, expiresIn } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const doc = {
      content,
      createdAt: new Date(),
    };

    // Set expiration (default 1 day)
    const seconds = EXPIRY_MAP[expiresIn] || EXPIRY_MAP["1d"];
    if (expiresIn !== "never") {
      doc.expiresAt = new Date(Date.now() + seconds * 1000);
    }

    const result = await collection.insertOne(doc);

    res.json({
      id: result.insertedId.toString(),
      expiresAt: doc.expiresAt || null,
    });

  } catch (err) {
    console.error("POST /paste error:", err);
    res.status(500).json({ error: "Could not save paste" });
  }
});

// GET paste
app.get("/paste/:id", async (req, res) => {
  try {
    let oid;

    try {
      oid = new ObjectId(req.params.id);
    } catch {
      return res.status(400).json({ error: "Invalid paste ID" });
    }

    const paste = await collection.findOne({ _id: oid });

    if (!paste) {
      return res.status(404).json({ error: "Paste not found" });
    }

    // Check if expired (belt-and-suspenders, TTL index handles cleanup)
    if (paste.expiresAt && new Date(paste.expiresAt) < new Date()) {
      return res.status(404).json({ error: "Paste has expired" });
    }

    res.json({
      id: paste._id.toString(),
      content: paste.content,
      createdAt: paste.createdAt,
      expiresAt: paste.expiresAt || null,
    });

  } catch (err) {
    console.error("GET /paste/:id error:", err);
    res.status(500).json({ error: "Could not load paste" });
  }
});

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
