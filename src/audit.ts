import { checkBrokenLinks } from './checks/brokenLinks.js';
import { checkImageAlt } from './checks/imageAlt.js';
import { checkImageSize } from './checks/imageSize.js';
import { checkMetaTags } from './checks/metaTags.js';
import { checkOpenGraph } from './checks/openGraph.js';
import { crawl } from './crawler.js';
import type { CrawlOptions } from './crawler.js';
import type { Issue, Report } from './types.js';

// Crawl the site and run every check on every page that was fetched.
export async function runAudit(startUrl: string, options: CrawlOptions): Promise<Report> {
  const { pages, statuses } = await crawl(startUrl, options);

  if (pages.length === 0) {
    const status = statuses.get([...statuses.keys()][0]);
    throw new Error(
      `could not load ${startUrl} (${status ? `status ${status}` : 'request failed'})`,
    );
  }

  const issues: Issue[] = [];
  const imageSizes = new Map<string, number | null>();

  for (const page of pages) {
    issues.push(
      ...checkMetaTags(page),
      ...checkOpenGraph(page),
      ...checkImageAlt(page),
      ...checkBrokenLinks(page, statuses),
      ...(await checkImageSize(page, options.timeout, imageSizes)),
    );
  }

  return { startUrl, pagesCrawled: pages.length, issues };
}
