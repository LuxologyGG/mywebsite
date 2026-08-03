import { json, preflight } from "../lib/http.js";

const GITHUB_USERNAME = "LuxologyGG";

/**
 * Scrapes the public contributions calendar. GitHub has no unauthenticated
 * JSON endpoint for this, so the HTML is parsed; every failure degrades to an
 * empty graph rather than an error the page has to handle.
 */
export async function handleGithubContributions(request, cors) {
  if (request.method === "OPTIONS") return preflight(cors);

  const headers = { ...cors, "content-type": "application/json", "cache-control": "public, max-age=3600" };

  try {
    const ghRes = await fetch(`https://github.com/users/${GITHUB_USERNAME}/contributions`, {
      headers: { "User-Agent": "camrone-site/1.0", Accept: "text/html" },
    });
    if (!ghRes.ok) throw new Error("GitHub fetch failed");
    const html = await ghRes.text();

    const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in the last year/i);
    const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, "")) : 0;

    // Each day is a <td data-date=...>; the count lives in a matching tool-tip.
    const cells = {};
    const tdTags = html.match(/<td[^>]+data-date[^>]+>/gi) || [];
    for (const tag of tdTags) {
      const idMatch = tag.match(/id="(contribution-day-component-[\d]+-[\d]+)"/);
      const dateMatch = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/);
      const levelMatch = tag.match(/data-level="(\d)"/);
      if (dateMatch) {
        const id = idMatch ? idMatch[1] : dateMatch[1];
        cells[id] = {
          date: dateMatch[1],
          level: levelMatch ? parseInt(levelMatch[1]) : 0,
          count: 0,
        };
      }
    }

    const tipRegex =
      /<tool-tip[^>]+for="(contribution-day-component-[\d]+-[\d]+)"[^>]*>([^<]+)<\/tool-tip>/gi;
    let m;
    while ((m = tipRegex.exec(html)) !== null) {
      const countMatch = m[2].match(/^(\d+)\s+contribution/);
      if (countMatch && cells[m[1]]) cells[m[1]].count = parseInt(countMatch[1]);
    }

    const contributions = Object.values(cells).sort((a, b) => a.date.localeCompare(b.date));
    return json({ total, contributions }, 200, headers);
  } catch {
    return json({ total: 0, contributions: [] }, 200, cors);
  }
}
