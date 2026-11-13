// Recorded host admission, then every apply and tick on the unchanged classic rules. Inputs can be saved and
// replayed without consulting generators; results/state/hashes are copied at the boundary, never live references.
import { createSync } from '../../src/world/sync.ts';
import { RULES, installRules } from '../../src/world/rules/index.ts';
import { mulberry32 } from '../../src/sim/rng.ts';
import type { Edit, Land, Rules, Stream } from '../../src/world/rules/types.ts';
import { homeLand } from './land.ts';
import { makeNet } from './net.ts';

type Gen = (r: Stream, view: { rules: Rules; land: Land; tick: number }) => Record<string, unknown> | null | undefined;
const generators: Record<string, Gen> = Object.assign({}, ...RULES.map((m) => ('edits' in m ? m.edits : {})));
export const CLASSIC_OPS = Object.keys(generators);
export type TraceInput = { from: string; edit: Record<string, unknown>; controlled?: boolean; wait?: number };
export type TraceStep = {
  phase: 'admit' | 'apply' | 'tick';
  tick: number;
  op: string | null;
  accepted: boolean | null;
  result: unknown;
  edit: Record<string, unknown> | null;
  state: Record<string, unknown>;
  hashes: Record<string, number>;
};
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function recordTrace(seed: number, ops: readonly (string | TraceInput)[]) {
  const next = mulberry32(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const r: Stream = { next, int, pick: (xs) => xs[int(0, xs.length - 1)]!, chance: (p) => next() < p };
  const sync = createSync({ env: { protoRoom: true, tuneController: () => true } });
  const land = homeLand();
  const rules = installRules(sync, land);
  const net = makeNet();
  const host = net.add('host', true, 'host');
  net.add('alice', false, 'alice');
  net.add('bob', false, 'bob');
  sync.attachWorld(host.room, { roomId: 'classic-trace', host: true, storage: null, now: () => 1000 });
  sync.world.seed = seed;
  // Same starting resources as world-replay: no production rules changed to make an edit pass.
  for (const [i, kind] of [
    [212, 0],
    [230, 0],
    [250, 1],
  ] as const)
    rules.piles.drop(i, 188, kind, 64);
  rules.sites.addFreight(60);
  const steps: TraceStep[] = [];
  const inputs: TraceInput[] = [];
  function record(
    phase: TraceStep['phase'],
    edit: Record<string, unknown> | null,
    accepted: boolean | null,
    result: unknown,
  ) {
    steps.push(
      copy({
        phase,
        tick: sync.world.tick,
        op: edit ? String(edit.op) : null,
        accepted,
        result: result ?? null,
        edit,
        state: sync.snapshot().data,
        hashes: sync.stateHashes(),
      }),
    );
  }
  sync.onApplied((e: Edit, _tick: number, result: unknown) => record('apply', e, true, result));
  sync.onAfterTick(() => record('tick', null, null, null));
  for (const op of ops) {
    const edit = typeof op === 'string' ? generators[op]?.(r, { rules, land, tick: sync.world.tick }) : op.edit;
    if (!edit) continue;
    const input = typeof op === 'string' ? { from: 'host', edit } : op;
    inputs.push(copy(input));
    sync.setEnv({ tuneController: () => input.controlled !== false });
    const accepted = sync.receiveEdit(edit, input.from);
    record('admit', { ...edit, p: input.from, u: input.from }, accepted, null);
    // Explicit zero permits two admitted commands at the same revision before either applies.
    for (let t = 0; t < (input.wait ?? 3); t++) sync.updateWorld(0.1);
  }
  sync.detachWorld();
  return { inputs, steps };
}
