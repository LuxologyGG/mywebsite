import { preflight } from "../lib/http.js";
import { sha256Hex, isBot, isoDay, cleanPage } from "../lib/format.js";

/** Privacy-preserving unique-visitor counter (salted IP hash, 7-day dedupe). */
export async function handleUnique(request, env, url, cors) {
  if (request.method === "OPTIONS") return preflight(cors);

  const headers = { ...cors, "content-type": "application/json" };
  const page = cleanPage(url.searchParams.get("page"));
  const day = isoDay();

  if (!env.IP_SALT) {
    return new Response(JSON.stringify({ error: "Missing IP_SALT" }), { status: 500, headers });
  }

  const ua = request.headers.get("User-Agent") || "";
  const ip =
    request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "0.0.0.0";

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

  return new Response(JSON.stringify({ page, uniqueToday, uniqueAllTime }), {
    status: 200,
    headers,
  });
}
