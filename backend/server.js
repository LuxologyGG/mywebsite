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

async function start() {
  await client.connect();
  const db = client.db("pastes");
  collection = db.collection("entries");
  console.log("Connected to MongoDB");

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/paste", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const result = await collection.insertOne({
      content,
      createdAt: new Date(),
    });

    res.json({ id: result.insertedId });
  } catch (err) {
    console.error("POST /paste error:", err);
    res.status(500).json({ error: "Could not save paste" });
  }
});

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

    res.json(paste);
  } catch (err) {
    console.error("GET /paste/:id error:", err);
    res.status(500).json({ error: "Could not load paste" });
  }
});

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
