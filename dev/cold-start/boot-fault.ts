// Optional loopback response interception for the existing broker's production stack.
// The trusted broker cannot accept new Playwright routes; its ordinary look action drives a fresh iframe instead.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export async function bootFaultProxy(upstream: string, dist: string, report: string) {
  // The HTML entry and dynamic game both have main- names. Target the game, not the bootstrap script.
  const chunks = fs
    .readdirSync(path.join(dist, 'assets'))
    .filter(
      (file) =>
        /^main-.*\.js$/.test(file) &&
        fs.readFileSync(path.join(dist, 'assets', file), 'utf8').includes('[boot] startup failed'),
    );
  if (chunks.length !== 1) throw new Error('Identify exactly one dynamic game chunk before injecting faults');
  const gameChunk = `/assets/${chunks[0]}`;
  let mode = '';
  const requests: { url: string; status: number; at: number }[] = [];
  const proxy = http.createServer((req, res) => {
    const url = new URL(req.url!, upstream);
    if (url.pathname === '/__boot_fault') {
      if (req.method === 'POST') {
        const next = url.searchParams.get('mode') ?? '';
        if (!/^(wasm|chunk)-(once|always)$/.test(next)) {
          res.writeHead(400).end();
          return;
        }
        mode = next;
        requests.length = 0;
      }
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ mode, requests }));
      return;
    }
    const target = mode.startsWith('wasm')
      ? /\/rapier_wasm3d_bg-[^/]+\.wasm$/.test(url.pathname)
      : mode.startsWith('chunk') && url.pathname === gameChunk;
    // Chromium can refetch a failed modulepreload on import(). Fail both requests to exercise our reload.
    const fail = target && (mode.endsWith('always') || requests.length < (mode.startsWith('chunk') ? 2 : 1));
    if (target) {
      requests.push({ url: url.pathname, status: fail ? 503 : 200, at: Date.now() });
      fs.writeFileSync(report, JSON.stringify({ mode, requests }, null, 2));
    }
    if (fail) {
      res.writeHead(503, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
      res.end('Injected temporary outage');
      return;
    }
    const forward = http.request(url, { method: req.method, headers: { ...req.headers, host: url.host } }, (reply) => {
      res.writeHead(reply.statusCode!, { ...reply.headers, 'cache-control': 'no-store' });
      reply.pipe(res);
    });
    forward.on('error', () => res.writeHead(502).end());
    req.pipe(forward);
  });
  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address();
  if (!address || typeof address === 'string') throw new Error('No fault proxy port');
  return {
    base: `http://127.0.0.1:${address.port}/`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        proxy.closeAllConnections();
        proxy.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
