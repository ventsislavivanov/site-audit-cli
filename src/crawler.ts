import { describeFetchError } from './errors.js';
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
  // url -> reason, for requested urls that did not give an HTML page
  failures: Map<string, string>;
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

const CONCURRENCY = 3;

// Run fn on every item with at most `limit` calls in flight at once.
// Results keep the order of the input.
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface Fetched {
  // 0 when the request failed (timeout, connection refused, DNS)
  status: number;
  // null for error responses, non-HTML responses and failed requests
  page: Page | null;
  // why there is no page, in plain words
  failure?: string;
}

async function fetchPage(url: string, timeout: number): Promise<Fetched> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { accept: 'text/html' },
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('text/html')) {
      await res.body?.cancel();
      const failure = res.ok
        ? `not an HTML page (${type || 'no content-type'})`
        : `HTTP ${res.status}`;
      return { status: res.status, page: null, failure };
    }
    const html = await res.text();
    return { status: res.status, page: parsePage(html, res.url, res.status) };
  } catch (err) {
    return { status: 0, page: null, failure: describeFetchError(err, timeout) };
  }
}

// Breadth-first crawl of one site. Only links on the same origin as the
// start url are followed.
export async function crawl(startUrl: string, options: CrawlOptions): Promise<CrawlResult> {
  const start = normalizeUrl(startUrl, startUrl);
  if (!start) {
    throw new Error(
      `invalid start url "${startUrl}" (use a full address like https://example.com)`,
    );
  }
  const origin = new URL(start).origin;

  const pages: Page[] = [];
  const statuses = new Map<string, number>();
  const failures = new Map<string, string>();
  const seen = new Set([start]);
  let level = [start];

  for (let depth = 0; level.length > 0 && depth <= options.depth; depth++) {
    const next: string[] = [];
    const fetched = await mapLimit(level, CONCURRENCY, (url) => fetchPage(url, options.timeout));
    for (const [i, { status, page, failure }] of fetched.entries()) {
      statuses.set(level[i], status);
      if (!page) {
        if (failure) failures.set(level[i], failure);
        continue;
      }
      pages.push(page);

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

  return { pages, statuses, failures };
}
