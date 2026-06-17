import { describe, expect, it } from 'vitest';
import { checkMetaTags } from '../../src/checks/metaTags.js';
import { parsePage } from '../../src/parser.js';

const url = 'https://example.com/';

describe('checkMetaTags', () => {
  it('reports nothing when title and description are present', () => {
    const html = '<title>Home</title><meta name="description" content="About us">';
    expect(checkMetaTags(parsePage(html, url))).toEqual([]);
  });

  it('reports a missing title as an error', () => {
    const html = '<meta name="description" content="About us">';
    expect(checkMetaTags(parsePage(html, url))).toEqual([
      { check: 'meta-tags', severity: 'error', url, message: 'Missing <title>' },
    ]);
  });

  it('reports a missing description as a warning', () => {
    const issues = checkMetaTags(parsePage('<title>Home</title>', url));
    expect(issues).toEqual([
      { check: 'meta-tags', severity: 'warning', url, message: 'Missing meta description' },
    ]);
  });

  it('reports both on an empty page', () => {
    expect(checkMetaTags(parsePage('', url))).toHaveLength(2);
  });
});
