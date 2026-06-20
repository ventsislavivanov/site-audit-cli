import { describe, expect, it } from 'vitest';
import { formatJson } from '../../src/report/json.js';
import type { Report } from '../../src/types.js';

describe('formatJson', () => {
  it('outputs valid json with summary and issues', () => {
    const report: Report = {
      startUrl: 'https://example.com/',
      pagesCrawled: 3,
      issues: [
        {
          check: 'meta-tags',
          severity: 'error',
          url: 'https://example.com/',
          message: 'Missing <title>',
        },
        {
          check: 'open-graph',
          severity: 'warning',
          url: 'https://example.com/',
          message: 'Missing og:image',
        },
      ],
    };

    expect(JSON.parse(formatJson(report))).toEqual({
      startUrl: 'https://example.com/',
      pagesCrawled: 3,
      summary: { errors: 1, warnings: 1 },
      issues: report.issues,
    });
  });

  it('outputs an empty issue list', () => {
    const report: Report = { startUrl: 'https://example.com/', pagesCrawled: 1, issues: [] };
    expect(JSON.parse(formatJson(report)).issues).toEqual([]);
  });
});
