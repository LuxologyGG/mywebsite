import express from "express"
import crypto from "crypto"
import Database from "better-sqlite3"

const app = express()
const db = new Database("views.db")

app.set("trust proxy", true)

// CORS for local testing with Live Server on a different port
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})

db.exec(`
  CREATE TABLE IF NOT EXISTS uniques (
    page TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    day TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (page, ip_hash, day)
  )
`)

function isBot(ua = "") {
  const s = ua.toLowerCase()
  const tokens = ["bot", "spider", "crawl", "slurp", "bingpreview", "headless", "lighthouse"]
  return tokens.some(t => s.includes(t))
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex")
}

function getDayUTC(ms) {
  return new Date(ms).toISOString().slice(0, 10)
}

function cleanPage(raw) {
  const page = (raw || "/").trim()
  if (!page.startsWith("/")) return "/"
  if (page.length > 200) return "/"
  return page
}

function getSalt() {
  const salt = process.env.IP_SALT
  if (!salt) throw new Error("Missing IP_SALT env var")
  return salt
}

function counts(page, day) {
  const uniqueToday = db.prepare(
    "SELECT COUNT(*) AS n FROM uniques WHERE page = ? AND day = ?"
  ).get(page, day).n

  const uniqueAllTime = db.prepare(
    "SELECT COUNT(*) AS n FROM uniques WHERE page = ?"
  ).get(page).n

  return { uniqueToday, uniqueAllTime }
}

app.post("/api/unique", (req, res) => {
  const page = cleanPage(req.query.page)
  const now = Date.now()
  const day = getDayUTC(now)

  const ua = req.get("user-agent") || ""
  if (isBot(ua)) {
    const { uniqueToday, uniqueAllTime } = counts(page, day)
    return res.json({ page, uniqueToday, uniqueAllTime })
  }

  let salt = ""
  try {
    salt = getSalt()
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const ip = req.ip || ""
  const ipHash = sha256(ip + salt)

  try {
    db.prepare(
      "INSERT INTO uniques (page, ip_hash, day, created_at) VALUES (?, ?, ?, ?)"
    ).run(page, ipHash, day, now)
  } catch (e) {
    // duplicate, ignore
  }

  const { uniqueToday, uniqueAllTime } = counts(page, day)
  res.json({ page, uniqueToday, uniqueAllTime })
})

app.get("/api/unique", (req, res) => {
  const page = cleanPage(req.query.page)
  const now = Date.now()
  const day = getDayUTC(now)

  const { uniqueToday, uniqueAllTime } = counts(page, day)
  res.json({ page, uniqueToday, uniqueAllTime })
})

const port = Number(process.env.PORT || 3000)
app.listen(port, () => {
  console.log("Analytics server on http://localhost:" + port)
})