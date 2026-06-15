import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface Route {
  status?: number;
  type?: string;
  body?: string;
  delayMs?: number;
}

// Starts a local http server on a random port. Routes are keyed by path;
// a plain string is served as a 200 text/html page. Unknown paths give 404.
export async function startServer(routes: Record<string, string | Route>) {
  const requests: string[] = [];
  let active = 0;
  let maxActive = 0;

  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    requests.push(path);
    active++;
    maxActive = Math.max(maxActive, active);

    const entry = routes[path];
    const route: Route = typeof entry === 'string' ? { body: entry } : (entry ?? { status: 404 });
    const body = route.body ?? (route.status === 404 ? 'not found' : '');

    res.on('close', () => {
      active--;
    });
    setTimeout(() => {
      res.writeHead(route.status ?? 200, { 'content-type': route.type ?? 'text/html' });
      res.end(body);
    }, route.delayMs ?? 0);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    maxActive: () => maxActive,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
