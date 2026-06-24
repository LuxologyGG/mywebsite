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

// Friendly word-slugs for paste URLs (e.g. awesome-boss-cost-lost) instead of
// opaque hex IDs. Kept short, lowercase, and unambiguous.
const SLUG_WORDS = [
  "amber","apple","arc","arrow","ash","aspen","atlas","aurora","autumn","azure",
  "bagel","balsa","bamboo","basil","beacon","berry","birch","bishop","bloom","blue",
  "boss","bramble","brave","breeze","bright","brisk","bronze","brook","cabin","cactus",
  "calm","candle","canyon","cedar","chai","cherry","chill","cider","clay","clever",
  "cloud","clover","cobalt","comet","coral","cosmic","cost","cove","crane","crisp",
  "crystal","dawn","daisy","delta","denim","dewy","diamond","dingo","dove","dune",
  "eager","early","ember","emerald","epic","fable","falcon","fern","flint","forest",
  "fox","frost","garnet","ginger","glade","glow","grove","hale","harbor","haven",
  "hazel","heron","honey","ivory","jade","jasper","jetty","jolly","juniper","keen",
  "kelp","kite","koi","lagoon","lake","lark","lemon","lily","linen","lost",
  "lotus","lucky","lumen","lunar","lush","mango","maple","marble","meadow","mellow",
  "merry","mesa","mint","misty","moss","nimbus","noble","nova","oak","ocean",
  "olive","onyx","opal","orbit","otter","parsley","peach","pearl","pebble","pine",
  "plum","pond","prairie","quartz","quill","quiet","rapid","raven","reed","ridge",
  "river","robin","rose","ruby","rustic","sage","sandy","sea","sienna","silver",
  "sky","slate","snowy","solar","sorrel","spark","spring","spruce","stone","storm",
  "summit","sunny","swift","teal","thistle","tide","timber","topaz","trail","tulip",
  "umber","valley","velvet","verde","vivid","wave","willow","windy","winter","wren",
];

function randomSlug() {
  const pick = () => SLUG_WORDS[Math.floor(Math.random() * SLUG_WORDS.length)];
  return `${pick()}-${pick()}-${pick()}-${pick()}`;
}

async function uniqueSlug() {
  for (let i = 0; i < 8; i++) {
    const slug = randomSlug();
    const existing = await collection.findOne({ slug }, { projection: { _id: 1 } });
    if (!existing) return slug;
  }
  // Extremely unlikely fallback: append a short random suffix
  return `${randomSlug()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function start() {
  await client.connect();
  const db = client.db("pastes");
  collection = db.collection("entries");

  // TTL index — MongoDB auto-deletes docs when expiresAt passes
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
  // Unique index on the human-friendly slug
  await collection.createIndex({ slug: 1 }, { unique: true, sparse: true }).catch(() => {});

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

    const slug = await uniqueSlug();

    const doc = {
      content,
      slug,
      createdAt: new Date(),
    };

    // Set expiration (default 1 day)
    const seconds = EXPIRY_MAP[expiresIn] || EXPIRY_MAP["1d"];
    if (expiresIn !== "never") {
      doc.expiresAt = new Date(Date.now() + seconds * 1000);
    }

    await collection.insertOne(doc);

    res.json({
      id: slug,
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
    const id = req.params.id;

    // Look up by friendly slug first; fall back to legacy ObjectId links.
    let paste = await collection.findOne({ slug: id });
    if (!paste && /^[A-Fa-f0-9]{24}$/.test(id)) {
      paste = await collection.findOne({ _id: new ObjectId(id) });
    }

    if (!paste) {
      return res.status(404).json({ error: "Paste not found" });
    }

    // Check if expired (belt-and-suspenders, TTL index handles cleanup)
    if (paste.expiresAt && new Date(paste.expiresAt) < new Date()) {
      return res.status(404).json({ error: "Paste has expired" });
    }

    res.json({
      id: paste.slug || paste._id.toString(),
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
