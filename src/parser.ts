import * as cheerio from 'cheerio';
import type { Page } from './types.js';

function clean(text: string | undefined): string | null {
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
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

  return {
    url,
    status,
    title: clean($('head title').first().text()),
    metaDescription: clean($('meta[name="description"]').first().attr('content')),
    ogTags,
    links: [],
    images: [],
  };
}
