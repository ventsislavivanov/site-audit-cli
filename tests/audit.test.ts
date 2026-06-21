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
