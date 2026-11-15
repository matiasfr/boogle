// Existing room tests use named fixture principals so their save/seat assertions remain readable.
// This seeds the test volume directly; production admission still resolves every token through accounts.sqlite.
import { createHash } from 'node:crypto';
import { createAccountStore } from '../../src/account-store.ts';
import { createService as service } from '../../src/server.ts';
import { createRoomHost as host } from '../../src/host/rooms.ts';
import { AccountError } from '../../src/accounts.ts';
import { okPid } from '../../../src/sim/roster.ts';
import { encode } from '../../../src/net/ws-wire.ts';
export { loadConfig } from '../../src/server.ts';
export type { ServerConfig } from '../../src/server.ts';

const volumes = new Map<string, string>();
const fixtures = new Map<string, { pid: string; expiresAt: number }>();
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const fixtureToken = (pid: string, device = pid) => digest(`room-test:${pid}:${device}`);
export function seedPrincipal(dataDir: string, pid: string, token: string) {
  const store = createAccountStore({ dataDir });
  store.init();
  try {
    const hash = digest(token);
    store.transaction(() => {
      if (store.session(hash)) return;
      // Several devices can deliberately belong to the same fixture principal.
      try {
        store.addPrincipal(pid);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('UNIQUE constraint failed: principals.pid'))
          throw error;
      }
      store.addSession(hash, pid, Date.now() + 86400000);
    });
  } finally {
    store.close();
  }
}
export function createService(cfg: Parameters<typeof service>[0]) {
  const svc = service(cfg);
  return {
    ...svc,
    async listen(port?: number) {
      const actual = await svc.listen(port);
      volumes.set(String(actual), cfg.dataDir);
      return actual;
    },
  };
}
export function createRoomHost(cfg: Parameters<typeof host>[0], store: Parameters<typeof host>[1]) {
  return host(cfg, store, (token) => {
    const identity = fixtures.get(token);
    if (!identity) throw new AccountError(401, 'unauthenticated');
    return identity;
  });
}

// pid/key in these test URLs describe fixture setup, not the URL sent to the server.
// Auth boundary tests use the real WebSocket and HTTP guest/account routes instead.
export function fixtureAdmission(url: string | URL) {
  const u = new URL(url);
  const pid = u.searchParams.get('pid') ?? '';
  const device = u.searchParams.get('key') ?? '';
  const token = fixtureToken(pid, device);
  const valid = okPid(pid) && device.length >= 16;
  if (valid) {
    fixtures.set(token, { pid, expiresAt: Date.now() + 86400000 });
    const dataDir = volumes.get(u.port);
    if (dataDir) seedPrincipal(dataDir, pid, token);
  }
  u.searchParams.delete('pid');
  u.searchParams.delete('key');
  return { url: u.href, auth: encode(valid ? { t: 'auth', token, tuneKey: device } : { t: 'auth' }) };
}
export class WebSocket extends globalThis.WebSocket {
  constructor(url: string | URL, protocols?: string | string[]) {
    const fixture = fixtureAdmission(url);
    super(fixture.url, protocols);
    this.addEventListener('open', () => this.send(fixture.auth));
  }
}
