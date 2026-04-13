/** Normalize GitHub repo URLs for storage and lookup (case-insensitive host/path). */
export function canonicalRepoUrl(url: string): string {
  const t = url.trim().replace(/\/$/, "");
  try {
    const u = new URL(t);
    if (u.hostname !== "github.com") return t;
    const path = u.pathname.replace(/\/$/, "").toLowerCase();
    return `https://github.com${path}`;
  } catch {
    return t.toLowerCase();
  }
}
