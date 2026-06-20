import type { Report } from '../types.js';
import { summarize } from './summary.js';

export function formatJson(report: Report): string {
  return JSON.stringify(
    {
      startUrl: report.startUrl,
      pagesCrawled: report.pagesCrawled,
      summary: summarize(report.issues),
      issues: report.issues,
    },
    null,
    2,
  );
}
