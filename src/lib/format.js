/** Formatting, hashing, and request-classification helpers. */

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isBot(ua = "") {
  const s = ua.toLowerCase();
  return ["bot", "spider", "crawl", "slurp", "bingpreview", "headless", "lighthouse"].some((k) =>
    s.includes(k)
  );
}

export function isoDay() {
  return new Date().toISOString().slice(0, 10);
}

export function cleanPage(value) {
  if (!value) return "/";
  let p = String(value);
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 200) p = p.slice(0, 200);
  return p;
}

export function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatRelativeExpiry(v) {
  if (!v) return "Never";
  const diff = new Date(v) - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `Expires in ${days}d`;
  if (hours > 0) return `Expires in ${hours}h`;
  return "Expires soon";
}

export function shortDate(v) {
  if (!v) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(v));
}
