import { json, preflight } from "../lib/http.js";

/** Geo + abuse-reputation lookup for the Explore tab's IP tools. */
export async function handleIp(request, env, url, cors) {
  if (request.method === "OPTIONS") return preflight(cors);

  // ?ip=x.x.x.x looks up an arbitrary address; otherwise report the caller's.
  const queryIp = url.searchParams.get("ip");
  const clientIp =
    request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "0.0.0.0";
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

  if (!queryIp || queryIp === clientIp) {
    // Cloudflare already resolved geo for the requester — no extra hop needed.
    info.city = request.cf?.city || null;
    info.region = request.cf?.region || null;
    info.country = request.cf?.country || null;
    info.loc =
      request.cf?.latitude && request.cf?.longitude
        ? `${request.cf.latitude},${request.cf.longitude}`
        : null;
    info.org = request.cf?.asOrganization || null;
    info.timezone = request.cf?.timezone || null;
  } else {
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
    } catch {
      /* geo is best-effort */
    }
  }

  info.abuse = null;
  if (env.ABUSEIPDB_KEY) {
    try {
      const abuseRes = await fetch(
        `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(targetIp)}&maxAgeInDays=90`,
        { headers: { Key: env.ABUSEIPDB_KEY, Accept: "application/json" } }
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
    } catch {
      /* reputation is best-effort */
    }
  }

  return json(info, 200, cors);
}
