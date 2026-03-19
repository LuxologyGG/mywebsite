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

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatRelativeExpiry(v) {
  if (!v) return "Never";
  const diff = new Date(v) - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `Expires in ${days}d`;
  if (hours > 0) return `Expires in ${hours}h`;
  return "Expires soon";
}

function shortDate(v) {
  if (!v) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(v));
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
        const presence = await mapLanyardPresence(payload, userId);
        
        let hasRealActivity = false;
        if (presence && presence.activities) {
          presence.activities = presence.activities.filter(a => 
             !(a.name && a.name.toLowerCase().includes("not currently doing anything")) &&
             !(a.title && a.title.toLowerCase().includes("not currently doing anything"))
          );
          if (presence.activities.length > 0) {
            hasRealActivity = true;
            if (env.UNIQUE_KV) {
              env.UNIQUE_KV.put("last_real_activity", JSON.stringify(presence.activities[0])).catch(() => {});
            }
          }
        }

        if (!hasRealActivity && env.UNIQUE_KV) {
          try {
            const lastStr = await env.UNIQUE_KV.get("last_real_activity");
            if (lastStr) {
              const lastAct = JSON.parse(lastStr);
              if (presence) {
                presence.activities = [lastAct];
              }
            }
          } catch (e) {}
        }
        
        return new Response(JSON.stringify(presence), { status: 200, headers });
      } catch {
        return new Response(JSON.stringify(offlinePresence(userId)), { status: 200, headers });
      }
    }

    // ✅ LAST.FM API
    if (url.pathname.startsWith("/api/lastfm")) {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }
      const headers = { ...cors, "content-type": "application/json", "cache-control": "no-store" };
      
      if (!env.LASTFM_API_KEY) {
        return new Response(JSON.stringify({ error: "Missing LASTFM_API_KEY" }), { status: 500, headers });
      }

      try {
        const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&period=7day&user=Camronia&api_key=${env.LASTFM_API_KEY}&format=json&limit=1`);
        if (!res.ok) throw new Error("last.fm fetch failed");
        const data = await res.json();
        
        const tracks = data.toptracks?.track;
        const track = Array.isArray(tracks) ? tracks[0] : tracks;
        
        return new Response(JSON.stringify({ track }), { status: 200, headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Failed to fetch track" }), { status: 500, headers });
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

    // ✅ IP INFO API
    if (url.pathname.startsWith("/api/ip")) {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }

      const headers = { ...cors, "content-type": "application/json" };

      // Use query param ?ip=x.x.x.x for lookup, otherwise use requester's IP
      const queryIp = url.searchParams.get("ip");
      const clientIp = request.headers.get("CF-Connecting-IP") ||
                       request.headers.get("X-Forwarded-For") ||
                       "0.0.0.0";
      const targetIp = queryIp || clientIp;

      const info = {
        ip: targetIp,
        city: null,
        region: null,
        country: null,
        loc: null,
        org: null,
        timezone: null,
      };

      // If it's the requester's own IP, we can use CF headers for geo data
      if (!queryIp || queryIp === clientIp) {
        info.city = request.cf?.city || null;
        info.region = request.cf?.region || null;
        info.country = request.cf?.country || null;
        info.loc = (request.cf?.latitude && request.cf?.longitude)
          ? `${request.cf.latitude},${request.cf.longitude}` : null;
        info.org = request.cf?.asOrganization || null;
        info.timezone = request.cf?.timezone || null;
      } else {
        // For arbitrary IP lookups, use ipinfo.io (no key needed for basic data)
        try {
          const res = await fetch(`https://ipinfo.io/${encodeURIComponent(targetIp)}/json`);
          if (res.ok) {
            const data = await res.json();
            info.city = data.city || null;
            info.region = data.region || null;
            info.country = data.country || null;
            info.loc = data.loc || null;
            info.org = data.org || null;
            info.timezone = data.timezone || null;
          }
        } catch {}
      }

      // AbuseIPDB safety check
      info.abuse = null;
      if (env.ABUSEIPDB_KEY) {
        try {
          const abuseRes = await fetch(
            `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(targetIp)}&maxAgeInDays=90`,
            {
              headers: {
                "Key": env.ABUSEIPDB_KEY,
                "Accept": "application/json",
              },
            }
          );
          if (abuseRes.ok) {
            const abuseJson = await abuseRes.json();
            const d = abuseJson.data;
            info.abuse = {
              abuseConfidenceScore: d.abuseConfidenceScore ?? null,
              totalReports: d.totalReports ?? 0,
              isWhitelisted: d.isWhitelisted ?? null,
              isTor: d.isTor ?? false,
              usageType: d.usageType || null,
              isp: d.isp || null,
              domain: d.domain || null,
              lastReportedAt: d.lastReportedAt || null,
            };
          }
        } catch {}
      }

      return json(info, 200, cors);
    }

    // ✅ UPLOAD PROXY — forwards to image-host with server-side API key
    if (url.pathname === "/api/upload") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405, cors);
      }
      if (!env.IMAGE_HOST_URL || !env.IMAGE_HOST_KEY) {
        return json({ error: "Image host not configured" }, 500, cors);
      }
      try {
        const body = await request.arrayBuffer();
        const upstream = await fetch(`${env.IMAGE_HOST_URL}/files`, {
          method: "POST",
          headers: {
            "key": env.IMAGE_HOST_KEY,
            "content-type": request.headers.get("content-type") || "application/octet-stream",
          },
          body,
        });
        const data = await upstream.json();
        return json(data, upstream.status, cors);
      } catch (err) {
        return json({ error: "Upload proxy failed" }, 502, cors);
      }
    }

    // ✅ GITHUB CONTRIBUTIONS PROXY
    if (url.pathname === "/api/github-contributions") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }

      const headers = { ...cors, "content-type": "application/json", "cache-control": "public, max-age=3600" };
      const username = "LuxologyGG";

      try {
        const ghRes = await fetch(`https://github.com/users/${username}/contributions`, {
          headers: { "User-Agent": "camrone-site/1.0", "Accept": "text/html" },
        });
        if (!ghRes.ok) throw new Error("GitHub fetch failed");
        const html = await ghRes.text();

        // Parse total contributions
        const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in the last year/i);
        const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, "")) : 0;

        // Parse cells: extract td tags with data-date
        const cells = {};
        const tdTags = html.match(/<td[^>]+data-date[^>]+>/gi) || [];
        for (const tag of tdTags) {
          const idMatch = tag.match(/id="(contribution-day-component-[\d]+-[\d]+)"/);
          const dateMatch = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/);
          const levelMatch = tag.match(/data-level="(\d)"/);
          if (dateMatch) {
            const id = idMatch ? idMatch[1] : dateMatch[1];
            cells[id] = { date: dateMatch[1], level: levelMatch ? parseInt(levelMatch[1]) : 0, count: 0 };
          }
        }

        // Parse tooltip counts
        const tipRegex = /<tool-tip[^>]+for="(contribution-day-component-[\d]+-[\d]+)"[^>]*>([^<]+)<\/tool-tip>/gi;
        let m;
        while ((m = tipRegex.exec(html)) !== null) {
          const countMatch = m[2].match(/^(\d+)\s+contribution/);
          if (countMatch && cells[m[1]]) {
            cells[m[1]].count = parseInt(countMatch[1]);
          }
        }

        const contributions = Object.values(cells).sort((a, b) => a.date.localeCompare(b.date));
        return json({ total, contributions }, 200, headers);
      } catch {
        return json({ total: 0, contributions: [] }, 200, cors);
      }
    }

    // SPA fallback for /paste, /upload, and /projects page routes (not static assets like .js/.css)
    if ((url.pathname.startsWith("/paste") || url.pathname === "/upload" || url.pathname === "/projects" || url.pathname === "/contact") && !url.pathname.includes(".")) {
      // Inject OG meta tags for individual paste pages
      const pasteMatch = url.pathname.match(/^\/paste\/([A-Fa-f0-9]+)$/);
      if (pasteMatch) {
        try {
          const pasteApiUrl = env.PASTE_API_URL || "https://camron-paste-api.onrender.com";
          const pasteRes = await fetch(`${pasteApiUrl}/paste/${pasteMatch[1]}`);
          if (pasteRes.ok) {
            const paste = await pasteRes.json();
            const baseResp = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
            const html = await baseResp.text();

            const created = shortDate(paste.createdAt);
            const expiry = formatRelativeExpiry(paste.expiresAt);
            const desc = created ? `Created ${created} · ${expiry}` : "A paste on camr.one";

            const ogTags = `<meta name="theme-color" content="#ffffff">\n` +
              `  <meta property="og:title" content="camr.one paste">\n` +
              `  <meta property="og:description" content="${escapeAttr(desc)}">\n` +
              `  <meta property="og:type" content="website">`;

            return new Response(html.replace("</head>", `  ${ogTags}\n</head>`), {
              headers: { "content-type": "text/html;charset=utf-8" },
            });
          }
        } catch {}
      }
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
    }

    // Everything else → static asset serving
    return env.ASSETS.fetch(request);
  },
};