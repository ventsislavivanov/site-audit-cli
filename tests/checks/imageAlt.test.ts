import { describe, expect, it } from 'vitest';
import { checkImageAlt } from '../../src/checks/imageAlt.js';
import { parsePage } from '../../src/parser.js';

const url = 'https://example.com/';

describe('checkImageAlt', () => {
  it('reports nothing when every image has alt text', () => {
    const html = '<img src="/a.png" alt="Logo"><img src="/b.png" alt="Photo">';
    expect(checkImageAlt(parsePage(html, url))).toEqual([]);
  });

  it('reports an image with no alt attribute as an error', () => {
    const html = '<img src="/a.png" alt="Logo"><img src="/b.png">';
    expect(checkImageAlt(parsePage(html, url))).toEqual([
      {
        check: 'image-alt',
        severity: 'error',
        url,
        message: 'Image without alt: https://example.com/b.png',
      },
    ]);
  });

  it('accepts an empty alt for decorative images', () => {
    expect(checkImageAlt(parsePage('<img src="/line.png" alt="">', url))).toEqual([]);
  });

  it('reports nothing on a page without images', () => {
    expect(checkImageAlt(parsePage('<p>text</p>', url))).toEqual([]);
  });
});
