// Browserless live deployment probe. Only its smoke room is writable; no world edits or real rooms.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { WS_PROTOCOL, roomUrl, decode, encode, type WireMsg } from '../src/net/ws-wire.ts';

const args = process.argv.slice(2);
// Reuse the server's pinned ws dependency; its Origin option matches a real site's upgrade.
const WebSocket = createRequire(new URL('../server/package.json', import.meta.url))(
  'ws',
) as typeof import('ws').WebSocket;
const option = (name: string) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
const site = new URL(option('--url') || 'https://boogle.club/');
const expected = option('--build');
const start = performance.now();
const sockets: import('ws').WebSocket[] = [];
const deadline = setTimeout(() => {
  console.error('FAIL live smoke exceeded 60 seconds');
  process.exit(1);
}, 60000);
async function get(url: URL, contentType: RegExp) {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  assert.equal(res.status, 200, `${url}: HTTP ${res.status}`);
  assert.match(res.headers.get('content-type') || '', contentType, `${url}: content type`);
  return res;
}
type Version = { build: string; serverBuild: string; server: string };
async function connect(server: string, room: string, build: string) {
  const id = randomBytes(8).toString('hex');
  const ws = new WebSocket(
    roomUrl(server, room, { self: id, pid: id, key: randomBytes(16).toString('hex'), b: build }),
    WS_PROTOCOL,
    { origin: site.origin },
  );
  sockets.push(ws);
  const messages: WireMsg[] = [];
  let failure = '';
  ws.addEventListener('message', (event) => {
    const m = decode(event.data);
    if (m) messages.push(m);
  });
  ws.addEventListener('error', () => {
    failure = 'WebSocket error';
  });
  ws.addEventListener('close', (event) => {
    failure = `WebSocket closed ${event.code}: ${event.reason}`;
  });
  async function wait(predicate: (m: WireMsg) => boolean) {
    const until = performance.now() + 5000;
    while (performance.now() < until) {
      if (failure) throw new Error(failure);
      const found = messages.find(predicate);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`WebSocket timed out: ${JSON.stringify(messages.map((m) => m.t))}`);
  }
  const welcome = await wait((m) => m.t === 'welcome');
  assert.equal(welcome.v, 1);
  await wait((m) => m.t === 'list' && m.last === true);
  return { id, ws, wait };
}
try {
  const html = await (await get(site, /text\/html/)).text();
  const version = (await (await get(new URL('version.json', site), /application\/json/)).json()) as Version;
  assert.equal(typeof version.build, 'string');
  if (expected) assert.equal(version.build, expected, 'Pages deployed commit');
  assert.ok(html.includes(`name="boogle-build" content="${version.build}"`), 'HTML and version.json build agree');
  const assets = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)]
    .map((m) => new URL(m[1]!, site))
    .filter((u) => /\.(?:js|css)$/.test(u.pathname));
  assert.ok(
    assets.some((u) => u.pathname.endsWith('.js')),
    'HTML has an entry script',
  );
  await Promise.all(
    assets.map(async (url) => {
      assert.equal(url.origin, site.origin, 'entry asset is same-origin');
      const res = await get(url, url.pathname.endsWith('.css') ? /text\/css/ : /(?:javascript|ecmascript)/);
      assert.ok((await res.arrayBuffer()).byteLength > 0, `${url}: nonempty`);
    }),
  );
  const server = option('--server') || version.server;
  assert.ok(server, 'version.json names the deployed WebSocket server');
  assert.ok(version.serverBuild, 'version.json names the expected server source commit');
  // Server and Pages deploy concurrently. Allow their identities to converge within the minute budget.
  let actual = '';
  let versionError = '';
  while (performance.now() - start < 45000) {
    try {
      const data = (await (await get(new URL('/version', server), /application\/json/)).json()) as { build?: string };
      actual = data.build || '';
      if (actual === version.serverBuild) break;
    } catch (error) {
      versionError = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.equal(actual, version.serverBuild, `server deployed source commit (${versionError})`);
  // Seven isolated rooms bound stored-room growth and never touch boogle or a friend's room.
  const room = `smoke-node-${new Date().getUTCDay()}`;
  const a = await connect(server, room, version.build);
  const b = await connect(server, room, version.build);
  // A cosmetic action traverses the real room relay, then B acknowledges through that same relay.
  const send = (ws: import('ws').WebSocket) => ws.send(encode({ t: 'm', d: { t: 'honk', v: 0 } }));
  const honkFrom = (id: string) => (m: WireMsg) =>
    m.t === 'm' && m.from === id && (m.d as { t?: string } | null)?.t === 'honk';
  send(a.ws);
  await b.wait(honkFrom(a.id));
  send(b.ws);
  await a.wait(honkFrom(b.id));
  console.log(
    `PASS live smoke: Pages ${version.build}; server ${actual}; ${assets.length} entry assets; ${room} action round-trip; ${((performance.now() - start) / 1000).toFixed(2)}s`,
  );
} catch (error) {
  console.error('FAIL live smoke:', error);
  process.exitCode = 1;
} finally {
  for (const ws of sockets) ws.terminate();
  clearTimeout(deadline);
}
