import { describe, expect, it } from 'vitest';
import { checkBrokenLinks } from '../../src/checks/brokenLinks.js';
import { parsePage } from '../../src/parser.js';

const url = 'https://example.com/';

describe('checkBrokenLinks', () => {
  it('reports nothing when all links returned 200', () => {
    const page = parsePage('<a href="/a">a</a>', url);
    const statuses = new Map([['https://example.com/a', 200]]);
    expect(checkBrokenLinks(page, statuses)).toEqual([]);
  });

  it('reports a 404 link as an error', () => {
    const page = parsePage('<a href="/gone">gone</a>', url);
    const statuses = new Map([['https://example.com/gone', 404]]);
    expect(checkBrokenLinks(page, statuses)).toEqual([
      {
        check: 'broken-links',
        severity: 'error',
        url,
        message: 'Broken link: https://example.com/gone (404)',
      },
    ]);
  });

  it('reports a 500 and a failed request', () => {
    const page = parsePage('<a href="/err">e</a><a href="/slow">s</a>', url);
    const statuses = new Map([
      ['https://example.com/err', 500],
      ['https://example.com/slow', 0],
    ]);
    expect(checkBrokenLinks(page, statuses).map((i) => i.message)).toEqual([
      'Broken link: https://example.com/err (500)',
      'Broken link: https://example.com/slow (request failed)',
    ]);
  });

  it('ignores links that were never requested', () => {
    const page = parsePage('<a href="https://other.com/x">x</a>', url);
    expect(checkBrokenLinks(page, new Map())).toEqual([]);
  });

  it('reports a target once even when linked with different fragments', () => {
    const page = parsePage('<a href="/gone#a">a</a><a href="/gone#b">b</a>', url);
    const statuses = new Map([['https://example.com/gone', 404]]);
    expect(checkBrokenLinks(page, statuses)).toHaveLength(1);
  });
});
