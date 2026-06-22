import { describe, expect, it } from 'vitest';
import { describeFetchError } from '../src/errors.js';

// fetch() reports network problems as TypeError('fetch failed') with the
// real reason in err.cause
function fetchFailed(code: string): Error {
  return new TypeError('fetch failed', { cause: Object.assign(new Error('x'), { code }) });
}

describe('describeFetchError', () => {
  it('explains a timeout', () => {
    const err = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    expect(describeFetchError(err, 5000)).toBe('timed out after 5000 ms');
  });

  it('explains a DNS failure', () => {
    expect(describeFetchError(fetchFailed('ENOTFOUND'), 1000)).toBe('host not found');
    expect(describeFetchError(fetchFailed('EAI_AGAIN'), 1000)).toBe('DNS lookup failed');
  });

  it('explains a refused or reset connection', () => {
    expect(describeFetchError(fetchFailed('ECONNREFUSED'), 1000)).toBe('connection refused');
    expect(describeFetchError(fetchFailed('ECONNRESET'), 1000)).toBe('connection reset');
  });

  it('explains a certificate problem', () => {
    expect(describeFetchError(fetchFailed('CERT_HAS_EXPIRED'), 1000)).toBe(
      'TLS certificate error (CERT_HAS_EXPIRED)',
    );
  });

  it('explains a port that fetch refuses to use', () => {
    const err = new TypeError('fetch failed', { cause: new Error('bad port') });
    expect(describeFetchError(err, 1000)).toBe('port is blocked by fetch');
  });

  it('falls back to the cause message, then the error message', () => {
    const withCause = new TypeError('fetch failed', { cause: new Error('something odd') });
    expect(describeFetchError(withCause, 1000)).toBe('something odd');
    expect(describeFetchError(new Error('plain'), 1000)).toBe('plain');
    expect(describeFetchError('text', 1000)).toBe('text');
  });
});
