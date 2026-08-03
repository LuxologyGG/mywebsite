import { escapeAttr, formatRelativeExpiry, shortDate } from "../lib/format.js";

/**
 * Routes owned by the client-side router in public/js/router.js. Visiting one
 * directly (or refreshing on it) has to return the SPA shell, otherwise the
 * asset handler 404s on a page that works fine once JavaScript takes over.
 */
const SPA_PREFIXES = ["/paste", "/blog"];
const SPA_EXACT = ["/upload", "/projects", "/contact", "/overview"];

/** True for a path the client router knows how to render. */
export function isSpaRoute(pathname) {
  if (pathname.includes(".")) return false; // let real assets through
  return SPA_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    SPA_EXACT.includes(pathname);
}

/** True for a path that should get the shell's own 404 view rather than a bare 404. */
export function isClientRenderable(pathname) {
  return !pathname.includes(".") && !pathname.startsWith("/api/");
}

async function fetchShell(request, env, status = 200) {
  const res = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
  if (status === 200) return res;
  // Same markup, honest status code — the shell renders its own 404 view.
  return new Response(res.body, { status, headers: res.headers });
}

/** Serves index.html, adding Open Graph tags when the route is a single paste. */
export async function handleSpa(request, env, url, status = 200) {
  const pasteMatch = url.pathname.match(/^\/paste\/([A-Fa-f0-9]+)$/);
  if (!pasteMatch) return fetchShell(request, env, status);

  try {
    const pasteApiUrl = env.PASTE_API_URL || "https://camron-paste-api.onrender.com";
    const pasteRes = await fetch(`${pasteApiUrl}/paste/${pasteMatch[1]}`);
    if (!pasteRes.ok) return fetchShell(request, env, status);

    const paste = await pasteRes.json();
    const baseResp = await fetchShell(request, env);
    const html = await baseResp.text();

    const created = shortDate(paste.createdAt);
    const expiry = formatRelativeExpiry(paste.expiresAt);
    const desc = created ? `Created ${created} · ${expiry}` : "A paste on camr.one";

    const ogTags =
      `<meta name="theme-color" content="#ffffff">\n` +
      `  <meta property="og:title" content="camr.one paste">\n` +
      `  <meta property="og:description" content="${escapeAttr(desc)}">\n` +
      `  <meta property="og:type" content="website">`;

    return new Response(html.replace("</head>", `  ${ogTags}\n</head>`), {
      headers: { "content-type": "text/html;charset=utf-8" },
    });
  } catch {
    return fetchShell(request, env, status);
  }
}
