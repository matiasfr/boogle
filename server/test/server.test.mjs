import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.js';

async function start(env = {}, overrides = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-test-'));
  const cfg = loadConfig({ DATA_DIR: dataDir, ...env }, { log: () => {}, ...overrides });
  const svc = createService(cfg);
  const port = await svc.listen(0);
  const base = `http://127.0.0.1:${port}`;
  return {
    base,
    port,
    dataDir,
    svc,
    async stop() {
      await svc.close();
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}

test('healthz', async () => {
  const s = await start();
  try {
    const r = await fetch(`${s.base}/healthz`);
    assert.equal(r.status, 200);
    assert.equal(await r.text(), 'ok');
  } finally {
    await s.stop();
  }
});

const report = (base, body, type = 'text/plain') =>
  fetch(`${base}/report`, {
    method: 'POST',
    headers: { 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const today = () => new Date().toISOString().slice(0, 10);

test('report: stored as one JSON line per report, cleaned and truncated', async () => {
  const s = await start();
  try {
    const day = today(); // before the POST, so a run across midnight UTC still finds the file
    let r = await report(s.base, { room: 'beach', kind: 'error', detail: 'x'.repeat(2000), tick: 7, ua: 'Chrome 130' });
    assert.equal(r.status, 204);
    r = await report(
      s.base,
      [
        { room: 'beach', kind: 'connect', detail: { phase: 'join', hadTurn: false, nested: { no: 1 } }, extra: 'drop' },
        { room: 'beach', kind: 'desync', detail: 'water', tick: 120 },
      ],
      'application/json',
    );
    assert.equal(r.status, 204);
    const lines = (await fs.readFile(path.join(s.dataDir, 'reports', `${day}.jsonl`), 'utf8')).trim().split('\n');
    const rows = lines.map((l) => JSON.parse(l));
    assert.equal(rows.length, 3);
    assert.ok(rows.every((x) => typeof x.at === 'string' && x.room === 'beach'));
    assert.equal(rows[0].detail.length, 500);
    assert.equal(rows[0].tick, 7);
    assert.deepEqual(rows[1].detail, { phase: 'join', hadTurn: false });
    assert.equal(rows[1].extra, undefined);
    assert.equal(rows[2].kind, 'desync');
  } finally {
    await s.stop();
  }
});

test('report: invalid kind/room/body 400, oversize 413', async () => {
  const s = await start();
  try {
    assert.equal((await report(s.base, { room: 'beach', kind: 'party', detail: '' })).status, 400);
    assert.equal((await report(s.base, { room: 'Bad Room', kind: 'error', detail: '' })).status, 400);
    assert.equal((await report(s.base, [])).status, 400);
    assert.equal((await report(s.base, [{ room: 'a', kind: 'error' }, 'nope'])).status, 400);
    assert.equal((await report(s.base, '{nope')).status, 400);
    assert.equal((await report(s.base, { room: 'a', kind: 'error', detail: 'x'.repeat(9000) })).status, 413);
  } finally {
    await s.stop();
  }
});

test('report: playtest verdicts keep their own shape and a longer note', async () => {
  const s = await start();
  try {
    const ok = {
      proto: 'hero',
      variant: 'crawl',
      verdict: 'no',
      note: 'n'.repeat(1500),
      counts: { runs: 3, seconds: 90, x: 'no' },
      trace: 'verb in 4 s',
      build: 'abc123',
    };
    assert.equal((await report(s.base, { room: 'proto-hero', kind: 'playtest', detail: ok })).status, 204);
    for (const bad of [{ ...ok, verdict: 'maybe' }, { ...ok, proto: '' }, 'just text'])
      assert.equal((await report(s.base, { room: 'a', kind: 'playtest', detail: bad })).status, 400);
    const line = JSON.parse(await fs.readFile(path.join(s.dataDir, 'reports', `${today()}.jsonl`), 'utf8'));
    assert.equal(line.detail.note.length, 1000);
    assert.deepEqual(line.detail.counts, { runs: 3, seconds: 90 });
    assert.equal(line.detail.verdict, 'no');
    assert.equal(line.detail.variant, 'crawl');
  } finally {
    await s.stop();
  }
});

test('report: per-IP rate limit and daily size cap', async () => {
  let s = await start({ REPORT_RATE_PER_MIN: '2' });
  try {
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await report(s.base, { room: 'a', kind: 'error', detail: 'e' })).status);
    assert.deepEqual(codes, [204, 204, 429]);
  } finally {
    await s.stop();
  }
  s = await start({ REPORT_MAX_BYTES_PER_DAY: '600' });
  try {
    const body = { room: 'a', kind: 'error', detail: 'x'.repeat(150) };
    assert.equal((await report(s.base, body)).status, 204);
    assert.equal((await report(s.base, body)).status, 204);
    assert.equal((await report(s.base, body)).status, 507);
  } finally {
    await s.stop();
  }
});

test('report: the first write of a day deletes report files older than 30 days', async () => {
  const s = await start();
  try {
    const dir = path.join(s.dataDir, 'reports');
    const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    await fs.mkdir(dir, { recursive: true });
    for (const name of [`${daysAgo(40)}.jsonl`, `${daysAgo(5)}.jsonl`, 'notes.txt']) {
      await fs.writeFile(path.join(dir, name), '{}\n');
    }
    assert.equal((await report(s.base, { room: 'a', kind: 'error', detail: 'e' })).status, 204);
    const left = (await fs.readdir(dir)).sort();
    assert.ok(!left.includes(`${daysAgo(40)}.jsonl`));
    assert.ok(left.includes(`${daysAgo(5)}.jsonl`) && left.includes('notes.txt'));
  } finally {
    await s.stop();
  }
});

test('reports: GET needs REPORT_TOKEN and the bearer token', async () => {
  let s = await start();
  try {
    assert.equal((await fetch(`${s.base}/reports`)).status, 404);
  } finally {
    await s.stop();
  }
  s = await start({ REPORT_TOKEN: 'tok' });
  try {
    const day = today();
    await report(s.base, { room: 'a', kind: 'snapshot', detail: { from: 'peer', reason: 'parse' } });
    const get = (q, auth) => fetch(`${s.base}/reports${q}`, { headers: auth ? { authorization: auth } : {} });
    assert.equal((await get('')).status, 401);
    assert.equal((await get('', 'Bearer nope')).status, 401);
    assert.equal((await get('?day=yesterday', 'Bearer tok')).status, 400);
    const r = await get(`?day=${day}`, 'Bearer tok');
    assert.equal(r.status, 200);
    assert.deepEqual(JSON.parse((await r.text()).trim()).detail, { from: 'peer', reason: 'parse' });
    const empty = await get('?day=2000-01-01', 'Bearer tok');
    assert.equal(empty.status, 200);
    assert.equal(await empty.text(), '');
  } finally {
    await s.stop();
  }
});

test('CORS: default *, and allow-list', async () => {
  let s = await start();
  try {
    const r = await fetch(`${s.base}/healthz`, { headers: { origin: 'https://x.example' } });
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const pre = await fetch(`${s.base}/report`, {
      method: 'OPTIONS',
      headers: { origin: 'https://x.example', 'access-control-request-method': 'POST' },
    });
    assert.equal(pre.status, 204);
    assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
  } finally {
    await s.stop();
  }

  s = await start({ ALLOWED_ORIGINS: 'https://good.example,https://also.example' });
  try {
    for (const p of ['/healthz', '/rooms/a/snapshot', '/report']) {
      const good = await fetch(`${s.base}${p}`, { headers: { origin: 'https://good.example' } });
      assert.equal(good.headers.get('access-control-allow-origin'), 'https://good.example', p);
      const bad = await fetch(`${s.base}${p}`, { headers: { origin: 'https://evil.example' } });
      assert.equal(bad.headers.get('access-control-allow-origin'), null, p);
    }
  } finally {
    await s.stop();
  }
});

// Upgrades go through one router (src/host/upgrade.ts): room sockets at /room/:id, anything else 404.

test('snapshot: GET serves a room the server saved, 404 for none, 400 for a bad id; no uploads', async () => {
  const s = await start();
  try {
    const doc = { tick: 10, writerId: 'server', data: { tick: 10 }, updatedAt: 'x' };
    await fs.writeFile(path.join(s.dataDir, 'garden-1.json'), JSON.stringify(doc));
    assert.deepEqual(await (await fetch(`${s.base}/rooms/garden-1/snapshot`)).json(), doc);
    assert.equal((await fetch(`${s.base}/rooms/garden-2/snapshot`)).status, 404);
    assert.equal((await fetch(`${s.base}/rooms/Bad!/snapshot`)).status, 400);
    const put = await fetch(`${s.base}/rooms/garden-1/snapshot`, { method: 'PUT', body: '{}' });
    assert.equal(put.status, 404, 'tabs no longer upload worlds');
  } finally {
    await s.stop();
  }
});

test('an upgrade with an unparseable target does not crash the server', async () => {
  const net = await import('node:net');
  const s = await start();
  try {
    const { port } = new URL(s.base);
    for (const target of ['//[', 'http://[']) {
      const reply = await new Promise((resolve) => {
        const sock = net.connect(Number(port), '127.0.0.1', () =>
          sock.write(
            `GET ${target} HTTP/1.1\r\nHost: x\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n` +
              'Sec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n',
          ),
        );
        let got = '';
        sock.on('data', (d) => (got += d));
        sock.on('close', () => resolve(got));
        sock.on('error', () => resolve(got));
      });
      assert.match(reply.split('\r\n')[0], /^HTTP\/1\.1 4\d\d/, `${target}: ${reply.split('\r\n')[0]}`);
    }
    assert.equal((await fetch(`${s.base}/healthz`)).status, 200, 'still serving');
  } finally {
    await s.stop();
  }
});

test('an upgrade outside /room/ is refused', async () => {
  const { WebSocket } = await import('ws');
  const s = await start();
  try {
    const refused = await new Promise((resolve) => {
      const ws = new WebSocket(`${s.base.replace('http', 'ws')}/peerjs/peerjs?key=peerjs&id=x&token=t`);
      ws.on('unexpected-response', (_req, res) => resolve(res.statusCode));
      ws.on('error', () => resolve('error'));
    });
    assert.equal(refused, 404);
  } finally {
    await s.stop();
  }
});
