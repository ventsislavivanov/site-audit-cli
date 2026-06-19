import { describe, expect, it } from 'vitest';
import { exitCodeFor, summarize } from '../../src/report/summary.js';
import type { Issue } from '../../src/types.js';

function issue(severity: Issue['severity']): Issue {
  return { check: 'test', severity, url: 'https://example.com/', message: 'x' };
}

describe('summarize', () => {
  it('counts errors and warnings', () => {
    const issues = [issue('error'), issue('warning'), issue('warning')];
    expect(summarize(issues)).toEqual({ errors: 1, warnings: 2 });
  });

  it('returns zeros for no issues', () => {
    expect(summarize([])).toEqual({ errors: 0, warnings: 0 });
  });
});

describe('exitCodeFor', () => {
  it('is 0 with no issues', () => {
    expect(exitCodeFor([])).toBe(0);
  });

  it('is 0 with only warnings', () => {
    expect(exitCodeFor([issue('warning')])).toBe(0);
  });

  it('is 1 when there is an error', () => {
    expect(exitCodeFor([issue('warning'), issue('error')])).toBe(1);
  });
});
