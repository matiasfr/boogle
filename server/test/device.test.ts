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
