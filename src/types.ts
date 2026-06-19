export type Severity = 'error' | 'warning';

export interface Issue {
  check: string;
  severity: Severity;
  url: string;
  message: string;
}

export interface PageImage {
  // absolute URL
  src: string;
  // null when the attribute is missing, '' when it is present but empty
  alt: string | null;
}

export interface Page {
  url: string;
  status: number;
  title: string | null;
  metaDescription: string | null;
  // keys are the full property names, for example 'og:title'
  ogTags: Record<string, string>;
  // absolute http(s) URLs
  links: string[];
  images: PageImage[];
}

export interface Report {
  startUrl: string;
  pagesCrawled: number;
  issues: Issue[];
}
