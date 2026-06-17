import { describe, expect, it } from 'vitest';
import { checkOpenGraph } from '../../src/checks/openGraph.js';
import { parsePage } from '../../src/parser.js';

const url = 'https://example.com/';

describe('checkOpenGraph', () => {
  it('reports nothing when all three tags are present', () => {
    const html = `<meta property="og:title" content="Home">
      <meta property="og:description" content="Welcome">
      <meta property="og:image" content="https://example.com/a.png">`;
    expect(checkOpenGraph(parsePage(html, url))).toEqual([]);
  });

  it('reports each missing tag as a warning', () => {
    const html = '<meta property="og:title" content="Home">';
    expect(checkOpenGraph(parsePage(html, url))).toEqual([
      { check: 'open-graph', severity: 'warning', url, message: 'Missing og:description' },
      { check: 'open-graph', severity: 'warning', url, message: 'Missing og:image' },
    ]);
  });

  it('treats a tag with empty content as missing', () => {
    const html = `<meta property="og:title" content="">
      <meta property="og:description" content="Welcome">
      <meta property="og:image" content="https://example.com/a.png">`;
    expect(checkOpenGraph(parsePage(html, url)).map((i) => i.message)).toEqual([
      'Missing og:title',
    ]);
  });

  it('reports all three on a page with none', () => {
    expect(checkOpenGraph(parsePage('<p>hi</p>', url))).toHaveLength(3);
  });
});
