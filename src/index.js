async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function isBot(ua = "") {
  const s = ua.toLowerCase();
  return ["bot", "spider", "crawl", "slurp", "bingpreview", "headless", "lighthouse"].some(k => s.includes(k));
}

function isoDay() {
  return new Date().toISOString().slice(0, 10);
}

function cleanPage(value) {
  if (!value) return "/";
  let p = String(value);
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 200) p = p.slice(0, 200);
  return p;
}

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin || "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

function parseCookies(cookieHeader = "") {
  const out = {};
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function randomToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

function makePasteId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

function parsePasteId(pathname) {
  const match = /^\/api\/pastes\/([A-Za-z0-9_-]+)$/.exec(pathname || "");
  return match ? match[1] : null;
}

function clampText(value, max = 20000) {
  return String(value || "").slice(0, max);
}

function normalizeTitle(value) {
  const title = String(value || "").trim().slice(0, 120);
  return title || "Untitled paste";
}

function parseExpiry(value) {
  const map = {
    "1h": 60 * 60,
    "1d": 60 * 60 * 24,
    "1w": 60 * 60 * 24 * 7,
    "1m": 60 * 60 * 24 * 30,
    "never": 0,
  };
  return map[value] ?? map["1w"];
}

function ownerCookie(token) {
  return `paste_owner=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; HttpOnly`;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function readOwnedPastes(env, ownerHash) {
  if (!ownerHash) return [];
  const raw = await env.UNIQUE_KV.get(`paste-owner:${ownerHash}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeOwnedPastes(env, ownerHash, items) {
  if (!ownerHash) return;
  await env.UNIQUE_KV.put(`paste-owner:${ownerHash}`, JSON.stringify(items.slice(0, 30)));
}

function mergeOwnedPaste(items, paste) {
  const next = Array.isArray(items) ? items.filter((item) => item.id !== paste.id) : [];
  next.unshift({
    id: paste.id,
    title: paste.title,
    updatedAt: paste.updatedAt,
    expiresAt: paste.expiresAt || null,
  });
  return next;
}

function publicPasteShape(record) {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    expiresAt: record.expiresAt || null,
    expiryOption: record.expiryOption || "1w",
  };
}

function offlinePresence(userId = "1042651808557977600") {
  return {
    _id: userId,
    tag: "Unknown User",
    pfp: "",
    platform: {},
    status: "offline",
    activities: [],
    badges: [],
    customStatus: null,
  };
}

function titleForActivity(type, name) {
  const labels = {
    0: "Playing",
    1: "Streaming",
    2: "Listening to",
    3: "Watching",
    5: "Competing in",
  };
  const prefix = labels[type];
  if (!prefix) return name || "Activity";
  return `${prefix} ${name || ""}`.trim();
}

const appIconCache = new Map();

async function fetchDiscordAppIcon(applicationId) {
  if (!applicationId) return null;
  if (appIconCache.has(applicationId)) return appIconCache.get(applicationId);
  try {
    const res = await fetch(`https://discord.com/api/v10/applications/${applicationId}/rpc`);
    if (!res.ok) {
      appIconCache.set(applicationId, null);
      return null;
    }
    const app = await res.json();
    const icon = app?.icon
      ? `https://cdn.discordapp.com/app-icons/${applicationId}/${app.icon}.webp?size=512`
      : null;
    appIconCache.set(applicationId, icon);
    return icon;
  } catch {
    appIconCache.set(applicationId, null);
    return null;
  }
}

function normalizeLanyardAsset(raw, applicationId) {
  if (!raw) return null;
  if (raw.startsWith("spotify:")) return `https://i.scdn.co/image/${raw.replace("spotify:", "")}`;
  if (raw.startsWith("youtube:")) return `https://i.ytimg.com/vi/${raw.replace("youtube:", "")}/hqdefault_live.jpg`;
  if (raw.startsWith("mp:external/")) {
    const marker = "https/";
    if (raw.includes(marker)) return `https://${raw.split(marker)[1]}`;
    return null;
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("twitch:")) return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${raw.replace("twitch:", "")}-640x360.jpg`;
  if (applicationId) return `https://cdn.discordapp.com/app-assets/${applicationId}/${raw}.png?size=512`;
  return null;
}

async function mapLanyardPresence(payload, userId) {
  if (!payload || !payload.success || !payload.data) return offlinePresence(userId);
  const data = payload.data;
  const user = data.discord_user || {};
  const activities = [];
  let customStatus = null;

  if (data.listening_to_spotify && data.spotify) {
    activities.push({
      applicationId: "spotify",
      assets: {
        largeImage: data.spotify.album_art_url || null,
        largeText: data.spotify.album || null,
        smallImage: null,
        smallText: null,
      },
      details: data.spotify.song || null,
      emoji: null,
      name: "Spotify",
      state: data.spotify.artist || null,
      title: "Listening to Spotify",
      timestamps: data.spotify.timestamps
        ? {
            start: data.spotify.timestamps.start || null,
            end: data.spotify.timestamps.end || null,
          }
        : null,
      type: "2",
    });
  }

  const rawActs = Array.isArray(data.activities) ? data.activities : [];
  for (const act of rawActs) {
    if (act?.type === 4) {
      customStatus = {
        name: act.state || "",
        createdTimestamp: Date.now(),
        emoji: act.emoji?.id
          ? `https://cdn.discordapp.com/emojis/${act.emoji.id}.${act.emoji.animated ? "gif" : "png"}?size=128`
          : act.emoji?.name || null,
      };
      continue;
    }
    if (!act || act.name === "Spotify") continue;
    const appId = act.application_id || null;
    const largeImage = normalizeLanyardAsset(act.assets?.large_image || null, appId);
    const smallImage = normalizeLanyardAsset(act.assets?.small_image || null, appId);
    const appIconFallback = !largeImage && !smallImage ? await fetchDiscordAppIcon(appId) : null;
    activities.push({
      applicationId: appId,
      assets: {
        largeImage: largeImage || appIconFallback,
        largeText: act.assets?.large_text || null,
        smallImage: smallImage || null,
        smallText: act.assets?.small_text || null,
      },
      details: act.details || null,
      emoji: null,
      name: act.name || null,
      state: act.state || null,
      title: titleForActivity(act.type, act.name),
      timestamps: act.timestamps
        ? {
            start: act.timestamps.start || null,
            end: act.timestamps.end || null,
          }
        : null,
      type: String(act.type ?? ""),
    });
  }

  return {
    _id: user.id || userId,
    tag: user.discriminator === "0" || !user.discriminator ? (user.username || "Unknown User") : `${user.username}#${user.discriminator}`,
    pfp: user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
      : "",
    platform: {},
    status: data.discord_status || "offline",
    activities,
    badges: [],
    customStatus,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    // 1) API route
    if (url.pathname.startsWith("/api/presence")) {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: cors,
        });
      }
      const headers = {
        ...cors,
        "content-type": "application/json",
        "cache-control": "no-store",
      };
      const userId = env.DISCORD_USER_ID || "1042651808557977600";
      try {
        const lanyardRes = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`);
        if (!lanyardRes.ok) {
          return new Response(JSON.stringify(offlinePresence(userId)), { status: 200, headers });
        }
        const payload = await lanyardRes.json();
        return new Response(JSON.stringify(await mapLanyardPresence(payload, userId)), { status: 200, headers });
      } catch {
        return new Response(JSON.stringify(offlinePresence(userId)), { status: 200, headers });
      }
    }

    if (url.pathname.startsWith("/api/unique")) {
      // CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: cors,
        });
      }

      const headers = { ...cors, "content-type": "application/json" };

      const page = cleanPage(url.searchParams.get("page"));
      const day = isoDay();

      if (!env.IP_SALT) {
        return new Response(JSON.stringify({ error: "Missing IP_SALT" }), { status: 500, headers });
      }

      const ua = request.headers.get("User-Agent") || "";
      const ip = request.headers.get("CF-Connecting-IP") ||
                 request.headers.get("X-Forwarded-For") ||
                 "0.0.0.0";

      const ipHash = await sha256Hex(ip + env.IP_SALT);

      const dedupeKey = `u:${day}:${page}:${ipHash}`;
      const allKey = `count:all:${page}`;
      const todayKey = `count:today:${day}:${page}`;

      if (request.method === "POST" && !isBot(ua)) {
        const exists = await env.UNIQUE_KV.get(dedupeKey);
        if (!exists) {
          await env.UNIQUE_KV.put(dedupeKey, "1", { expirationTtl: 60 * 60 * 24 * 7 });

          const all = Number(await env.UNIQUE_KV.get(allKey)) || 0;
          const today = Number(await env.UNIQUE_KV.get(todayKey)) || 0;

          await env.UNIQUE_KV.put(allKey, String(all + 1));
          await env.UNIQUE_KV.put(todayKey, String(today + 1), { expirationTtl: 60 * 60 * 24 * 8 });
        }
      }

      const uniqueAllTime = Number(await env.UNIQUE_KV.get(allKey)) || 0;
      const uniqueToday = Number(await env.UNIQUE_KV.get(todayKey)) || 0;

      return new Response(JSON.stringify({ page, uniqueToday, uniqueAllTime }), { status: 200, headers });
    }

    if (url.pathname === "/api/pastes" || url.pathname === "/api/pastes/mine" || url.pathname.startsWith("/api/pastes/")) {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }

      const cookies = parseCookies(request.headers.get("Cookie") || "");
      let ownerToken = cookies.paste_owner || "";
      let ownerHash = ownerToken ? await sha256Hex(ownerToken) : "";
      const baseHeaders = {
        ...cors,
        "cache-control": "no-store",
      };

      if (url.pathname === "/api/pastes/mine" && request.method === "GET") {
        const items = ownerHash ? await readOwnedPastes(env, ownerHash) : [];
        return json({ pastes: items }, 200, baseHeaders);
      }

      if (url.pathname === "/api/pastes" && request.method === "POST") {
        const body = await readJson(request);
        const content = clampText(body?.content || "");
        if (!content.trim()) {
          return json({ error: "Paste content is required." }, 400, baseHeaders);
        }

        if (!ownerToken) {
          ownerToken = randomToken();
          ownerHash = await sha256Hex(ownerToken);
        }

        const now = new Date().toISOString();
        const ttl = parseExpiry(body?.expiresIn);
        const id = makePasteId();
        const expiresAt = ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null;
        const record = {
          id,
          title: normalizeTitle(body?.title),
          content,
          createdAt: now,
          updatedAt: now,
          expiresAt,
          expiryOption: body?.expiresIn || "1w",
          ownerHash,
        };

        await env.UNIQUE_KV.put(`paste:${id}`, JSON.stringify(record), ttl ? { expirationTtl: ttl } : undefined);
        const owned = mergeOwnedPaste(await readOwnedPastes(env, ownerHash), record);
        await writeOwnedPastes(env, ownerHash, owned);

        return json(
          { paste: publicPasteShape(record), editable: true },
          200,
          {
            ...baseHeaders,
            "set-cookie": ownerCookie(ownerToken),
          }
        );
      }

      const pasteId = parsePasteId(url.pathname);
      if (!pasteId) {
        return json({ error: "Paste not found." }, 404, baseHeaders);
      }

      const raw = await env.UNIQUE_KV.get(`paste:${pasteId}`);
      if (!raw) {
        return json({ error: "Paste not found." }, 404, baseHeaders);
      }

      let record;
      try {
        record = JSON.parse(raw);
      } catch {
        return json({ error: "Paste is corrupted." }, 500, baseHeaders);
      }

      if (request.method === "GET") {
        return json(
          {
            paste: publicPasteShape(record),
            editable: Boolean(ownerHash && ownerHash === record.ownerHash),
          },
          200,
          baseHeaders
        );
      }

      if (request.method === "PUT") {
        if (!ownerHash || ownerHash !== record.ownerHash) {
          return json({ error: "You do not own this paste in this browser." }, 403, baseHeaders);
        }

        const body = await readJson(request);
        const content = clampText(body?.content || "");
        if (!content.trim()) {
          return json({ error: "Paste content is required." }, 400, baseHeaders);
        }

        const ttl = parseExpiry(body?.expiresIn);
        const updated = {
          ...record,
          title: normalizeTitle(body?.title),
          content,
          updatedAt: new Date().toISOString(),
          expiresAt: ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null,
          expiryOption: body?.expiresIn || "1w",
        };

        await env.UNIQUE_KV.put(`paste:${pasteId}`, JSON.stringify(updated), ttl ? { expirationTtl: ttl } : undefined);
        const owned = mergeOwnedPaste(await readOwnedPastes(env, ownerHash), updated);
        await writeOwnedPastes(env, ownerHash, owned);

        return json({ paste: publicPasteShape(updated), editable: true }, 200, baseHeaders);
      }

      return json({ error: "Method not allowed." }, 405, baseHeaders);
    }

    if (url.pathname === "/paste" || /^\/paste\/[A-Za-z0-9_-]+$/.test(url.pathname)) {
      const indexUrl = new URL("/index.html", url);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }

    // 2) Everything else: serve static assets from ./public
    return env.ASSETS.fetch(request);
  },
};
