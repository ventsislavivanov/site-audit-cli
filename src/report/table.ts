import type { Issue, Report } from '../types.js';
import { summarize } from './summary.js';

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function summaryLine(report: Report): string {
  const { errors, warnings } = summarize(report.issues);
  return `Crawled ${plural(report.pagesCrawled, 'page')}: ${plural(errors, 'error')}, ${plural(warnings, 'warning')}.`;
}

// Human-readable report, grouped by page. Pages without issues are left out.
export function formatTable(report: Report): string {
  const byPage = new Map<string, Issue[]>();
  for (const issue of report.issues) {
    const list = byPage.get(issue.url) ?? [];
    list.push(issue);
    byPage.set(issue.url, list);
  }

  const checkWidth = Math.max(0, ...report.issues.map((issue) => issue.check.length));
  const lines: string[] = [];

  for (const [url, issues] of byPage) {
    lines.push(url);
    // errors first; sort is stable so the check order is kept inside a group
    const sorted = [...issues].sort(
      (a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'),
    );
    for (const issue of sorted) {
      lines.push(
        `  ${issue.severity.padEnd(7)}  ${issue.check.padEnd(checkWidth)}  ${issue.message}`,
      );
    }
    lines.push('');
  }

  if (report.issues.length === 0) {
    lines.push('No issues found.', '');
  }
  lines.push(summaryLine(report));

  return lines.join('\n');
}
