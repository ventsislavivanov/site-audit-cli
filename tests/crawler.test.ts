import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../src/crawler.js';

describe('normalizeUrl', () => {
  const base = 'https://example.com/docs/page.html';

  it('resolves relative urls', () => {
    expect(normalizeUrl('/about', base)).toBe('https://example.com/about');
    expect(normalizeUrl('other.html', base)).toBe('https://example.com/docs/other.html');
  });

  it('strips the fragment', () => {
    expect(normalizeUrl('/about#team', base)).toBe('https://example.com/about');
    expect(normalizeUrl('#top', base)).toBe('https://example.com/docs/page.html');
  });

  it('keeps the query string', () => {
    expect(normalizeUrl('/search?q=a#x', base)).toBe('https://example.com/search?q=a');
  });

  it('returns null for non-http urls and garbage', () => {
    expect(normalizeUrl('mailto:a@b.com', base)).toBeNull();
    expect(normalizeUrl('http://', base)).toBeNull();
  });
});
