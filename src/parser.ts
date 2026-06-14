import * as cheerio from 'cheerio';
import type { Page } from './types.js';

function clean(text: string | undefined): string | null {
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
}

// Resolve a href or src against the page url. Returns null for values
// that are not http(s) URLs, such as mailto:, tel: or javascript:.
function toAbsolute(value: string | undefined, base: string): string | null {
  if (!value) return null;
  try {
    const resolved = new URL(value.trim(), base);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    return resolved.href;
  } catch {
    return null;
  }
}

export function parsePage(html: string, url: string, status = 200): Page {
  const $ = cheerio.load(html);

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr('property');
    const content = clean($(el).attr('content'));
    if (property && content) {
      ogTags[property] = content;
    }
  });

  const links = new Set<string>();
  $('a[href]').each((_, el) => {
    const link = toAbsolute($(el).attr('href'), url);
    if (link) links.add(link);
  });

  return {
    url,
    status,
    title: clean($('head title').first().text()),
    metaDescription: clean($('meta[name="description"]').first().attr('content')),
    ogTags,
    links: [...links],
    images: [],
  };
}
