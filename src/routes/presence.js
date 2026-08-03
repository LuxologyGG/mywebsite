import { preflight, liveJsonHeaders } from "../lib/http.js";
import { isCleanActivity } from "../lib/profanity.js";
import { DEFAULT_USER_ID, offlinePresence, mapLanyardPresence } from "../lib/discord.js";

const LAST_ACTIVITY_KEY = "last_real_activity";

// "Last seen" stops being a meaningful thing to show after a while. Past this
// the card falls back to "No recent activity" instead of claiming something
// from weeks ago is recent.
const LAST_ACTIVITY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Lanyard's placeholder entry when a user has nothing going on. */
function isIdlePlaceholder(a) {
  const text = `${a?.name || ""} ${a?.title || ""}`.toLowerCase();
  return text.includes("not currently doing anything");
}

export async function handlePresence(request, env, ctx, cors) {
  if (request.method === "OPTIONS") return preflight(cors);

  const headers = liveJsonHeaders(cors);
  const userId = env.DISCORD_USER_ID || DEFAULT_USER_ID;

  try {
    const lanyardRes = await fetch(
      `https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`
    );
    if (!lanyardRes.ok) {
      return new Response(JSON.stringify(offlinePresence(userId)), { status: 200, headers });
    }

    const payload = await lanyardRes.json();
    const presence = await mapLanyardPresence(payload, userId);

    if (presence?.activities) {
      // Drop Lanyard's idle placeholder, then screen what's left. A track with
      // a crude title is simply not shown rather than being displayed and then
      // pinned as the "last seen" activity for days afterwards.
      presence.activities = presence.activities
        .filter((a) => !isIdlePlaceholder(a))
        .filter(isCleanActivity);
    }

    // Custom statuses are free text, so they get the same treatment.
    if (presence?.customStatus && !isCleanActivity({ state: presence.customStatus.name })) {
      presence.customStatus = null;
    }

    const current = presence?.activities?.[0] || null;

    if (current && env.UNIQUE_KV) {
      // waitUntil keeps the write alive past the response; a bare floating
      // promise here can be cancelled when the worker invocation ends.
      ctx.waitUntil(
        env.UNIQUE_KV.put(
          LAST_ACTIVITY_KEY,
          JSON.stringify({ activity: current, time: Date.now() })
        ).catch(() => {})
      );
    }

    if (!current && env.UNIQUE_KV) {
      presence.lastActivity = null;
      presence.lastActivityTime = null;
      try {
        const lastStr = await env.UNIQUE_KV.get(LAST_ACTIVITY_KEY);
        if (lastStr) {
          const saved = JSON.parse(lastStr);
          const activity = saved.activity || saved;
          const time = saved.time || null;
          const fresh = time && Date.now() - time < LAST_ACTIVITY_MAX_AGE_MS;

          // Re-screen on read as well: anything stored before this filter
          // existed is discarded instead of being served indefinitely.
          if (fresh && isCleanActivity(activity)) {
            presence.lastActivity = activity;
            presence.lastActivityTime = time;
          } else {
            ctx.waitUntil(env.UNIQUE_KV.delete(LAST_ACTIVITY_KEY).catch(() => {}));
          }
        }
      } catch {
        /* a malformed cache entry should never break the endpoint */
      }
    }

    return new Response(JSON.stringify(presence), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify(offlinePresence(userId)), { status: 200, headers });
  }
}
