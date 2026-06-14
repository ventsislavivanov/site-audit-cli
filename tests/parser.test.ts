import { describe, expect, it } from 'vitest';
import { parsePage } from '../src/parser.js';

const url = 'https://example.com/';

describe('parsePage: title and meta', () => {
  it('reads the title and meta description', () => {
    const html = `<html><head>
      <title>  Home page </title>
      <meta name="description" content="A short description">
    </head><body></body></html>`;
    const page = parsePage(html, url);
    expect(page.title).toBe('Home page');
    expect(page.metaDescription).toBe('A short description');
  });

  it('returns null when they are missing or empty', () => {
    const page = parsePage('<html><head><title> </title></head></html>', url);
    expect(page.title).toBeNull();
    expect(page.metaDescription).toBeNull();
  });

  it('keeps the url and status it was given', () => {
    const page = parsePage('<p>hi</p>', url, 404);
    expect(page.url).toBe(url);
    expect(page.status).toBe(404);
  });

  it('does not crash on an empty document', () => {
    const page = parsePage('', url);
    expect(page.title).toBeNull();
  });
});

describe('parsePage: open graph', () => {
  it('collects og tags by property name', () => {
    const html = `<head>
      <meta property="og:title" content="Hello">
      <meta property="og:image" content="https://example.com/a.png">
      <meta property="twitter:card" content="summary">
    </head>`;
    expect(parsePage(html, url).ogTags).toEqual({
      'og:title': 'Hello',
      'og:image': 'https://example.com/a.png',
    });
  });

  it('ignores og tags with no content', () => {
    const html = '<head><meta property="og:title" content=""><meta property="og:image"></head>';
    expect(parsePage(html, url).ogTags).toEqual({});
  });
});

describe('parsePage: links', () => {
  it('resolves relative links against the page url', () => {
    const html = '<a href="/about">a</a><a href="contact.html">b</a><a href="../up">c</a>';
    const page = parsePage(html, 'https://example.com/docs/index.html');
    expect(page.links).toEqual([
      'https://example.com/about',
      'https://example.com/docs/contact.html',
      'https://example.com/up',
    ]);
  });

  it('keeps external links and removes duplicates', () => {
    const html = '<a href="https://other.com/">x</a><a href="https://other.com/">y</a>';
    expect(parsePage(html, url).links).toEqual(['https://other.com/']);
  });

  it('skips mailto, tel and javascript links', () => {
    const html = `<a href="mailto:a@b.com">m</a>
      <a href="tel:123">t</a>
      <a href="javascript:void(0)">j</a>`;
    expect(parsePage(html, url).links).toEqual([]);
  });

  it('skips anchors without href', () => {
    expect(parsePage('<a name="top">x</a>', url).links).toEqual([]);
  });
});
