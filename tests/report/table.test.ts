import { describe, expect, it } from 'vitest';
import { formatTable } from '../../src/report/table.js';
import type { Report } from '../../src/types.js';

describe('formatTable', () => {
  it('groups issues by page, errors first', () => {
    const report: Report = {
      startUrl: 'https://example.com/',
      pagesCrawled: 2,
      issues: [
        {
          check: 'open-graph',
          severity: 'warning',
          url: 'https://example.com/',
          message: 'Missing og:image',
        },
        {
          check: 'meta-tags',
          severity: 'error',
          url: 'https://example.com/',
          message: 'Missing <title>',
        },
        {
          check: 'image-alt',
          severity: 'error',
          url: 'https://example.com/a',
          message: 'Image without alt: x.png',
        },
      ],
    };

    expect(formatTable(report)).toBe(
      [
        'https://example.com/',
        '  error    meta-tags   Missing <title>',
        '  warning  open-graph  Missing og:image',
        '',
        'https://example.com/a',
        '  error    image-alt   Image without alt: x.png',
        '',
        'Crawled 2 pages: 2 errors, 1 warning.',
      ].join('\n'),
    );
  });

  it('says so when there is nothing to report', () => {
    const report: Report = { startUrl: 'https://example.com/', pagesCrawled: 1, issues: [] };
    expect(formatTable(report)).toBe('No issues found.\n\nCrawled 1 page: 0 errors, 0 warnings.');
  });
});
