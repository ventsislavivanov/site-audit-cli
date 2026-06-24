import { afterEach, describe, expect, it } from 'vitest';
import { runAudit } from '../src/audit.js';
import { startServer } from './helpers/server.js';

describe('runAudit', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  const options = { depth: 2, maxPages: 50, timeout: 2000 };

  afterEach(async () => {
    await server.close();
  });

  it('runs every check on every crawled page', async () => {
    server = await startServer({
      '/': `<title>Home</title><meta name="description" content="Home page">
        <a href="/about">about</a><a href="/gone">gone</a>`,
      '/about': '<p>no title here</p><img src="/pic.png">',
      '/pic.png': { type: 'image/png', body: 'x'.repeat(1024) },
    });

    const report = await runAudit(server.url + '/', options);

    expect(report.pagesCrawled).toBe(2);
    const found = report.issues.map((i) => `${i.check}: ${i.url.replace(server.url, '')}`);
    expect(found).toContain('broken-links: /');
    expect(found).toContain('open-graph: /');
    expect(found).toContain('meta-tags: /about');
    expect(found).toContain('image-alt: /about');
    expect(found).not.toContain('meta-tags: /');
  });

  describe('links the crawler does not visit', () => {
    let other: Awaited<ReturnType<typeof startServer>>;

    afterEach(async () => {
      await other?.close();
    });

    const brokenMessages = (report: Awaited<ReturnType<typeof runAudit>>) =>
      report.issues.filter((i) => i.check === 'broken-links').map((i) => i.message);

    it('reports a broken external link', async () => {
      other = await startServer({ '/fine': 'ok' });
      server = await startServer({
        '/': `<title>Home</title>
          <a href="${other.url}/fine">fine</a><a href="${other.url}/dead">dead</a>`,
      });

      const report = await runAudit(server.url + '/', options);

      expect(brokenMessages(report)).toEqual([`Broken link: ${other.url}/dead (404)`]);
      expect(other.calls).toEqual(['HEAD /fine', 'HEAD /dead']);
    });

    it('reports a broken link beyond the depth limit', async () => {
      server = await startServer({
        '/': '<title>Home</title><a href="/a">a</a>',
        '/a': '<title>A</title><a href="/b">b</a><a href="/gone">gone</a>',
        '/b': '<title>B</title>',
      });

      const report = await runAudit(server.url + '/', { ...options, depth: 1 });

      expect(report.pagesCrawled).toBe(2);
      expect(brokenMessages(report)).toEqual([`Broken link: ${server.url}/gone (404)`]);
      // /b was only checked with HEAD, never crawled
      expect(server.calls).toContain('HEAD /b');
      expect(server.calls).not.toContain('GET /b');
    });

    it('reports a broken link beyond the page limit', async () => {
      server = await startServer({
        '/': '<title>Home</title><a href="/a">a</a><a href="/gone">gone</a>',
        '/a': '<title>A</title>',
      });

      const report = await runAudit(server.url + '/', { ...options, maxPages: 2 });

      expect(brokenMessages(report)).toEqual([`Broken link: ${server.url}/gone (404)`]);
    });

    it('checks a url shared by several pages only once', async () => {
      other = await startServer({});
      server = await startServer({
        '/': `<title>Home</title><a href="/two">two</a><a href="${other.url}/x">x</a>`,
        '/two': `<title>Two</title><a href="${other.url}/x#top">x</a>`,
      });

      const report = await runAudit(server.url + '/', options);

      expect(other.calls).toEqual(['HEAD /x']);
      // the broken link is still reported on both pages
      expect(brokenMessages(report)).toHaveLength(2);
    });

    it('does not request mailto, tel or javascript links', async () => {
      server = await startServer({
        '/': `<title>Home</title><a href="mailto:a@b.com">m</a>
          <a href="tel:+123">t</a><a href="javascript:void(0)">j</a>`,
      });

      const report = await runAudit(server.url + '/', options);

      expect(brokenMessages(report)).toEqual([]);
      expect(server.calls).toEqual(['GET /']);
    });

    it('falls back to GET for servers that refuse HEAD', async () => {
      other = await startServer({ '/picky': { body: 'ok', noHead: true } });
      server = await startServer({
        '/': `<title>Home</title><a href="${other.url}/picky">picky</a>`,
      });

      const report = await runAudit(server.url + '/', options);

      expect(brokenMessages(report)).toEqual([]);
      expect(other.calls).toEqual(['HEAD /picky', 'GET /picky']);
    });
  });

  it('gives a clean report for a good page', async () => {
    server = await startServer({
      '/': `<title>Home</title><meta name="description" content="Home page">
        <meta property="og:title" content="Home">
        <meta property="og:description" content="Home page">
        <meta property="og:image" content="https://example.com/a.png">`,
    });
    const report = await runAudit(server.url + '/', options);
    expect(report.issues).toEqual([]);
  });

  it('says why the start page cannot be loaded: HTTP error', async () => {
    server = await startServer({});
    await expect(runAudit(server.url + '/', options)).rejects.toThrow(
      `could not load ${server.url}/: HTTP 404`,
    );
  });

  it('says why the start page cannot be loaded: not HTML', async () => {
    server = await startServer({ '/': { type: 'application/json', body: '{}' } });
    await expect(runAudit(server.url + '/', options)).rejects.toThrow(
      'not an HTML page (application/json)',
    );
  });

  it('says why the start page cannot be loaded: connection refused', async () => {
    server = await startServer({});
    const closedUrl = server.url + '/';
    await server.close();
    await expect(runAudit(closedUrl, options)).rejects.toThrow('connection refused');
  });

  it('says why the start page cannot be loaded: timeout', async () => {
    server = await startServer({ '/': { body: '<p>slow</p>', delayMs: 500 } });
    await expect(runAudit(server.url + '/', { ...options, timeout: 100 })).rejects.toThrow(
      'timed out after 100 ms',
    );
  });

  it('rejects a start url that is not http(s)', async () => {
    server = await startServer({});
    await expect(runAudit('ftp://example.com/', options)).rejects.toThrow('invalid start url');
    await expect(runAudit('example.com', options)).rejects.toThrow('https://example.com');
  });
});
