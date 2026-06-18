import type { Issue, Page } from '../types.js';

// A missing alt attribute is an error. An empty alt (alt="") is allowed,
// it is the correct way to mark a decorative image.
export function checkImageAlt(page: Page): Issue[] {
  return page.images
    .filter((image) => image.alt === null)
    .map((image) => ({
      check: 'image-alt',
      severity: 'error',
      url: page.url,
      message: `Image without alt: ${image.src}`,
    }));
}
