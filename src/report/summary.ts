import type { Issue } from '../types.js';

export interface Summary {
  errors: number;
  warnings: number;
}

export function summarize(issues: Issue[]): Summary {
  return {
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
  };
}

// 0 when there are no errors, 1 when there is at least one.
// Warnings do not fail the run.
export function exitCodeFor(issues: Issue[]): 0 | 1 {
  return summarize(issues).errors > 0 ? 1 : 0;
}
