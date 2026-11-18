// The device stills endpoint (server/src/device.ts): public and token-guarded, so the token, the shape, every cap and
// that neither an id nor a scene ever reaches the file system as a path.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.ts';
import type { ServerConfig } from '../src/server.ts';

const DAY = 86_400_000;
const runId = (c = 'a') => `dv-${c.repeat(26)}`;
const jpeg = (n = 64, fill = 7) =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n, fill), Buffer.from([0xff, 0xd9])]);
const hash = (id: string) => crypto.createHash('sha256').update(id).digest('hex');

async function start(env: Record<string, string> = {}, overrides: Partial<ServerConfig> = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-device-'));
  const clock = { t: Date.parse('2026-11-17T12:00:00Z') };
  const cfg = loadConfig(
    { DATA_DIR: dataDir, REPORT_TOKEN: 'sesame', ...env },
    { log: () => {}, deviceNow: () => clock.t, ...overrides },
  );
  const svc = createService(cfg);
  const port = await svc.listen(0);
  const base = `http://127.0.0.1:${port}`;
  const auth = (token = 'sesame') => ({ authorization: `Bearer ${token}` });
  const register = (body: unknown, token: string | null = 'sesame') =>
    fetch(`${base}/device/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token === null ? {} : auth(token)) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  const still = (id: string, scene: string, body: Buffer | string = jpeg(), type = 'image/jpeg') =>
    fetch(`${base}/device/runs/${id}/still/${scene}`, {
      method: 'POST',
      headers: { 'content-type': type },
      body: typeof body === 'string' ? body : new Uint8Array(body),
    });
  const get = (p: string, token: string | null = 'sesame') =>
    fetch(`${base}${p}`, { headers: token === null ? {} : auth(token) });
  /** Every file under DATA_DIR/device, relative. */
  const files = async () =>
    (await fs.readdir(path.join(dataDir, 'device'), { recursive: true }).catch((): string[] => [])).map((f) =>
      f.replaceAll('\\', '/'),
    );
  return {
    base,
    port,
    dataDir,
    clock,
    register,
    still,
    get,
    files,
    async stop() {
      await svc.close();
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}

test('device: register needs the token; the reads too; only sha256(id) is kept', async () => {
  const s = await start();
  try {
    const id = runId();
    assert.equal((await s.register({ id, suite: 'quick', label: 'ipad' }, null)).status, 401);
    assert.equal((await s.register({ id, suite: 'quick', label: 'ipad' }, 'wrong')).status, 401);
    assert.deepEqual(await s.files(), []);
    const r = await s.register({ id, suite: 'quick', label: 'ipad' });
    assert.equal(r.status, 201);
    assert.ok((await r.json()).expires);
    assert.equal((await s.register({ id, suite: 'quick', label: 'ipad' })).status, 200);
    assert.equal((await s.still(id, 'spawn', jpeg(100))).status, 204);
    assert.deepEqual((await s.files()).sort(), [hash(id), `${hash(id)}/0.jpg`, `${hash(id)}/run.json`]);
    const disk = await fs.readFile(path.join(s.dataDir, 'device', hash(id), 'run.json'), 'utf8');
    assert.ok(!disk.includes(id), 'run.json never holds the id');

    assert.equal((await s.get(`/device/runs/${id}/stills`, null)).status, 401);
    assert.equal((await s.get(`/device/runs/${id}/still/spawn`, 'wrong')).status, 401);
    const list = await s.get(`/device/runs/${id}/stills`);
    assert.equal(list.headers.get('cache-control'), 'no-store');
    const body = await list.json();
    assert.equal(body.suite, 'quick');
    assert.equal(body.label, 'ipad');
    assert.equal(body.self, false);
    assert.deepEqual(
      body.stills.map((x: { scene: string; bytes: number }) => [x.scene, x.bytes]),
      [['spawn', 106]],
    );
    const one = await s.get(`/device/runs/${id}/still/spawn`);
    assert.equal(one.status, 200);
    assert.equal(one.headers.get('content-type'), 'application/octet-stream');
    assert.equal(one.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Buffer.from(await one.arrayBuffer()), jpeg(100));
    assert.equal((await s.get(`/device/runs/${id}/still/town`)).status, 404);
    assert.equal((await s.get(`/device/runs/${runId('b')}/stills`)).status, 404);
  } finally {
    await s.stop();
  }
});

test('device: with no REPORT_TOKEN, register and the reads are 404', async () => {
  const s = await start({ REPORT_TOKEN: '' });
  try {
    assert.equal((await s.register({ id: runId(), suite: 'quick', label: '' })).status, 404);
    assert.equal((await s.still(runId(), 'spawn')).status, 204); // a self-minted still still lands
    assert.equal((await s.get(`/device/runs/${runId()}/stills`)).status, 404);
    assert.equal((await s.get(`/device/runs/${runId()}/still/spawn`)).status, 404);
  } finally {
    await s.stop();
  }
});

test('device: malformed register bodies answer 400 without a throw and write nothing', async () => {
  const s = await start();
  try {
    for (const body of [
      '{"id":"dv-',
      '[]',
      'null',
      '"dv-aaaaaaaaaaaaaaaaaaaaaaaaaa"',
      '42',
      { id: 'dv-short', suite: 'quick', label: '' },
      { id: '../../etc/passwd', suite: 'quick', label: '' },
      { id: runId(), suite: '../x', label: '' },
      { id: runId(), suite: 'quick', label: 'UPPER case' },
      { id: [runId()], suite: 'quick', label: '' },
    ])
      assert.equal((await s.register(body)).status, 400, JSON.stringify(body));
    assert.deepEqual(await s.files(), []);
    // the server still answers
    assert.equal((await s.register({ id: runId(), suite: 'quick', label: '' })).status, 201);
  } finally {
    await s.stop();
  }
});

test('device: an unseen id registers on its first still; a bad id, scene or body is 400 and writes nothing', async () => {
  const s = await start();
  try {
    for (const [id, scene] of [
      ['dv-short', 'spawn'],
      [runId().toUpperCase(), 'spawn'],
      [runId(), 'Spawn'],
      [runId(), 'a'.repeat(25)],
      [runId(), '..'],
      [runId(), '%2e%2e'],
      [runId(), '..%2f..%2frun.json'],
      ['..%2f..%2fdevice', 'spawn'],
      [`${runId()}%00`, 'spawn'],
    ])
      assert.ok([400, 404].includes((await s.still(id!, scene!)).status), `${id} ${scene}`);
    assert.deepEqual(await s.files(), []);
    // not a JPEG, a truncated one (no end marker), the wrong content type, an empty body
    assert.equal((await s.still(runId(), 'spawn', Buffer.from('GIF89a....'))).status, 400);
    assert.equal((await s.still(runId(), 'spawn', jpeg().subarray(0, 40))).status, 400);
    assert.equal((await s.still(runId(), 'spawn', jpeg(), 'text/plain')).status, 400);
    assert.equal((await s.still(runId(), 'spawn', Buffer.alloc(0))).status, 400);
    assert.deepEqual(await s.files(), []);

    assert.equal((await s.still(runId(), 'spawn')).status, 204);
    const body = await (await s.get(`/device/runs/${runId()}/stills`)).json();
    assert.equal(body.self, true);
    assert.equal(body.suite, '');
    assert.equal(Date.parse(body.expires) - Date.parse(body.made), 7 * DAY);
  } finally {
    await s.stop();
  }
});

test('device: a body cut off mid-upload answers without a throw and stores nothing', async () => {
  const s = await start();
  try {
    const status = await new Promise<string>((resolve) => {
      const sock = net.connect(s.port, '127.0.0.1', () => {
        sock.write(
          `POST /device/runs/${runId()}/still/spawn HTTP/1.1\r\nHost: x\r\nContent-Type: image/jpeg\r\nContent-Length: 5000\r\n\r\n`,
        );
        sock.end(jpeg(100)); // 106 of the 5000 bytes it promised
      });
      let got = '';
      sock.on('data', (d) => (got += String(d)));
      sock.on('close', () => resolve(got.split('\r\n')[0] ?? ''));
      sock.on('error', () => resolve(''));
    });
    assert.ok(status === '' || /^HTTP\/1\.1 4\d\d/.test(status), status);
    assert.deepEqual(await s.files(), []);
    assert.equal((await s.still(runId(), 'spawn')).status, 204, 'the server is still up');
  } finally {
    await s.stop();
  }
});

test('device: an oversized still is 413; the thirteenth is 507; a retry of a scene replaces it', async () => {
  const s = await start();
  try {
    const id = runId();
    assert.equal((await s.still(id, 'big', jpeg(400 * 1024))).status, 413);
    assert.deepEqual(await s.files(), []);
    for (let i = 0; i < 12; i++) assert.equal((await s.still(id, `s${i}`, jpeg(10, i))).status, 204);
    assert.equal((await s.still(id, 's12')).status, 507);
    assert.equal((await s.still(id, 's3', jpeg(20, 99))).status, 204, 'a scene sent again replaces its still');
    const body = await (await s.get(`/device/runs/${id}/stills`)).json();
    assert.equal(body.stills.length, 12);
    assert.deepEqual(Buffer.from(await (await s.get(`/device/runs/${id}/still/s3`)).arrayBuffer()), jpeg(20, 99));
    assert.equal((await s.files()).filter((f) => f.endsWith('.jpg')).length, 12);
  } finally {
    await s.stop();
  }
});

test('device: an expired run is 404 and writes nothing; runs past 30 days go on the first write of a day', async () => {
  const s = await start();
  try {
    const old = runId('o');
    assert.equal((await s.register({ id: old, suite: 'quick', label: '' })).status, 201);
    s.clock.t += 7 * DAY + 1000;
    assert.equal((await s.still(old, 'spawn')).status, 404);
    assert.equal((await s.files()).filter((f) => f.endsWith('.jpg')).length, 0);
    assert.equal((await s.get(`/device/runs/${old}/stills`)).status, 200, 'still readable until the sweep');
    s.clock.t += 24 * DAY;
    assert.equal((await s.still(runId('n'), 'spawn')).status, 204);
    assert.equal((await s.get(`/device/runs/${old}/stills`)).status, 404);
    assert.deepEqual(
      (await s.files()).filter((f) => !f.includes('/')),
      [hash(runId('n'))],
    );
  } finally {
    await s.stop();
  }
});

test('device: the run cap and the byte cap hold, for self-minted runs too', async () => {
  const s = await start({ DEVICE_MAX_RUNS: '2', DEVICE_MAX_BYTES: String(12 * 1024) });
  try {
    assert.equal((await s.still(runId('a'), 'spawn')).status, 204);
    assert.equal((await s.register({ id: runId('b'), suite: 'quick', label: '' })).status, 201);
    assert.equal((await s.still(runId('c'), 'spawn')).status, 507);
    assert.equal((await s.register({ id: runId('c'), suite: 'quick', label: '' })).status, 507);
    // bytes: 12 kB in all, the run files counted
    assert.equal((await s.still(runId('a'), 'town', jpeg(1000))).status, 204);
    assert.equal((await s.still(runId('a'), 'pier', jpeg(11_500))).status, 507);
    assert.equal((await s.files()).filter((f) => !f.includes('/')).length, 2);
  } finally {
    await s.stop();
  }
  const r = await start({ DEVICE_FREE_RESERVE: String(2 ** 60) }); // no volume has this free
  try {
    assert.equal((await r.still(runId(), 'spawn')).status, 507);
    assert.equal((await r.register({ id: runId(), suite: 'quick', label: '' })).status, 507);
  } finally {
    await r.stop();
  }
});

test('device: writes are rate limited per IP', async () => {
  const s = await start({ DEVICE_RATE_PER_MIN: '3' });
  try {
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await s.still(runId(), `s${i}`)).status);
    assert.deepEqual(codes, [204, 204, 204, 429, 429]);
    assert.equal((await s.register({ id: runId('b'), suite: 'quick', label: '' })).status, 429);
  } finally {
    await s.stop();
  }
});

test('device: config keys fall back on malformed values', () => {
  const c = loadConfig({ DEVICE_MAX_RUNS: 'lots', DEVICE_MAX_BYTES: '', DEVICE_RATE_PER_MIN: 'x' });
  assert.equal(c.deviceMaxRuns, 50);
  assert.equal(c.deviceMaxBytes, 20 * 1024 * 1024);
  assert.equal(c.deviceRatePerMin, 30);
  assert.equal(c.deviceFreeReserve, 128 * 1024 * 1024);
});

// ---- Independent review (R4): attacks on the endpoint. Three fail on 91019279 and name a defect each (the self-mint
// lockout, a still with no REPORT_TOKEN, the chunked body read off whole); the rest pass and pin what the review
// checked. ----

test('device (review): self-minted stills cannot lock a registered run out of the caps', async () => {
  // Scaled down from production: 20 MB / 400 kB is 51 uploads and 50 runs is 50 uploads, both reached from one address
  // in about 40 s at 30 a minute (a full bucket of 30 at once, then one every 2 s), and held for 30 days.
  const s = await start({
    DEVICE_MAX_RUNS: '10',
    DEVICE_MAX_BYTES: String(4 * 400 * 1024),
    DEVICE_RATE_PER_MIN: '1000',
  });
  try {
    const big = jpeg(400 * 1024 - 6);
    for (let i = 0; i < 4; i++)
      assert.equal((await s.still(runId(String.fromCharCode(97 + i)), 'spawn', big)).status, 204);
    for (let i = 4; i < 10; i++) await s.still(runId(String.fromCharCode(97 + i)), 'spawn');
    const owner = runId('z');
    assert.equal(
      (await s.register({ id: owner, suite: 'quick', label: 'iphone' })).status,
      201,
      'register after a self-mint flood',
    );
    assert.equal((await s.still(owner, 'spawn')).status, 204, 'a registered still after a self-mint flood');
  } finally {
    await s.stop();
  }
});

test('device (review): with no REPORT_TOKEN a still upload is 404 too (nobody could ever read it)', async () => {
  const s = await start({ REPORT_TOKEN: '' });
  try {
    assert.equal((await s.still(runId(), 'spawn')).status, 404);
    assert.deepEqual(await s.files(), []);
  } finally {
    await s.stop();
  }
});

test('device (review): parallel uploads cannot pass the run or byte cap', async () => {
  const s = await start({
    DEVICE_MAX_RUNS: '5',
    DEVICE_MAX_BYTES: String(8 * 1024 * 1024),
    DEVICE_RATE_PER_MIN: '1000',
  });
  try {
    const ids = Array.from({ length: 20 }, (_, i) => `dv-${String(i).padStart(2, '0')}${'p'.repeat(24)}`);
    const codes = await Promise.all(ids.map((id) => s.still(id, 'spawn').then((r) => r.status)));
    assert.equal(codes.filter((c) => c === 204).length, 5);
    assert.equal(codes.filter((c) => c === 507).length, 15);
    assert.equal((await s.files()).filter((f) => !f.includes('/')).length, 5);
    const one = ids[codes.indexOf(204)]!;
    const big = await Promise.all(
      Array.from({ length: 12 }, (_, i) => s.still(one, `b${i}`, jpeg(400 * 1024 - 6, i)).then((r) => r.status)),
    );
    let bytes = 0;
    for (const f of await s.files())
      if (f.includes('/')) bytes += (await fs.stat(path.join(s.dataDir, 'device', f))).size;
    assert.ok(bytes <= 8 * 1024 * 1024, `${bytes} bytes on disk`);
    assert.ok(big.includes(507) && big.includes(204), big.join(' '));
    assert.ok(!(await s.files()).some((f) => f.endsWith('.tmp')), 'no temp file left');
  } finally {
    await s.stop();
  }
});

/** Sends a raw HTTP request on a socket; resolves with the status line, '' if the server cut it, or 'timeout' after 5 s. */
function rawRequest(port: number, head: string, write: (sock: net.Socket) => void): Promise<string> {
  return new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.write(head);
      write(sock);
    });
    let got = '';
    sock.on('data', (d) => {
      got += String(d);
      if (got.includes('\r\n')) sock.destroy();
    });
    sock.on('close', () => resolve(got.split('\r\n')[0] ?? ''));
    sock.on('error', () => resolve(got.split('\r\n')[0] ?? ''));
    setTimeout(() => {
      resolve('timeout');
      sock.destroy();
    }, 5000).unref();
  });
}

test('device (review): a chunked body past 400 kB is cut off while it streams, and stores nothing', async () => {
  const s = await start();
  try {
    let sent = 0;
    const status = await rawRequest(
      s.port,
      `POST /device/runs/${runId()}/still/spawn HTTP/1.1\r\nHost: x\r\nContent-Type: image/jpeg\r\nTransfer-Encoding: chunked\r\n\r\n`,
      (sock) => {
        const chunk = Buffer.alloc(64 * 1024, 1);
        chunk[0] = 0xff;
        const pump = () => {
          // 8 MB, then the end of the body. On 91019279 the server reads (and drops) all 8 MB before its 413, and a
          // body that never ends gets no answer at all: body-parser reads off the whole request after the limit.
          while (sent < 8 * 1024 * 1024 && !sock.destroyed) {
            sent += chunk.length;
            const a = sock.write(`${chunk.length.toString(16)}\r\n`);
            const b = sock.write(chunk);
            const c = sock.write('\r\n');
            if (!(a && b && c)) return void sock.once('drain', pump);
          }
          if (!sock.destroyed) sock.write('0\r\n\r\n');
        };
        pump();
      },
    );
    // A 413, or a reset that the 413 rode on while the client was still writing: either way well short of the body.
    assert.ok(status === '' || /^HTTP\/1\.1 413/.test(status), status);
    assert.ok(sent < 1024 * 1024, `cut off after ${sent} bytes`);
    assert.equal((await s.still(runId(), 'spawn')).status, 204, 'the server is still up');
    assert.deepEqual(
      (await s.files()).filter((f) => f.endsWith('.jpg')),
      [`${hash(runId())}/0.jpg`],
    );
  } finally {
    await s.stop();
  }
});

test('device (review): a slow upload holds no lock; another still lands meanwhile', async () => {
  const s = await start();
  let slow: net.Socket | undefined;
  try {
    slow = net.connect(s.port, '127.0.0.1');
    await new Promise((r) => slow!.once('connect', r));
    slow.write(
      `POST /device/runs/${runId('s')}/still/spawn HTTP/1.1\r\nHost: x\r\nContent-Type: image/jpeg\r\nContent-Length: 300000\r\n\r\n`,
    );
    slow.write(Buffer.from([0xff, 0xd8, 0xff]));
    const t = Date.now();
    assert.equal((await s.still(runId('f'), 'spawn')).status, 204);
    assert.ok(Date.now() - t < 2000);
    assert.deepEqual(
      (await s.files()).filter((f) => !f.includes('/')),
      [hash(runId('f'))],
    );
  } finally {
    slow?.destroy();
    await s.stop();
  }
});

test('device (review): the JPEG preflight answers the allowed origin only, never *', async () => {
  const s = await start({ ALLOWED_ORIGINS: 'https://boogle.club' });
  try {
    const pre = (origin: string) =>
      fetch(`${s.base}/device/runs/${runId()}/still/spawn`, {
        method: 'OPTIONS',
        headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
      });
    const ok = await pre('https://boogle.club');
    assert.equal(ok.status, 204);
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://boogle.club');
    assert.match(ok.headers.get('access-control-allow-methods') ?? '', /POST/);
    assert.match(ok.headers.get('access-control-allow-headers') ?? '', /content-type/i);
    const evil = await pre('https://evil.example');
    assert.equal(evil.headers.get('access-control-allow-origin'), null);
  } finally {
    await s.stop();
  }
});

test('device (review): the write limit is keyed on Fly-Client-IP behind Fly, never on X-Forwarded-For', async () => {
  const s = await start({ DEVICE_RATE_PER_MIN: '2', REPLACE_FLY_PROXY: '1' });
  try {
    const send = (headers: Record<string, string>, c: string) =>
      fetch(`${s.base}/device/runs/${runId(c)}/still/spawn`, {
        method: 'POST',
        headers: { 'content-type': 'image/jpeg', ...headers },
        body: new Uint8Array(jpeg()),
      }).then((r) => r.status);
    const a = { 'fly-client-ip': '203.0.113.1' };
    assert.deepEqual([await send(a, 'a'), await send(a, 'b'), await send(a, 'c')], [204, 204, 429]);
    // A spoofed X-Forwarded-For buys no new bucket; another edge address does.
    assert.equal(await send({ ...a, 'x-forwarded-for': '198.51.100.9' }, 'd'), 429);
    assert.equal(await send({ 'fly-client-ip': '203.0.113.2' }, 'e'), 204);
  } finally {
    await s.stop();
  }
});
