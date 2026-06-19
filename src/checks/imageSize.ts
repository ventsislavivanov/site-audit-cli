import type { Issue, Page } from '../types.js';

export const MAX_IMAGE_BYTES = 300 * 1024;

// Size in bytes from a HEAD request, or null if it cannot be determined.
async function getImageSize(src: string, timeout: number): Promise<number | null> {
  try {
    const res = await fetch(src, { method: 'HEAD', signal: AbortSignal.timeout(timeout) });
    const length = Number(res.headers.get('content-length'));
    return res.ok && length > 0 ? length : null;
  } catch {
    return null;
  }
}

// Warns about images larger than 300 KB. Sizes are looked up with HEAD
// requests, one image at a time. Pass the same `cache` for every page of a
// crawl so an image that appears on many pages is only requested once.
export async function checkImageSize(
  page: Page,
  timeout: number,
  cache = new Map<string, number | null>(),
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const srcs = new Set(page.images.map((image) => image.src));

  for (const src of srcs) {
    if (!cache.has(src)) {
      cache.set(src, await getImageSize(src, timeout));
    }
    const size = cache.get(src);
    if (size && size > MAX_IMAGE_BYTES) {
      issues.push({
        check: 'image-size',
        severity: 'warning',
        url: page.url,
        message: `Large image: ${src} (${Math.round(size / 1024)} KB)`,
      });
    }
  }

  return issues;
}
