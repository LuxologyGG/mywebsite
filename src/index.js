/**
 * camr.one Cloudflare Worker.
 *
 * Dispatches the handful of JSON APIs the site calls, serves the SPA shell for
 * client-routed pages, and falls through to static assets for everything else.
 */

import { corsHeaders } from "./lib/http.js";
import { handlePresence } from "./routes/presence.js";
import { handleLastFm } from "./routes/lastfm.js";
import { handleUnique } from "./routes/unique.js";
import { handleIp } from "./routes/ip.js";
import { handleUpload } from "./routes/upload.js";
import { handleGithubContributions } from "./routes/github.js";
import { isSpaRoute, isClientRenderable, handleSpa } from "./routes/spa.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get("Origin"));
    const path = url.pathname;

    if (path.startsWith("/api/presence")) return handlePresence(request, env, ctx, cors);
    if (path.startsWith("/api/lastfm")) return handleLastFm(request, env, cors);
    if (path.startsWith("/api/unique")) return handleUnique(request, env, url, cors);
    if (path.startsWith("/api/ip")) return handleIp(request, env, url, cors);
    if (path === "/api/upload") return handleUpload(request, env, cors);
    if (path === "/api/github-contributions") return handleGithubContributions(request, cors);

    if (isSpaRoute(path)) return handleSpa(request, env, url);

    const asset = await env.ASSETS.fetch(request);

    // An unknown page-like path gets the shell so the site's own 404 view
    // renders, but keeps a 404 status so crawlers aren't told it exists.
    if (asset.status === 404 && isClientRenderable(path)) {
      return handleSpa(request, env, url, 404);
    }

    return asset;
  },
};
