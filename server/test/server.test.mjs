import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.js';

async function start(env = {}, overrides = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-test-'));
  const cfg = loadConfig({ DATA_DIR: dataDir, ...env }, { log: () => {}, unrefTimers: true, ...overrides });
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

const put = (base, room, body, raw) =>
  fetch(`${base}/rooms/${room}/snapshot`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });

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

test('snapshot: 404 -> PUT -> GET, stale tick 409, equal/newer ok', async () => {
  const s = await start();
  try {
    let r = await fetch(`${s.base}/rooms/garden-1/snapshot`);
    assert.equal(r.status, 404);

    r = await put(s.base, 'garden-1', { tick: 10, writerId: 'a', data: { plants: [1, 2] } });
    assert.equal(r.status, 200);

    r = await fetch(`${s.base}/rooms/garden-1/snapshot`);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.tick, 10);
    assert.equal(j.writerId, 'a');
    assert.deepEqual(j.data, { plants: [1, 2] });

    r = await put(s.base, 'garden-1', { tick: 9, writerId: 'b', data: 'old' });
    assert.equal(r.status, 409);
    assert.equal((await r.json()).tick, 10);

    r = await put(s.base, 'garden-1', { tick: 10, writerId: 'b', data: 'same' });
    assert.equal(r.status, 200);
    r = await put(s.base, 'garden-1', { tick: 11, writerId: 'b', data: 'new' });
    assert.equal(r.status, 200);
    assert.equal((await (await fetch(`${s.base}/rooms/garden-1/snapshot`)).json()).data, 'new');

    // atomic write leaves no temp files
    const files = await fs.readdir(s.dataDir);
    assert.deepEqual(files, ['garden-1.json']);
  } finally {
    await s.stop();
  }
});

test('snapshot: invalid roomId 400, invalid body 400, bad JSON 400', async () => {
  const s = await start();
  try {
    for (const bad of ['UPPER', 'has_underscore', 'a'.repeat(33), 'dot.dot']) {
      assert.equal((await fetch(`${s.base}/rooms/${bad}/snapshot`)).status, 400, bad);
      assert.equal((await put(s.base, bad, { tick: 1, writerId: 'a', data: 1 })).status, 400, bad);
    }
    assert.equal((await put(s.base, 'ok', { tick: 'x', writerId: 'a', data: 1 })).status, 400);
    assert.equal((await put(s.base, 'ok', { tick: 1, data: 1 })).status, 400);
    assert.equal((await put(s.base, 'ok', null, '{nope')).status, 400);
  } finally {
    await s.stop();
  }
});

test('snapshot: oversize body 413', async () => {
  const s = await start();
  try {
    const r = await put(s.base, 'big', { tick: 1, writerId: 'a', data: 'x'.repeat(300 * 1024) });
    assert.equal(r.status, 413);
    const ok = await put(s.base, 'big', { tick: 1, writerId: 'a', data: 'x'.repeat(200 * 1024) });
    assert.equal(ok.status, 200);
  } finally {
    await s.stop();
  }
});

test('snapshot: per-IP PUT rate limit', async () => {
  const s = await start({ PUT_RATE_PER_MIN: '3' });
  try {
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await put(s.base, 'rl', { tick: i, writerId: 'a', data: i })).status);
    assert.deepEqual(codes, [200, 200, 200, 429, 429]);
    assert.equal((await fetch(`${s.base}/rooms/rl/snapshot`)).status, 200); // GET not limited
  } finally {
    await s.stop();
  }
});

