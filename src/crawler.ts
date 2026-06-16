import { parsePage } from './parser.js';
import type { Page } from './types.js';

export interface CrawlOptions {
  depth: number;
  maxPages: number;
  timeout: number;
}

export interface CrawlResult {
  // pages that were fetched and parsed
  pages: Page[];
  // http status for every url that was requested
  statuses: Map<string, number>;
}

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

async function fetchPage(url: string, timeout: number): Promise<Page> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: { accept: 'text/html' },
  });
  const html = await res.text();
  return parsePage(html, res.url, res.status);
}

// Breadth-first crawl of one site. Only links on the same origin as the
// start url are followed.
export async function crawl(startUrl: string, options: CrawlOptions): Promise<CrawlResult> {
  const start = normalizeUrl(startUrl, startUrl);
  if (!start) throw new Error(`invalid start url: ${startUrl}`);
  const origin = new URL(start).origin;

  const pages: Page[] = [];
  const statuses = new Map<string, number>();
  const seen = new Set([start]);
  let level = [start];

  for (let depth = 0; level.length > 0 && depth <= options.depth; depth++) {
    const next: string[] = [];
    for (const url of level) {
      const page = await fetchPage(url, options.timeout);
      pages.push(page);
      statuses.set(url, page.status);

      for (const link of page.links) {
        const normalized = normalizeUrl(link, page.url);
        if (!normalized || seen.has(normalized)) continue;
        if (new URL(normalized).origin !== origin) continue;
        if (seen.size >= options.maxPages) continue;
        seen.add(normalized);
        next.push(normalized);
      }
    }
    level = next;
  }

  return { pages, statuses };
}
