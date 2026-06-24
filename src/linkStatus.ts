import { normalizeUrl } from './crawler.js';
import type { Page } from './types.js';
import { mapLimit } from './mapLimit.js';

const CONCURRENCY = 3;

// HTTP status of a url, or 0 if the request failed. Uses HEAD because it
// does not download the page; some servers do not support it (405 or 501),
// so those are asked again with GET.
export async function checkLink(url: string, timeout: number): Promise<number> {
  try {
    let res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeout) });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(timeout) });
      await res.body?.cancel();
    }
    return res.status;
  } catch {
    return 0;
  }
}

// Checks each distinct url once, three at a time.
export async function fetchLinkStatuses(
  urls: string[],
  timeout: number,
): Promise<Map<string, number>> {
  const distinct = [...new Set(urls)];
  const statuses = await mapLimit(distinct, CONCURRENCY, (url) => checkLink(url, timeout));
  return new Map(distinct.map((url, i) => [url, statuses[i]]));
}

// Every http(s) link on the crawled pages that the crawler did not request
// itself: other sites, and pages beyond the depth or page limit. mailto:,
// tel: and javascript: links are not http(s), so they never get here.
export function unvisitedLinks(pages: Page[], statuses: Map<string, number>): string[] {
  const unvisited = new Set<string>();
  for (const page of pages) {
    for (const link of page.links) {
      const url = normalizeUrl(link, page.url);
      if (url && !statuses.has(url)) unvisited.add(url);
    }
  }
  return [...unvisited];
}
