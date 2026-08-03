import { preflight, liveJsonHeaders } from "../lib/http.js";
import { isCleanTrack } from "../lib/profanity.js";

const LASTFM_USER = "Camronia";

// Most-played first, then all-time. A track has to be clean to be shown at all
// -- if every candidate in a period is flagged we move on rather than falling
// back to a flagged one.
const PERIODS = ["7day", "1month", "overall"];

export async function handleLastFm(request, env, cors) {
  if (request.method === "OPTIONS") return preflight(cors);

  const headers = liveJsonHeaders(cors);

  if (!env.LASTFM_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing LASTFM_API_KEY" }), {
      status: 500,
      headers,
    });
  }

  const apiBase =
    `https://ws.audioscrobbler.com/2.0/?api_key=${env.LASTFM_API_KEY}` +
    `&format=json&user=${LASTFM_USER}`;

  try {
    let track = null;

    for (const period of PERIODS) {
      const res = await fetch(`${apiBase}&method=user.gettoptracks&period=${period}&limit=200`);
      if (!res.ok) continue;

      const data = await res.json();
      const tracks = data.toptracks?.track;
      const list = Array.isArray(tracks) ? tracks : tracks ? [tracks] : [];

      const clean = list.find(isCleanTrack);
      if (clean) {
        track = clean;
        break;
      }
    }

    // No unflagged track anywhere. Report that honestly instead of serving a
    // flagged one -- the card renders its own fallback copy.
    if (!track) {
      return new Response(JSON.stringify({ track: null, reason: "no-clean-track" }), {
        status: 200,
        headers,
      });
    }

    // user.getTopTracks only returns placeholder artwork, so ask for the real
    // album art separately. Artwork is optional; a failure here is not fatal.
    try {
      const infoRes = await fetch(
        `${apiBase}&method=track.getInfo` +
          `&track=${encodeURIComponent(track.name)}` +
          `&artist=${encodeURIComponent(track.artist?.name || "")}`
      );
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        const albumImages = infoData.track?.album?.image;
        if (Array.isArray(albumImages) && albumImages.length > 0) {
          track.image = albumImages;
        }
      }
    } catch {
      /* proceed without album art */
    }

    return new Response(JSON.stringify({ track }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch track" }), {
      status: 500,
      headers,
    });
  }
}