test('snapshot: MAX_ROOMS enforced, existing rooms still updatable', async () => {
  const s = await start({ MAX_ROOMS: '2' });
  try {
    assert.equal((await put(s.base, 'r1', { tick: 1, writerId: 'a', data: 1 })).status, 200);
    assert.equal((await put(s.base, 'r2', { tick: 1, writerId: 'a', data: 1 })).status, 200);
    assert.equal((await put(s.base, 'r3', { tick: 1, writerId: 'a', data: 1 })).status, 507);
    assert.equal((await put(s.base, 'r1', { tick: 2, writerId: 'a', data: 2 })).status, 200);
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

test('/ice: STUN only by default', async () => {
  const s = await start();
  try {
    const j = await (await fetch(`${s.base}/ice`)).json();
    assert.deepEqual(j, { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  } finally {
    await s.stop();
  }
});

test('/ice: static TURN credentials', async () => {
  const s = await start({
    TURN_URLS: 'turn:turn.example.com:3478, turns:turn.example.com:5349',
    TURN_USERNAME: 'user',
    TURN_CREDENTIAL: 'pass',
  });
  try {
    const j = await (await fetch(`${s.base}/ice`)).json();
    assert.equal(j.iceServers.length, 2);
    assert.deepEqual(j.iceServers[1], {
      urls: ['turn:turn.example.com:3478', 'turns:turn.example.com:5349'],
      username: 'user',
      credential: 'pass',
    });
  } finally {
    await s.stop();
  }
});

test('/ice: TURN_SECRET ephemeral credentials', async () => {
  const s = await start({ TURN_URLS: 'turn:turn.example.com:3478', TURN_SECRET: 's3cret', TURN_TTL: '600' });
  try {
    const before = Math.floor(Date.now() / 1000);
    const j = await (await fetch(`${s.base}/ice`)).json();
    const t = j.iceServers[1];
    const m = /^(\d+):boogle$/.exec(t.username);
    assert.ok(m, 'username format');
    const expiry = Number(m[1]);
    assert.ok(expiry >= before + 600 && expiry <= before + 602);
    const expected = crypto.createHmac('sha1', 's3cret').update(t.username).digest('base64');
    assert.equal(t.credential, expected);
    assert.deepEqual(t.urls, ['turn:turn.example.com:3478']);
  } finally {
    await s.stop();
  }
});

test('/ice: Cloudflare TURN minted once, port 53 dropped, STUN-only on failure', async () => {
  const calls = [];
  let fail = false;
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    if (fail) return new Response('nope', { status: 500 });
    return Response.json({
      iceServers: [
        { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
        {
          urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp'],
          username: 'u',
          credential: 'c',
        },
      ],
    });
  };
  const env = { CF_TURN_KEY_ID: 'key1', CF_TURN_API_TOKEN: 'tok', TURN_TTL: '600' };
  const s = await start(env, { fetch: fakeFetch });
  try {
    for (let i = 0; i < 2; i++) {
      const j = await (await fetch(`${s.base}/ice`)).json();
      assert.deepEqual(j.iceServers, [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' },
      ]);
    }
    assert.equal(calls.length, 1, 'credentials are cached');
    assert.equal(calls[0].url, 'https://rtc.live.cloudflare.com/v1/turn/keys/key1/credentials/generate-ice-servers');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer tok');
    assert.deepEqual(JSON.parse(calls[0].init.body), { ttl: 600 });
  } finally {
    await s.stop();
  }
  fail = true;
  const f = await start(env, { fetch: fakeFetch });
  try {
    assert.deepEqual((await (await fetch(`${f.base}/ice`)).json()).iceServers, [
      { urls: 'stun:stun.l.google.com:19302' },
    ]);
  } finally {
    await f.stop();
  }
});

test('/ice: TURN_URLS without credentials adds nothing', async () => {
  const s = await start({ TURN_URLS: 'turn:turn.example.com:3478' });
  try {
    assert.equal((await (await fetch(`${s.base}/ice`)).json()).iceServers.length, 1);
  } finally {
    await s.stop();
  }
});

test('CORS: default *, and allow-list', async () => {
  let s = await start();
  try {
    const r = await fetch(`${s.base}/healthz`, { headers: { origin: 'https://x.example' } });
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const pre = await fetch(`${s.base}/rooms/a/snapshot`, {
      method: 'OPTIONS',
      headers: { origin: 'https://x.example', 'access-control-request-method': 'PUT' },
    });
    assert.equal(pre.status, 204);
    assert.match(pre.headers.get('access-control-allow-methods'), /PUT/);
    assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
  } finally {
    await s.stop();
  }

  s = await start({ ALLOWED_ORIGINS: 'https://good.example,https://also.example' });
  try {
    for (const p of ['/healthz', '/ice', '/rooms/a/snapshot', '/report', '/peerjs/peerjs/id']) {
      const good = await fetch(`${s.base}${p}`, { headers: { origin: 'https://good.example' } });
      assert.equal(good.headers.get('access-control-allow-origin'), 'https://good.example', p);
      const bad = await fetch(`${s.base}${p}`, { headers: { origin: 'https://evil.example' } });
      assert.equal(bad.headers.get('access-control-allow-origin'), null, p);
    }
  } finally {
    await s.stop();
  }
});

test('/peerjs: signaling endpoints respond', async () => {
  const s = await start();
  try {
    const root = await fetch(`${s.base}/peerjs`);
    assert.equal(root.status, 200);
    assert.match((await root.json()).name, /PeerJS/);

    const r = await fetch(`${s.base}/peerjs/peerjs/id`);
    assert.equal(r.status, 200);
    assert.ok((await r.text()).length > 0, 'generated id');

    // discovery disabled
    assert.equal((await fetch(`${s.base}/peerjs/peerjs/peers`)).status, 401);
  } finally {
    await s.stop();
  }
});

test('/peerjs: websocket handshake yields OPEN', { skip: typeof WebSocket === 'undefined' }, async () => {
  const s = await start();
  try {
    const url = `ws://127.0.0.1:${s.port}/peerjs/peerjs?key=peerjs&id=test-peer-1&token=abc`;
    const msg = await new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const t = setTimeout(() => reject(new Error('ws timeout')), 3000);
      ws.onmessage = (e) => {
        clearTimeout(t);
        ws.close();
        resolve(JSON.parse(e.data));
      };
      ws.onerror = () => {
        clearTimeout(t);
        reject(new Error('ws error'));
      };
    });
    assert.equal(msg.type, 'OPEN');
  } finally {
    await s.stop();
  }
});
