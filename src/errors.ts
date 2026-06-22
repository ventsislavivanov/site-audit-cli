// Turns the error thrown by fetch() into a short message for the user.
// Node wraps the real reason in err.cause, for example
// TypeError('fetch failed') with cause.code === 'ECONNREFUSED'.
export function describeFetchError(err: unknown, timeout: number): string {
  if (err instanceof Error && err.name === 'TimeoutError') {
    return `timed out after ${timeout} ms`;
  }

  const cause = err instanceof Error ? err.cause : undefined;
  const code = (cause as { code?: string } | undefined)?.code ?? '';

  if (code === 'ENOTFOUND') return 'host not found';
  if (code === 'EAI_AGAIN') return 'DNS lookup failed';
  if (code === 'ECONNREFUSED') return 'connection refused';
  if (code === 'ECONNRESET') return 'connection reset';
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code)) return `TLS certificate error (${code})`;

  // fetch refuses ports that are used by other protocols, such as 25 or 6667
  if (cause instanceof Error && cause.message === 'bad port') return 'port is blocked by fetch';
  if (cause instanceof Error) return cause.message;
  return err instanceof Error ? err.message : String(err);
}
