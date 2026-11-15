// Checkpoint A, shared by the existing net harness and the server's temp-volume fixture.
// Real HTTP principals and real sockets; no fixture-selected pid or token verification stub.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { CLOSE, WS_PROTOCOL, roomUrl, decode, encode, type WireMsg } from '../../src/net/ws-wire.ts';
import { AUTH_TIMEOUT_MS } from '../../src/net/account-wire.ts';
import { worldRoomId } from '../../src/world/namespace.ts';

export async function accountAdmissionChecks(options: {
  base: () => string;
  restart: () => Promise<void>;
  rooms?: () => number;
  check: (name: string, ok: boolean) => void;
}) {
  const { check } = options;
  const room = worldRoomId('auth' + randomBytes(4).toString('hex'));
  const sockets: WebSocket[] = [];
  const token = () => randomBytes(32).toString('hex');
  async function request(route: string, bearer: string, body?: unknown) {
    const response = await fetch(new URL('/account/' + route, options.base()), {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(5000),
    });
    const result = response.status === 204 ? {} : ((await response.json()) as Record<string, unknown>);
    return { status: response.status, body: result as Record<string, unknown> };
  }
  function connect(self: string, auth: unknown, query = '', roomId = room) {
    const ws = new WebSocket(roomUrl(options.base(), roomId, { self, b: 'account-proof' }) + query, WS_PROTOCOL);
    sockets.push(ws);
    const frames: WireMsg[] = [];
    ws.onmessage = (event) => {
      const m = decode(event.data);
      if (m) frames.push(m);
    };
    ws.onerror = () => {};
    const closed = new Promise<number>((resolve) => {
      ws.onclose = (event) => resolve(event.code);
    });
    ws.onopen = () => {
      if (auth !== undefined) ws.send(JSON.stringify(auth));
    };
    async function next(t: string) {
      const until = performance.now() + 6000;
      while (performance.now() < until) {
        const frame = frames.find((m) => m.t === t);
        if (frame) return frame;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error(`account proof: no ${t} for ${self}`);
    }
    return { ws, frames, closed, next };
  }
  const auth = (session: string) => ({ t: 'auth', token: session });
  try {
    const a = token(),
      b = token(),
      other = token();
    const guest = await request('guest', a, {});
    assert.equal(guest.status, 200);
    const pid = guest.body.pid;
    assert.equal((await request('guest', a, {})).body.pid, pid);
    const created = await request('create', a, {});
    assert.equal(created.status, 200);
    assert.equal(created.body.pid, pid);
    assert.equal((await request('create', a, {})).status, 409);
    assert.equal((await request('session', a)).body.accountId, created.body.accountId);
    check('guest registration/promotion retries preserve one principal and account', true);
    assert.equal((await request('sign-in', b, { pin: created.body.pin })).body.pid, pid);
    assert.equal((await request('sign-in', b, { pin: created.body.pin })).body.pid, pid);
    assert.equal((await request('guest', other, {})).status, 200);

    const before = options.rooms?.();
    for (const [self, frame, query, code] of [
      ['forgedurl', auth(token()), `&pid=${pid}`, CLOSE.BAD],
      ['forgedframe', { ...auth(a), pid }, '', CLOSE.BAD],
      ['unknown', auth(token()), '', CLOSE.AUTH],
      ['presencefirst', { t: 'p', s: 1, d: { pid } }, '', CLOSE.BAD],
      ['malformed', { t: 'auth', token: 'short' }, '', CLOSE.BAD],
      ['oversize', { ...auth(a), padding: 'x'.repeat(1024) }, '', CLOSE.BAD],
    ] as const) {
      const bad = connect(self, frame, query);
      assert.equal(await bad.closed, code);
      assert.ok(!bad.frames.some((m) => m.t === 'welcome' || m.t === 'm' || m.t === 'list'));
    }
    if (before !== undefined) assert.equal(options.rooms!(), before);
    check('absent owner cannot be impersonated; malformed/early frames never enter or load a room', true);
    const started = performance.now();
    const silent = connect('silent', undefined);
    assert.equal(await silent.closed, CLOSE.RESTART, 'timeout is retryable, never fatal authentication');
    assert.ok(performance.now() - started >= AUTH_TIMEOUT_MS - 100);
    assert.ok(performance.now() - started < AUTH_TIMEOUT_MS + 2000);
    assert.ok(!silent.frames.some((m) => m.t === 'welcome'));
    if (before !== undefined) assert.equal(options.rooms!(), before);
    check('first auth frame has a five-second bound; a delayed handshake stays retryable', true);

    const first = connect('first', auth(a));
    await first.next('list');
    const second = connect('second', auth(b));
    await second.next('list');
    assert.equal(await first.closed, CLOSE.ELSEWHERE);
    const retired = connect('first', auth(a));
    assert.equal(await retired.closed, CLOSE.ELSEWHERE);
    const intruder = connect('second', auth(other));
    assert.equal(await intruder.closed, CLOSE.TAKEN);
    check(
      'two device tokens share one pid; newer connection wins; retired and foreign connections cannot take it back',
      true,
    );
    const reconnect = connect('second', auth(b));
    await reconnect.next('list');
    assert.equal(await second.closed, CLOSE.REPLACED);
    reconnect.ws.close();
    await reconnect.closed;
    const back = connect('second', auth(b));
    await back.next('list');
    back.ws.send(encode({ t: 'hb', at: 123 }));
    await back.next('hb');
    assert.equal(back.ws.readyState, WebSocket.OPEN);
    check('healthy same-connection reconnect succeeds both live and during grace without fatal refusal', true);

    const caller = connect('caller', auth(a), '', room + '-a');
    const otherRoom = connect('otherroom', auth(b), '', room + '-b');
    await caller.next('list');
    await otherRoom.next('list');
    assert.equal((await request('rotate-pin', a, {})).status, 200);
    assert.equal(await back.closed, CLOSE.AUTH);
    assert.equal(await otherRoom.closed, CLOSE.AUTH);
    assert.equal(caller.ws.readyState, WebSocket.OPEN, 'rotation keeps the caller session in another room');
    assert.equal((await request('session', a)).body.pid, pid);
    assert.equal((await request('session', b)).status, 401);
    assert.equal(await connect('revoked', auth(b)).closed, CLOSE.AUTH);
    assert.equal((await request('guest', b, {})).status, 401);
    check('PIN rotation closes other devices and rejects revoked tokens without rebinding', true);
    await options.restart();
    assert.equal((await request('session', a)).body.pid, pid);
    const restarted = connect('restarted', auth(a));
    await restarted.next('list');
    const signedOutOtherRoom = connect('signedoutother', auth(a), '', room + '-a');
    await signedOutOtherRoom.next('list');
    assert.equal(await connect('stillrevoked', auth(b)).closed, CLOSE.AUTH);
    check('server restart preserves principal/session and durable revocation', true);
    assert.equal((await request('sign-out', a, {})).status, 204);
    assert.equal(await restarted.closed, CLOSE.AUTH);
    assert.equal(await signedOutOtherRoom.closed, CLOSE.AUTH);
    assert.equal((await request('sign-out', a, {})).status, 204);
    assert.equal(await connect('signedout', auth(a)).closed, CLOSE.AUTH);
    check('sign-out closes its socket and remains idempotent; signed-out token cannot reconnect', true);
  } finally {
    for (const ws of sockets) if (ws.readyState === WebSocket.OPEN) ws.close();
  }
}
