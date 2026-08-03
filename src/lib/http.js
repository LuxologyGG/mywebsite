/** Small HTTP helpers shared by every route. */

export function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin || "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Standard preflight response. */
export function preflight(cors) {
  return new Response(null, { status: 204, headers: cors });
}

/** JSON headers that also defeat any intermediary caching. */
export function liveJsonHeaders(cors) {
  return { ...cors, "content-type": "application/json", "cache-control": "no-store" };
}
