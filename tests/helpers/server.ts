import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface Route {
  status?: number;
  type?: string;
  body?: string;
  delayMs?: number;
  // answer HEAD requests with 405 Method Not Allowed
  noHead?: boolean;
}

// Starts a local http server on a random port. Routes are keyed by path;
// a plain string is served as a 200 text/html page. Unknown paths give 404.
export async function startServer(routes: Record<string, string | Route>) {
  const requests: string[] = [];
  // same requests with the method, for example 'HEAD /a'
  const calls: string[] = [];
  let active = 0;
  let maxActive = 0;

  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    requests.push(path);
    active++;
    maxActive = Math.max(maxActive, active);

    calls.push(`${req.method} ${path}`);

    const entry = routes[path];
    let route: Route = typeof entry === 'string' ? { body: entry } : (entry ?? { status: 404 });
    if (route.noHead && req.method === 'HEAD') {
      route = { status: 405 };
    }
    const body = route.body ?? (route.status === 404 ? 'not found' : '');

    res.on('close', () => {
      active--;
    });
    setTimeout(() => {
      res.writeHead(route.status ?? 200, {
        'content-type': route.type ?? 'text/html',
        'content-length': Buffer.byteLength(body),
      });
      res.end(body);
    }, route.delayMs ?? 0);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    calls,
    maxActive: () => maxActive,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
