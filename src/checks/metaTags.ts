import type { Issue, Page } from '../types.js';

export function checkMetaTags(page: Page): Issue[] {
  const issues: Issue[] = [];

  if (!page.title) {
    issues.push({
      check: 'meta-tags',
      severity: 'error',
      url: page.url,
      message: 'Missing <title>',
    });
  }
  if (!page.metaDescription) {
    issues.push({
      check: 'meta-tags',
      severity: 'warning',
      url: page.url,
      message: 'Missing meta description',
    });
  }

  return issues;
}
