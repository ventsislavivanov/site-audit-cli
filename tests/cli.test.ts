import { describe, expect, it, vi } from 'vitest';
import { parseArgs } from '../src/cli.js';

describe('parseArgs', () => {
  it('uses defaults when only a url is given', () => {
    expect(parseArgs(['https://example.com'])).toEqual({
      url: 'https://example.com',
      depth: 2,
      maxPages: 50,
      json: false,
      timeout: 10000,
    });
  });

  it('reads all options', () => {
    const options = parseArgs([
      'https://example.com',
      '--depth',
      '3',
      '--max-pages',
      '10',
      '--json',
      '--timeout',
      '5000',
    ]);
    expect(options).toEqual({
      url: 'https://example.com',
      depth: 3,
      maxPages: 10,
      json: true,
      timeout: 5000,
    });
  });

  it('prints help with examples and exit codes', () => {
    const chunks: string[] = [];
    const write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      chunks.push(String(chunk));
      return true;
    });
    try {
      expect(() => parseArgs(['--help'])).toThrow();
    } finally {
      write.mockRestore();
    }
    const help = chunks.join('');
    expect(help).toContain('--max-pages <n>');
    expect(help).toContain('Examples:');
    expect(help).toContain('Exit codes:');
  });

  it('rejects a missing url', () => {
    expect(() => parseArgs([])).toThrow();
  });

  it('rejects a non-numeric depth', () => {
    expect(() => parseArgs(['https://example.com', '--depth', 'abc'])).toThrow();
  });
});
