// Checkpoint durability and the running/paused lifecycle share one owner. Fatal status is checked at every write boundary.
import type { createSync } from '../../../src/world/sync.ts';
import type { RailwayApi } from '../../../src/world/railway-server.ts';
import { RAILWAY_PLAY_NS } from '../../../src/world/railway-namespace.ts';
import { LINE1_CATALOG } from '../../../src/sim/railway-line-layout.ts';
import { SERVER_ID } from '../../../src/net/ids.ts';
import type { Store } from '../store.ts';
import type { HostAway } from './host-away.ts';

type Msg = Record<string, unknown>;
export function createHostCheckpoint({
  sync,
  api,
  away,
  roomId,
  store,
  now,
  saveMs,
  awake,
  send,
  failed,
  whenCommandsDurable,
  maintainSupply,
  pauseActors,
  log,
}: {
  sync: ReturnType<typeof createSync>;
  api: RailwayApi;
  away: HostAway;
  roomId: string;
  store: Store;
  now: () => number;
  saveMs: number;
  awake: boolean;
  send: (message: Msg) => void;
  failed: () => boolean;
  whenCommandsDurable: () => Promise<void>;
  maintainSupply: () => void;
  pauseActors: () => void;
  log: (...a: unknown[]) => void;
}) {
  let running = false;
  let closed = false;
  let startup = true;
  let loaded = false; // startup finished without error
  let present = awake; // someone is here (or the caller simulates without a room): wake once loaded
  const namespace = RAILWAY_PLAY_NS;
  let startupError: string | null = null;
  const attach = () =>
    sync.attachWorld(
      {
        selfId: SERVER_ID,
        send: (message) => {
          if (running) send(message as Msg);
        },
        onMessage: () => () => {},
        onConnection: (fn) => (fn(true), () => {}),
      },
      {
        roomId,
        host: true,
        now,
        saveMs,
        recovery: {
          namespace,
          catalog: String(LINE1_CATALOG),
          read() {
            const doc = store.readSync(roomId);
            if (!doc) return null;
            away.read(doc);
            return doc.data;
          },
          async write(data) {
            // Once an apply fails, no newly started write may persist its partial mutation;
            // an already-started safe write can finish.
            if (failed()) throw new Error('server command storage failed');
            const updatedAt = away.updatedAt(startup);
            const result = await store.write(roomId, {
              tick: data.checkpoint.tick,
              writerId: SERVER_ID,
              data,
              updatedAt: new Date(updatedAt).toISOString(),
            });
            if (result.status !== 200) throw new Error(`railway recovery write refused (${result.status})`);
          },
        },
      },
    );
  let ready: Promise<void>;
  async function initialize() {
    attach();
    await sync.whenDurable();
    // No session survives a server restart: a held beam's carrier is away from now (maintainBeam), and keeps it if they
    // come back within the grace.
    // The room stood still from its last checkpoint: the away credit waits for a join.
    away.restore(sync.world.tick);
    startup = false;
    if (present) away.credit(); // whoever's joining sees the credited world in the startup checkpoint
    api.touchAll(); // every component, from change tick 0, for whoever joins
    sync.saveNow(true);
    await sync.whenDurable();
    loaded = !closed;
    if (present) wakeNow();
  }
  function wakeNow() {
    if (!loaded || closed || running || failed() || sync.worldStatus().recoveryError) return;
    const credited = away.credit();
    running = true;
    maintainSupply(); // regrowth and drop recovery catch up on the join, not a rule tick later
    if (credited) sync.saveNow(true);
  }

  return {
    start() {
      ready = initialize();
      // The caller can await readiness; the timer path also owns and reports startup failure.
      void ready.catch((e: unknown) => {
        startupError = e instanceof Error ? e.message : String(e);
        log(`world ${roomId}: recovery blocked`, startupError);
      });
      return ready;
    },
    running: () => running,
    canStep: () => running && !closed && !failed(),
    available: () => running && !closed && !sync.worldStatus().recoveryError,
    unavailable: (): 'storage' | 'starting' =>
      startupError || sync.worldStatus().recoveryError ? 'storage' : 'starting',
    state: () => ({ loaded, startupError, running }),
    async saveCommand() {
      // saveNow is a no-op while an older checkpoint is pending. Drain it first, then capture this command and
      // its receipt; waiting only for that older write would falsely acknowledge unsaved state.
      // A later apply may have failed before this callback starts OR while it awaits that older write.
      if (failed()) throw new Error('server command storage failed');
      await sync.whenDurable();
      if (failed()) throw new Error('server command storage failed');
      sync.saveNow(true);
      await sync.whenDurable();
    },
    /** Someone joined: a paused room applies its one away credit and simulates again. */
    wake() {
      present = true;
      wakeNow();
    },
    /** Nobody is here (after the hosted room's grace): stop simulating and save the stamp the away credit counts from. */
    pause() {
      present = false;
      pauseActors();
      if (!running || closed || failed()) return;
      running = false;
      away.pause();
      sync.saveNow(true);
    },
    paused: () => !running,
    async close(stopTimer: () => void, { save = true } = {}) {
      closed = true;
      stopTimer();
      try {
        await ready;
        await whenCommandsDurable();
        await sync.whenDurable();
        if (save) {
          sync.saveNow(true);
          await sync.whenDurable();
        }
      } finally {
        sync.detachWorld();
      }
    },
  };
}
export type HostCheckpoint = ReturnType<typeof createHostCheckpoint>;
