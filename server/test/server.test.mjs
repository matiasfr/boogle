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
  } finally {
    await s.stop();
  }

  s = await start({ ALLOWED_ORIGINS: 'https://good.example,https://also.example' });
  try {
    for (const p of ['/healthz', '/ice', '/rooms/a/snapshot', '/peerjs/peerjs/id']) {
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
