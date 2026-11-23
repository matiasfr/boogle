import assert from 'node:assert/strict';
import type { World } from '../../src/ecs/index.ts';
import { RAIL_HALTS } from '../../src/sim/railway-lines.ts';
import { stopsOf } from '../../src/sim/railway-queries.ts';
import { train } from '../../src/sim/railway-rows.ts';
import { TRAIN, TRAIN_PHASE, trainDir, trainPassesBy } from '../../src/sim/railway-train.ts';
import { cycleTicks, servingSlots, trainPose } from '../../src/sim/railway-trains.ts';

// A missed braking window can cost one headway. Allow another for uneven demand,
// plus one boarding dwell per open intermediate platform on the trip.
const MISSED_HEADWAYS = 2;
export function serviceBudget(w: World, line: number) {
  const stops = stopsOf(w, line), rows = (slot: number) => train(w, slot);
  const fleet = servingSlots(rows, line);
  assert.ok(fleet.length && stops.length >= 2, 'a requested service has track and trains');
  const cycle = Math.max(...fleet.map(slot => cycleTicks(line, stops, rows(slot).boiler)));
  const headway = Math.ceil(cycle / fleet.length);
  const middle = stops.slice(1, -1).filter((_, i) =>
    !trainPassesBy(line, i + 1, 1, stops.length) || !trainPassesBy(line, i + 1, -1, stops.length)).length;
  return { headway, bound: MISSED_HEADWAYS * headway + middle * TRAIN.dwellTicks };
}

export class ServiceHealth {
  readonly pending = new Map<string, { id: number; dir: number; since: number; bound: number }>();
  readonly worst = new Map<number, number>();
  readonly stages = new Set<string>();
  readonly failures: string[] = [];
  private budgets = new Map<string, ReturnType<typeof serviceBudget>>();

  private readonly lines: readonly number[];
  constructor(lines: readonly number[]) { this.lines = lines; }
  ask(w: World, id: number, dir: number, tick: number) {
    const h = RAIL_HALTS[id]!;
    if (!this.lines.includes(h.line) || this.there(w, id, dir)) return;
    const key = `${id}/${dir}`;
    if (!this.pending.has(key)) this.pending.set(key, { id, dir, since: tick, bound: 0 });
  }
  private there(w: World, id: number, dir: number) {
    const h = RAIL_HALTS[id]!;
    return servingSlots(j => train(w, j), h.line).some(slot => {
      const r = train(w, slot);
      return r.phase === TRAIN_PHASE.STAND && r.at === h.stop && trainDir(r) === dir;
    });
  }
  tick(w: World, tick: number) {
    for (const [key, p] of this.pending) {
      const h = RAIL_HALTS[p.id]!, stops = stopsOf(w, h.line);
      if (trainPassesBy(h.line, h.stop, p.dir, stops.length)) {
        this.pending.delete(key); // The lay withdrew this head's call.
        continue;
      }
      const fleet = servingSlots(j => train(w, j), h.line);
      const stage = `${h.line}/${stops.at(-1)}/${fleet.map(j => train(w, j).boiler).join(',')}`;
      let budget = this.budgets.get(stage);
      if (!budget) {
        budget = serviceBudget(w, h.line);
        this.budgets.set(stage, budget);
        this.stages.add(`${stage} h${budget.headway} b${budget.bound}`);
      }
      // An outstanding call spanning a lay gets the larger of its actual stage budgets.
      p.bound = Math.max(p.bound, budget.bound);
      const wait = tick - p.since;
      if (wait === p.bound + 1) {
        const poses = fleet.map(j => {
          const r = train(w, j);
          return `#${j} ${Math.round(trainPose(r,h.line,stops,tick).s)}cm track${r.track} to${r.to} phase${r.phase}`;
        });
        this.failures.push(`${h.name}/${p.dir} asked ${p.since}, tick ${tick}, bound ${p.bound}; ${poses.join(', ')}`);
      }
      if (this.there(w, p.id, p.dir)) {
        if (wait > p.bound) this.failures.push(`${h.name}/${p.dir} served ${tick}, waited ${wait} (bound ${p.bound})`);
        this.worst.set(h.line, Math.max(this.worst.get(h.line) ?? 0, wait));
        this.pending.delete(key);
      }
    }
  }
  drain(w: World, tick: number, advance: () => void) {
    while (this.pending.size) {
      advance();
      this.tick(w, ++tick);
      for (const p of this.pending.values())
        if (tick - p.since > p.bound * 2) {
          this.failures.push(`undrained ${RAIL_HALTS[p.id]!.name}/${p.dir} asked ${p.since}, tick ${tick}, bound ${p.bound}`);
          return;
        }
    }
  }
}
