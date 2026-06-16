import { afterEach, describe, expect, it } from 'vitest';
import { crawl, normalizeUrl } from '../src/crawler.js';
import { startServer } from './helpers/server.js';

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

describe('crawl', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  const options = { depth: 5, maxPages: 50, timeout: 2000 };

  afterEach(async () => {
    await server.close();
  });

  it('follows relative links and parses each page', async () => {
    server = await startServer({
      '/': '<title>Home</title><a href="/about">About</a>',
      '/about': '<title>About</title>',
    });
    const { pages } = await crawl(server.url + '/', options);
    expect(pages.map((p) => p.title)).toEqual(['Home', 'About']);
  });

  it('ignores links to other origins', async () => {
    server = await startServer({
      '/': '<a href="http://127.0.0.1:1/x">other</a><a href="/a">a</a>',
      '/a': '<p>a</p>',
    });
    const { statuses } = await crawl(server.url + '/', options);
    expect([...statuses.keys()]).toEqual([server.url + '/', server.url + '/a']);
  });

  it('visits each page once even with loops and fragments', async () => {
    server = await startServer({
      '/': '<a href="/a">a</a><a href="/a#top">a again</a>',
      '/a': '<a href="/">home</a><a href="/a">self</a><a href="/#x">home 2</a>',
    });
    await crawl(server.url + '/', options);
    expect(server.requests).toEqual(['/', '/a']);
  });
});
