import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.ts';
import { accountAdmissionChecks } from '../../dev/peer-test/ws-accounts.ts';

test('Checkpoint A: authenticated room admission, reconnect, revocation and restart', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-account-admission-'));
  const config = loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { log: () => {} });
  let svc = createService(config);
  let port = await svc.listen(0);
  try {
    await accountAdmissionChecks({
      base: () => `http://127.0.0.1:${port}`,
      rooms: () => svc.roomHost()!.rooms(),
      async restart() {
        await svc.close();
        svc = createService(config);
        port = await svc.listen(0);
      },
      check(name, ok) {
        if (!ok) throw new Error(name);
        console.log('PASS ' + name);
      },
    });
  } finally {
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('operator tuning requires its separate capability, never an account or a public pid', async () => {
  const { randomBytes } = await import('node:crypto');
  const { railwayRoomId } = await import('../../src/world/railway-namespace.ts');
  const { roomUrl, encode, decode } = await import('../../src/net/ws-wire.ts');
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-account-tune-'));
  const capability = 'account-test-operator-capability';
  const svc = createService(
    loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*', TUNE_CONTROLLER_KEY: capability }, { log: () => {} }),
  );
  const port = await svc.listen(0);
  const base = `http://127.0.0.1:${port}`;
  const room = railwayRoomId('proto-auth');
  const sockets: WebSocket[] = [];
  try {
    const token = randomBytes(32).toString('hex');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    assert.equal((await fetch(base + '/account/guest', { method: 'POST', headers, body: '{}' })).status, 200);
    assert.equal((await fetch(base + '/account/create', { method: 'POST', headers, body: '{}' })).status, 200);
    for (const [self, tuneKey, allowed] of [
      ['ordinary', undefined, false],
      ['wrong', 'wrong', false],
      ['operator', capability, true],
    ] as const) {
      const ws = new WebSocket(roomUrl(base, room, { self, b: 'test' }), 'boogle.1');
      sockets.push(ws);
      const messages: Record<string, unknown>[] = [];
      let listed = false;
      ws.onopen = () => ws.send(encode({ t: 'auth', token, ...(tuneKey && { tuneKey }) }));
      ws.onmessage = (event) => {
        const m = decode(event.data);
        if (m?.t === 'list' && m.last) listed = true;
        if (m?.t === 'm') messages.push(m.d as Record<string, unknown>);
      };
      const until = async (predicate: () => unknown) => {
        const end = performance.now() + 3000;
        while (!predicate()) {
          if (performance.now() > end)
            throw new Error(
              `operator ${self} timed out: ${JSON.stringify(messages.filter((m) => m.t !== 's' && m.t !== 'w:c'))}`,
            );
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      };
      await until(() => {
        if (messages.some((m) => m.t === 'r:session')) return true;
        if (listed) ws.send(encode({ t: 'm', d: { t: 'r:open' } }));
        return false;
      });
      const session = messages.find((m) => m.t === 'r:session')!;
      ws.send(
        encode({
          t: 'm',
          d: {
            t: 'r:edit',
            e: {
              op: 'tune.commit',
              key: 'railRegrowMinutes',
              v: 41,
              epoch: session.epoch,
              request: session.next,
              expectedRevision: 0,
              requestId: 'auth-tune',
              at: [0, 0, 0],
              ms: 0,
            },
          },
        }),
      );
      await until(() => messages.some((m) => m.t === 's' && (m.ok || m.rej)));
      const packets = messages.filter((m) => m.t === 's');
      assert.equal(
        packets.some((m) => Array.isArray(m.ok) && m.ok.length > 0),
        allowed,
      );
      assert.equal(
        packets.some((m) => Array.isArray(m.rej) && m.rej.length > 0),
        !allowed,
      );
      ws.close();
    }
  } finally {
    for (const ws of sockets) ws.close();
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('the real room client reauthenticates a healthy voice-presence reconnect without a fatal refusal', async (t) => {
  const { randomBytes } = await import('node:crypto');
  const { createWsRoom } = await import('../../src/net/ws-room.ts');
  const { worldRoomId } = await import('../../src/world/namespace.ts');
  // Node supplies WebSocket; only the pagehide lifecycle hook needs an EventTarget in this socket proof.
  const lifecycle = new EventTarget();
  const original = { add: globalThis.addEventListener, remove: globalThis.removeEventListener };
  globalThis.addEventListener = lifecycle.addEventListener.bind(lifecycle);
  globalThis.removeEventListener = lifecycle.removeEventListener.bind(lifecycle);
  t.after(() => {
    globalThis.addEventListener = original.add;
    globalThis.removeEventListener = original.remove;
  });
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-client-auth-'));
  const svc = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { log: () => {} }));
  const base = `http://127.0.0.1:${await svc.listen(0)}`;
  let room: Awaited<ReturnType<typeof createWsRoom>> | undefined;
  try {
    const token = randomBytes(32).toString('hex');
    assert.equal(
      (
        await fetch(base + '/account/guest', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      200,
    );
    let authentications = 0;
    room = await createWsRoom({
      server: base,
      roomId: worldRoomId('client-auth'),
      authenticate: () => {
        authentications++;
        return { t: 'auth', token };
      },
    });
    const connections: boolean[] = [];
    const failures: unknown[] = [];
    room.onConnection(
      (up) => connections.push(up),
      (error) => failures.push(error),
    );
    await room.presence({ v: 1, vc: 1, pid: 'publicpose' });
    room.pause(100);
    const deadline = performance.now() + 5000;
    while (!(connections.includes(false) && connections.at(-1) === true)) {
      if (performance.now() > deadline) throw new Error('client did not reconnect');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(authentications, 2);
    assert.equal(failures.length, 0);
    assert.equal((room.peers()[0]!.presence as { vc: number }).vc, 1);
    const signout = await fetch(base + '/account/sign-out', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(signout.status, 204);
    while (!failures.length) {
      if (performance.now() > deadline) throw new Error('client did not report revocation');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal((failures[0] as { code: string }).code, 'unauthenticated');
    assert.equal((failures[0] as { fatal: boolean }).fatal, true);
    assert.equal(authentications, 2, 'revocation never starts a takeover/reconnect loop');
  } finally {
    room?.close();
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
