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

  it('stops at the depth limit', async () => {
    server = await startServer({
      '/': '<a href="/a">a</a>',
      '/a': '<a href="/b">b</a>',
      '/b': '<a href="/c">c</a>',
      '/c': '<p>end</p>',
    });
    await crawl(server.url + '/', { ...options, depth: 2 });
    expect(server.requests).toEqual(['/', '/a', '/b']);
  });

  it('only fetches the start page at depth 0', async () => {
    server = await startServer({ '/': '<a href="/a">a</a>', '/a': '<p>a</p>' });
    await crawl(server.url + '/', { ...options, depth: 0 });
    expect(server.requests).toEqual(['/']);
  });

  it('stops at the page limit', async () => {
    server = await startServer({
      '/': '<a href="/a">a</a><a href="/b">b</a><a href="/c">c</a>',
      '/a': '<p>a</p>',
      '/b': '<p>b</p>',
      '/c': '<p>c</p>',
    });
    const { pages } = await crawl(server.url + '/', { ...options, maxPages: 2 });
    expect(pages).toHaveLength(2);
    expect(server.requests).toEqual(['/', '/a']);
  });

  it('fetches at most 3 pages at the same time', async () => {
    const routes: Record<string, { body: string; delayMs: number }> = {
      '/': {
        body: Array.from({ length: 8 }, (_, i) => `<a href="/p${i}">p</a>`).join(''),
        delayMs: 0,
      },
    };
    for (let i = 0; i < 8; i++) routes[`/p${i}`] = { body: '<p>x</p>', delayMs: 60 };
    server = await startServer(routes);

    const { pages } = await crawl(server.url + '/', options);
    expect(pages).toHaveLength(9);
    expect(server.maxActive()).toBe(3);
  });

  it('records a 404 but does not treat it as a page', async () => {
    server = await startServer({ '/': '<a href="/missing">gone</a>' });
    const { pages, statuses } = await crawl(server.url + '/', options);
    expect(pages).toHaveLength(1);
    expect(statuses.get(server.url + '/missing')).toBe(404);
  });

  it('records status 0 when a request times out', async () => {
    server = await startServer({
      '/': '<a href="/slow">slow</a><a href="/fast">fast</a>',
      '/slow': { body: '<p>slow</p>', delayMs: 500 },
      '/fast': '<p>fast</p>',
    });
    const { pages, statuses } = await crawl(server.url + '/', { ...options, timeout: 100 });
    expect(statuses.get(server.url + '/slow')).toBe(0);
    expect(pages.map((p) => p.url)).toEqual([server.url + '/', server.url + '/fast']);
  });

  it('does not parse or follow non-html responses', async () => {
    server = await startServer({
      '/': '<a href="/data.json">data</a>',
      '/data.json': { type: 'application/json', body: '{"a":"<a href=\'/secret\'>x</a>"}' },
    });
    const { pages, statuses } = await crawl(server.url + '/', options);
    expect(pages).toHaveLength(1);
    expect(statuses.get(server.url + '/data.json')).toBe(200);
    expect(server.requests).not.toContain('/secret');
  });

  it('survives a start url that cannot be reached', async () => {
    server = await startServer({});
    const { pages, statuses } = await crawl('http://127.0.0.1:1/', options);
    expect(pages).toEqual([]);
    expect(statuses.get('http://127.0.0.1:1/')).toBe(0);
  });

  it('throws on an invalid start url', async () => {
    server = await startServer({});
    await expect(crawl('not a url', options)).rejects.toThrow('invalid start url');
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
