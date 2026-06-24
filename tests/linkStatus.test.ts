import { afterEach, describe, expect, it } from 'vitest';
import { checkLink, fetchLinkStatuses, unvisitedLinks } from '../src/linkStatus.js';
import { parsePage } from '../src/parser.js';
import { startServer } from './helpers/server.js';

describe('checkLink', () => {
  let server: Awaited<ReturnType<typeof startServer>>;

  afterEach(async () => {
    await server.close();
  });

  it('returns the status of a HEAD request', async () => {
    server = await startServer({ '/ok': '<p>ok</p>' });
    expect(await checkLink(server.url + '/ok', 2000)).toBe(200);
    expect(await checkLink(server.url + '/missing', 2000)).toBe(404);
    expect(server.calls).toEqual(['HEAD /ok', 'HEAD /missing']);
  });

  it('falls back to GET when HEAD is not allowed', async () => {
    server = await startServer({ '/picky': { body: '<p>ok</p>', noHead: true } });
    expect(await checkLink(server.url + '/picky', 2000)).toBe(200);
    expect(server.calls).toEqual(['HEAD /picky', 'GET /picky']);
  });

  it('does not fall back to GET for other errors', async () => {
    server = await startServer({ '/err': { status: 500 } });
    expect(await checkLink(server.url + '/err', 2000)).toBe(500);
    expect(server.calls).toEqual(['HEAD /err']);
  });

  it('returns 0 on timeout', async () => {
    server = await startServer({ '/slow': { body: 'x', delayMs: 500 } });
    expect(await checkLink(server.url + '/slow', 100)).toBe(0);
  });

  it('returns 0 when the connection is refused', async () => {
    server = await startServer({});
    const closedUrl = server.url + '/';
    await server.close();
    expect(await checkLink(closedUrl, 2000)).toBe(0);
  });
});

describe('fetchLinkStatuses', () => {
  let server: Awaited<ReturnType<typeof startServer>>;

  afterEach(async () => {
    await server.close();
  });

  it('checks every distinct url once', async () => {
    server = await startServer({ '/a': 'a' });
    const a = server.url + '/a';
    const b = server.url + '/b';

    const statuses = await fetchLinkStatuses([a, b, a, b, a], 2000);

    expect(statuses).toEqual(
      new Map([
        [a, 200],
        [b, 404],
      ]),
    );
    expect(server.requests).toEqual(['/a', '/b']);
  });

  it('runs at most 3 requests at the same time', async () => {
    const routes: Record<string, { body: string; delayMs: number }> = {};
    const urls: string[] = [];
    for (let i = 0; i < 8; i++) routes[`/p${i}`] = { body: 'x', delayMs: 60 };
    server = await startServer(routes);
    for (let i = 0; i < 8; i++) urls.push(`${server.url}/p${i}`);

    const statuses = await fetchLinkStatuses(urls, 2000);

    expect(statuses.size).toBe(8);
    expect(server.maxActive()).toBe(3);
  });
});

describe('unvisitedLinks', () => {
  const url = 'https://example.com/';

  it('returns links that are not in the status map', () => {
    const page = parsePage('<a href="/seen">s</a><a href="/new">n</a>', url);
    const statuses = new Map([['https://example.com/seen', 200]]);
    expect(unvisitedLinks([page], statuses)).toEqual(['https://example.com/new']);
  });

  it('includes external links', () => {
    const page = parsePage('<a href="https://other.com/x">x</a>', url);
    expect(unvisitedLinks([page], new Map())).toEqual(['https://other.com/x']);
  });

  it('lists each url once across pages, ignoring fragments', () => {
    const one = parsePage('<a href="/x#a">x</a>', url);
    const two = parsePage('<a href="/x#b">x</a><a href="/x">x</a>', 'https://example.com/two');
    expect(unvisitedLinks([one, two], new Map())).toEqual(['https://example.com/x']);
  });

  it('skips mailto, tel and javascript links', () => {
    const html = `<a href="mailto:a@b.com">m</a>
      <a href="tel:123">t</a>
      <a href="javascript:void(0)">j</a>`;
    expect(unvisitedLinks([parsePage(html, url)], new Map())).toEqual([]);
  });
});
