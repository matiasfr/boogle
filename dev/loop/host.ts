// The real railway host in Node, for the loop runner: src/world/railway-server.ts's `install`, the code the room's
// host runs, behind a stub room. Every action goes through its `act`, so the host's reach check (railValid) judges it
// from a stub Actor standing where the runner says the player is, then railApply, railSettle and the commit run as
// on the server. Ticks are the host's own railTick. Tunables are their catalog defaults (src/sim/tune.ts).
import { install, type Actor, type RailwayApi } from '../../src/world/railway-server.ts';
import { TUNABLES } from '../../src/sim/tune.ts';
import type { RailAction, RailResult } from '../../src/sim/railway.ts';
import type { Point } from './graph.ts';

type StateHandlers = { serialize(): unknown; load(json: unknown): void };
export type Host = {
  api: RailwayApi;
  tick(): number;
  advance(): void;
  act(pid: string, op: string, fields: Partial<RailAction>, at: Point): RailResult;
  snapshot(): unknown;
};

/** Stands at `at` (world cm); `y` undefined means on the ground, below every raised target. Cadence always passes:
 * the runner spaces its presses by the action times it assumes. */
const standingAt = (at: Point): Actor => ({
  reach: (x, z, r) => (at.x - x) ** 2 + (at.z - z) ** 2 <= r * r,
  height: (y, r) => at.y !== undefined && Math.abs(at.y - y) <= r,
  cadence: () => true,
});

export function createHost(pids: readonly string[], from?: { snapshot: unknown; tick: number }): Host {
  let onTick: ((tick: number) => void) | null = null;
  let state: StateHandlers | null = null;
  const world = { tick: from?.tick ?? 0, seed: 1, epochMs: 0 };
  const sync = {
    world,
    registerState(_key: string, handlers: StateHandlers) {
      state = handlers;
    },
    onTick(fn: (tick: number) => void) {
      onTick = fn;
    },
    roomStep: () => world.tick,
  };
  const defaults = new Map<string, number>(TUNABLES.map((t) => [t.key, t.def]));
  const tune = { get: (key: string) => defaults.get(key)! };
  const replication = { define() {}, touch() {}, touchAll() {} };
  const api = install(
    sync as unknown as Parameters<typeof install>[0],
    { railTune: tune } as unknown as Parameters<typeof install>[1],
    replication as unknown as Parameters<typeof install>[2],
  );
  if (!state || !onTick) throw new Error('loop host: the railway did not register its state and tick');
  const handlers: StateHandlers = state,
    tickFn: (tick: number) => void = onTick;
  if (from) handlers.load(from.snapshot);
  else for (const pid of pids) api.session(pid, 1);
  return {
    api,
    tick: () => world.tick,
    advance() {
      world.tick++;
      tickFn(world.tick);
    },
    act(pid, op, fields, at) {
      const a = api.account(pid)!;
      const e: RailAction = { op, epoch: a.epoch, request: a.request + 1, ...fields };
      if (op === 'rail.wake') e.tk = world.tick;
      return api.act(pid, e, standingAt(at));
    },
    snapshot: () => JSON.parse(JSON.stringify(handlers.serialize())) as unknown,
  };
}
