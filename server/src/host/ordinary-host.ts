// Prototype rooms need only a continuously running clock and the existing guarded checkpoint adapter.
import { createSync } from '../../../src/world/sync.ts';
import { STEP_MS } from '../../../src/world/room-clock.ts';
import { SERVER_ID } from '../../../src/net/ids.ts';
import type { StepMeter } from './step-meter.ts';
import type { Store } from '../store.ts';

// The room clock (src/world/room-clock.ts): a 60 Hz step timer; rules run every RULE_STEPS steps inside sync.stepWorld.
// Saves skip unchanged state, but persist the advancing room clock at least this often, and always on close.
const TICK_SAVE_MS = 30000;

type Msg = Record<string, unknown>;
export type WorldHostOptions = {
  roomId: string;
  store: Store;
  saveMs?: number;
  tick?: boolean; // run the step timer (default true)
  meter?: StepMeter; // the step timer's lateness, for the status route (step-meter.ts)
  pidOf?: (sid: string) => string | null; // the hosted room's binding of each session to its player
  tuneController?: (sid: string) => boolean; // explicit operator assignment, never elected from room leadership
  log?: (...a: unknown[]) => void;
};

export function createWorldHost({
  roomId,
  store,
  saveMs = 2000,
  tick = true,
  meter,
  log = () => {},
}: WorldHostOptions) {
  const sync = createSync();
  const sendFns = new Set<(msg: Msg) => void>();
  let writing: Promise<unknown> = Promise.resolve();
  let writeError: Error | null = null;
  let writeSequence = 0;

  // Synchronous like localStorage: the sync reads it once on becoming host, and writes on every save.
  const storage = {
    getItem() {
      const doc = store.readSync(roomId);
      return doc ? JSON.stringify(doc.data) : null;
    },
    setItem(_key: string, json: string) {
      const data = JSON.parse(json);
      const doc = { tick: data.tick, writerId: SERVER_ID, data, updatedAt: new Date().toISOString() };
      const sequence = ++writeSequence;
      writing = store
        .write(roomId, doc)
        .then((r) => {
          if (r.status !== 200) throw new Error(`save refused (${r.status}): ${JSON.stringify(r.body)}`);
          if (sequence === writeSequence) writeError = null;
        })
        .catch((error: unknown) => {
          const failure = error instanceof Error ? error : new Error(String(error));
          if (sequence === writeSequence) writeError = failure;
          log(`world ${roomId}: save failed`, failure.message);
        });
    },
  };
  sync.attachWorld(
    {
      selfId: SERVER_ID,
      send: (msg) => {
        for (const fn of sendFns) fn(msg as Msg);
      },
      onMessage: () => () => {},
      onConnection: (h) => (h(true), () => {}),
    },
    { roomId, host: true, storage, now: Date.now, saveMs },
  );

  let last = performance.now(),
    tickSaved = last;
  const timer = tick
    ? setInterval(() => {
        const now = performance.now();
        meter?.timer(now);
        sync.stepWorld(Math.min(now - last, 1000));
        last = now;
        if (now - tickSaved > TICK_SAVE_MS) {
          tickSaved = now;
          sync.saveNow(true);
        }
      }, STEP_MS)
    : null;
  timer?.unref();

  return {
    sync,
    onSend(fn: (msg: Msg) => void) {
      sendFns.add(fn);
      return () => sendFns.delete(fn);
    },
    // Host-mode sync consumes no client messages. Prototypes keep their room-level peer relay.
    deliver(_msg: unknown, _from: string) {},
    wake() {},
    pause() {},
    depart(_sid: string) {},
    roomStatus: () => ({ noSave: sync.worldStatus().badSave }),
    step: (dt: number) => sync.stepWorld(dt * 1000),
    status: () => ({ tick: sync.world.tick, ...sync.worldStatus() }),
    async close({ save = true } = {}) {
      if (timer) clearInterval(timer);
      if (save) sync.saveNow(true);
      sync.detachWorld();
      await writing;
      if (save && writeError) throw writeError;
      if (save && sync.worldStatus().badSave) throw new Error(`world ${roomId}: saved state did not load cleanly`);
    },
  };
}
export type WorldHost = ReturnType<typeof createWorldHost>;
