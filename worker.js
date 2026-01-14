export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || "/";

    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      "unknown";

    const key = `${page}:${ip}`;

    const seen = await env.UNIQUE_KV.get(key);
    if (!seen) {
      await env.UNIQUE_KV.put(key, "1", { expirationTtl: 86400 });
    }

    const listKey = `list:${page}`;
    const count = (await env.UNIQUE_KV.get(listKey)) || "0";
    if (!seen) {
      await env.UNIQUE_KV.put(listKey, String(Number(count) + 1));
    }

    return new Response(
      JSON.stringify({
        page,
        uniqueToday: Number(await env.UNIQUE_KV.get(listKey)) || 0
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
};