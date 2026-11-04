// The preload installs clocks before any game/server module captures Date.now or creates a timer.
import http from 'node:http';
import { clock } from './server-clock.ts';
import { createService, loadConfig } from '../../server/src/server.ts';

const server = createService(loadConfig(JSON.parse(process.env.LOOK_SERVER_ENV!), { log: () => {} }));
const port = await server.listen(0);
const control = http.createServer((req, res) => void handleClock(req, res));
async function handleClock(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.url !== '/clock') {
    res.writeHead(404).end();
    return;
  }
  try {
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 100) throw new Error('clock request too large');
      }
      clock.set(Number(body));
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(clock.read()));
  } catch (e) {
    res.writeHead(400).end(String(e));
  }
}
await new Promise<void>((resolve) => control.listen(0, '127.0.0.1', resolve));
const address = control.address() as { port: number };
process.send!({ port, clockUrl: `http://127.0.0.1:${address.port}/clock` });
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  clock.set(1);
  control.close();
  await server.close({ save: false });
  process.exit(0);
}
process.on('message', () => void close());
process.on('disconnect', () => void close());
process.on('SIGTERM', () => void close());
