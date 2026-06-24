import { afterEach, describe, expect, it } from 'vitest';
import { checkLink, fetchLinkStatuses } from '../src/linkStatus.js';
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
