import express from "express"
import crypto from "crypto"
import Database from "better-sqlite3"
import { WebSocketServer } from "ws"
import { Client, GatewayIntentBits } from "discord.js"

const app = express()
const db = new Database("views.db")
const sockets = new Set()

const presenceEnv = {
  token: process.env.DISCORD_BOT_TOKEN || "MTQ3NTUyNDU4NzU5MTcwMDQ4MA.Gj7uZJ.AlejLhUtAdXuY5l86_16L_BfUWp248VAnlid1w",
  guildId: process.env.DISCORD_GUILD_ID || "1475614790130073833",
  userId: process.env.DISCORD_USER_ID || "1042651808557977600",
}

const activityLabels = {
  0: "Playing",
  1: "Streaming",
  2: "Listening to",
  3: "Watching",
  5: "Competing in",
}

let latestPresence = null
let trackedMember = null
let discordClient = null

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

function makeOfflinePresence() {
  if (!trackedMember) {
    return {
      _id: presenceEnv.userId,
      tag: "Unknown User",
      pfp: "",
      platform: {},
      status: "offline",
      activities: [],
      badges: [],
      customStatus: null,
    }
  }

  const user = trackedMember.user
  return {
    _id: user.id,
    tag: user.discriminator === "0" ? user.username : user.tag,
    pfp: user.displayAvatarURL({ extension: "png", size: 256 }),
    platform: {},
    status: "offline",
    activities: [],
    badges: [],
    customStatus: null,
  }
}

function formatActivityTitle(activity) {
  const prefix = activityLabels[activity.type]
  if (!prefix) return activity.name || "Activity"
  return `${prefix} ${activity.name}`
}

function normalizeActivityImage(raw, applicationId) {
  if (!raw) return null
  if (raw.startsWith("spotify:")) {
    return `https://i.scdn.co/image/${raw.replace("spotify:", "")}`
  }
  if (raw.startsWith("youtube:")) {
    return `https://i.ytimg.com/vi/${raw.replace("youtube:", "")}/hqdefault_live.jpg`
  }
  if (raw.startsWith("mp:external/https/")) {
    return `https://${raw.split("mp:external/https/")[1]}`
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw
  }
  if (applicationId) {
    return `https://cdn.discordapp.com/app-assets/${applicationId}/${raw}.png?size=512`
  }
  return null
}

function formatActivityAssets(activity) {
  const appId = activity.applicationId || null
  return {
    largeImage: normalizeActivityImage(activity.assets?.largeImage || null, appId),
    largeText: activity.assets?.largeText || null,
    smallImage: normalizeActivityImage(activity.assets?.smallImage || null, appId),
    smallText: activity.assets?.smallText || null,
  }
}

function buildPresenceObject(member, presence) {
  const user = member.user
  const custom = presence?.activities?.find((a) => a.type === 4)
  const activities = (presence?.activities || [])
    .filter((a) => a.name !== "Custom Status")
    .map((a) => ({
      applicationId: a.applicationId || null,
      assets: formatActivityAssets(a),
      details: a.details || null,
      emoji: a.emoji?.id ? `https://cdn.discordapp.com/emojis/${a.emoji.id}.${a.emoji.animated ? "gif" : "png"}?size=128` : null,
      name: a.name || null,
      state: a.state || null,
      title: formatActivityTitle(a),
      timestamps: a.timestamps?.startTimestamp || a.timestamps?.endTimestamp
        ? {
            start: a.timestamps?.startTimestamp || null,
            end: a.timestamps?.endTimestamp || null,
          }
        : null,
      type: String(a.type),
    }))

  return {
    _id: user.id,
    tag: user.discriminator === "0" ? user.username : user.tag,
    pfp: user.displayAvatarURL({ extension: "png", size: 256 }),
    platform: presence?.clientStatus || {},
    status: presence?.status || "offline",
    activities,
    badges: [],
    customStatus: custom
      ? {
          name: custom.state || "",
          createdTimestamp: custom.createdTimestamp || Date.now(),
          emoji: custom.emoji?.id
            ? `https://cdn.discordapp.com/emojis/${custom.emoji.id}.${custom.emoji.animated ? "gif" : "png"}?size=128`
            : custom.emoji?.name || null,
        }
      : null,
  }
}

function publishPresence(payload) {
  latestPresence = payload
  const data = JSON.stringify(payload)
  sockets.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(data)
    }
  })
}

async function updateTrackedPresence() {
  if (!discordClient) return
  const guild = await discordClient.guilds.fetch(presenceEnv.guildId).catch(() => null)
  if (!guild) {
    console.warn("Discord presence: could not fetch guild", presenceEnv.guildId)
    return
  }
  trackedMember = await guild.members.fetch(presenceEnv.userId).catch(() => null)
  if (!trackedMember) {
    console.warn("Discord presence: could not fetch member", presenceEnv.userId)
    return
  }
  const payload = trackedMember.presence
    ? buildPresenceObject(trackedMember, trackedMember.presence)
    : makeOfflinePresence()
  publishPresence(payload)
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

app.get("/api/presence", (_req, res) => {
  res.json(latestPresence || makeOfflinePresence())
})

const port = Number(process.env.PORT || 3000)
const server = app.listen(port, () => {
  console.log("Analytics server on http://localhost:" + port)
})

const wss = new WebSocketServer({ server, path: "/presence" })

wss.on("connection", (ws) => {
  sockets.add(ws)
  ws.send(JSON.stringify(latestPresence || makeOfflinePresence()))
  ws.on("close", () => {
    sockets.delete(ws)
  })
})

if (presenceEnv.token && presenceEnv.guildId && presenceEnv.userId) {
  discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
  })

  discordClient.on("clientReady", async () => {
    console.log("Discord presence bot connected")
    await updateTrackedPresence()
  })

  discordClient.on("presenceUpdate", async (_, newPresence) => {
    if (!newPresence || newPresence.userId !== presenceEnv.userId) return
    await updateTrackedPresence()
  })

  discordClient.login(presenceEnv.token).catch((err) => {
    console.error("Discord bot login failed:", err.message)
  })
} else {
  console.warn("Discord presence disabled. Set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, and DISCORD_USER_ID.")
}
