import { json, preflight } from "../lib/http.js";

/** Proxies browser uploads to the image host so its API key stays server-side. */
export async function handleUpload(request, env, cors) {
  if (request.method === "OPTIONS") return preflight(cors);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

  if (!env.IMAGE_HOST_URL || !env.IMAGE_HOST_KEY) {
    return json({ error: "Image host not configured" }, 500, cors);
  }

  try {
    const body = await request.arrayBuffer();
    const upstream = await fetch(`${env.IMAGE_HOST_URL}/files`, {
      method: "POST",
      headers: {
        key: env.IMAGE_HOST_KEY,
        "content-type": request.headers.get("content-type") || "application/octet-stream",
      },
      body,
    });
    const data = await upstream.json();
    return json(data, upstream.status, cors);
  } catch {
    return json({ error: "Upload proxy failed" }, 502, cors);
  }
}
