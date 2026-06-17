import type { Issue, Page } from '../types.js';

const REQUIRED_TAGS = ['og:title', 'og:description', 'og:image'];

export function checkOpenGraph(page: Page): Issue[] {
  return REQUIRED_TAGS.filter((tag) => !page.ogTags[tag]).map((tag) => ({
    check: 'open-graph',
    severity: 'warning',
    url: page.url,
    message: `Missing ${tag}`,
  }));
}
