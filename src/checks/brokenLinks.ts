import { normalizeUrl } from '../crawler.js';
import type { Issue, Page } from '../types.js';

// Looks up every link on the page in the status map from the crawl.
// Links that were never requested (other origins, beyond the depth or
// page limit) are not in the map and are not reported.
export function checkBrokenLinks(page: Page, statuses: Map<string, number>): Issue[] {
  const issues: Issue[] = [];
  const reported = new Set<string>();

  for (const link of page.links) {
    const target = normalizeUrl(link, page.url);
    if (!target || reported.has(target)) continue;
    reported.add(target);

    const status = statuses.get(target);
    if (status === undefined) continue;
    if (status === 0) {
      issues.push({
        check: 'broken-links',
        severity: 'error',
        url: page.url,
        message: `Broken link: ${target} (request failed)`,
      });
    } else if (status >= 400) {
      issues.push({
        check: 'broken-links',
        severity: 'error',
        url: page.url,
        message: `Broken link: ${target} (${status})`,
      });
    }
  }

  return issues;
}
