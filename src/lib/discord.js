/** Lanyard -> presence-card mapping for the Discord status widget. */

export const DEFAULT_USER_ID = "1042651808557977600";

export function offlinePresence(userId = DEFAULT_USER_ID) {
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
  if (raw.startsWith("youtube:"))
    return `https://i.ytimg.com/vi/${raw.replace("youtube:", "")}/hqdefault_live.jpg`;
  if (raw.startsWith("mp:external/")) {
    const marker = "https/";
    if (raw.includes(marker)) return `https://${raw.split(marker)[1]}`;
    return null;
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("twitch:"))
    return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${raw.replace("twitch:", "")}-640x360.jpg`;
  if (applicationId) return `https://cdn.discordapp.com/app-assets/${applicationId}/${raw}.png?size=512`;
  return null;
}

export async function mapLanyardPresence(payload, userId) {
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
        ? { start: act.timestamps.start || null, end: act.timestamps.end || null }
        : null,
      type: String(act.type ?? ""),
    });
  }

  return {
    _id: user.id || userId,
    tag:
      user.discriminator === "0" || !user.discriminator
        ? user.username || "Unknown User"
        : `${user.username}#${user.discriminator}`,
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
