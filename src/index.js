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
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    // ✅ PRESENCE API (restore your real code)
    if (url.pathname.startsWith("/api/presence")) {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
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

    // ✅ UNIQUE API (restore)
    if (url.pathname.startsWith("/api/unique")) {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
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

    // ✅ EVERYTHING ELSE → let Cloudflare serve static files
    return fetch(request);
  },
};