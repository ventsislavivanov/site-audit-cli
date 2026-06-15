// Resolve href against base and drop the #fragment. Returns null for
// anything that is not a valid http(s) URL.
export function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href.trim(), base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}
