import { afterEach, describe, expect, it } from 'vitest';
import { checkImageSize } from '../../src/checks/imageSize.js';
import { parsePage } from '../../src/parser.js';
import { startServer } from '../helpers/server.js';

describe('checkImageSize', () => {
  let server: Awaited<ReturnType<typeof startServer>>;

  afterEach(async () => {
    await server.close();
  });

  it('warns about an image above 300 KB', async () => {
    server = await startServer({
      '/big.png': { type: 'image/png', body: 'x'.repeat(400 * 1024) },
    });
    const url = server.url + '/';
    const page = parsePage('<img src="/big.png" alt="big">', url);

    expect(await checkImageSize(page, 2000)).toEqual([
      {
        check: 'image-size',
        severity: 'warning',
        url,
        message: `Large image: ${server.url}/big.png (400 KB)`,
      },
    ]);
  });

  it('accepts a small image', async () => {
    server = await startServer({
      '/small.png': { type: 'image/png', body: 'x'.repeat(10 * 1024) },
    });
    const page = parsePage('<img src="/small.png" alt="small">', server.url + '/');
    expect(await checkImageSize(page, 2000)).toEqual([]);
  });

  it('ignores images it cannot measure', async () => {
    server = await startServer({});
    const page = parsePage('<img src="/missing.png" alt="x">', server.url + '/');
    expect(await checkImageSize(page, 2000)).toEqual([]);
  });

  it('requests an image used twice, or on two pages, only once', async () => {
    server = await startServer({
      '/big.png': { type: 'image/png', body: 'x'.repeat(400 * 1024) },
    });
    const html = '<img src="/big.png" alt="a"><img src="/big.png" alt="b">';
    const cache = new Map<string, number | null>();

    const first = await checkImageSize(parsePage(html, server.url + '/one'), 2000, cache);
    const second = await checkImageSize(parsePage(html, server.url + '/two'), 2000, cache);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(server.requests).toEqual(['/big.png']);
  });
});
