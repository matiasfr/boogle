import assert from 'node:assert/strict';
import type { World } from '../../src/ecs/index.ts';
import { RAIL_HALTS, type LineRef } from '../../src/sim/railway-lines.ts';
import { footingsOwed, stopsOf } from '../../src/sim/railway-queries.ts';
import { line, train } from '../../src/sim/railway-rows.ts';
import { TRAIN, TRAIN_PHASE, trainDir, trainPassesBy } from '../../src/sim/railway-train.ts';
import { balancedHold, cycleTicks, platformHoldPressure, servingSlots, trainGaps, trainPose, trainServes } from '../../src/sim/railway-trains.ts';

// A missed braking window can cost one headway. Allow another for uneven demand,
// plus one boarding dwell per open intermediate platform on the trip.
const MISSED_HEADWAYS = 2;
function servingBoilers(w: World, line: number) {
  return servingSlots(slot => train(w, slot), line).map(slot => train(w, slot).boiler);
}

export function serviceBudget(w: World, line: number, boilers = servingBoilers(w, line)) {
  return fleetBudget(line, stopsOf(w, line), boilers);
}
export function fleetBudget(line: LineRef, stops: readonly number[], boilers: readonly number[]) {
  assert.ok(boilers.length && stops.length >= 2, 'a requested service has track and trains');
  const cycle = Math.max(...boilers.map(boiler => cycleTicks(line, stops, boiler)));
  const headway = Math.ceil(cycle / boilers.length);
  const middle = stops.slice(1, -1).filter((_, i) =>
    !trainPassesBy(line, i + 1, 1, stops.length) || !trainPassesBy(line, i + 1, -1, stops.length)).length;
  return { headway, bound: MISSED_HEADWAYS * headway + middle * TRAIN.dwellTicks };
}

export class ServiceHealth {
  readonly pending = new Map<string, { id: number; dir: number; since: number; boilers: number[]; bound: number; overdue: boolean }>();
  readonly worst = new Map<number, number>();
  readonly stages = new Set<string>();
  readonly failures: string[] = [];
  private budgets = new Map<string, ReturnType<typeof serviceBudget>>();

  private readonly lines: readonly number[];
  private readonly joined = new Map<number, number>();
  constructor(lines: readonly number[], w: World) {
    this.lines = lines;
    // A seed's last arrival is a conservative latest possible join for an incumbent.
    for (const l of lines) for (const j of servingSlots(i => train(w, i), l))
      this.joined.set(j, train(w, j).arrived);
  }
  ask(w: World, id: number, dir: number, tick: number) {
    const h = RAIL_HALTS[id]!;
    if (!this.lines.includes(h.line) || this.there(w, id, dir)) return;
    const key = `${id}/${dir}`;
    if (this.pending.has(key)) return;
    // Size this call's headway with the fleet serving when it arrived. A train joining
    // at home still has its first half-circuit to run before it can serve homeward riders.
    // A newly joined train contributes only after half a cycle on the open line.
    // Before even the first train matures, use one cycle as the single-service budget.
    const stops = stopsOf(w, h.line);
    const slots = servingSlots(j => train(w, j), h.line);
    const mature = slots.filter(j => 2 * (tick - this.joined.get(j)!) >= cycleTicks(h.line, stops, train(w,j).boiler));
    const boilers = mature.map(j => train(w, j).boiler);
    if (!boilers.length) boilers.push(slots.map(j => train(w,j).boiler).reduce((a,b) =>
      cycleTicks(h.line, stops, a) >= cycleTicks(h.line, stops, b) ? a : b));
    const { bound } = serviceBudget(w, h.line, boilers);
    this.pending.set(key, { id, dir, since: tick, boilers, bound, overdue: false });
  }
  private there(w: World, id: number, dir: number) {
    const h = RAIL_HALTS[id]!;
    return servingSlots(j => train(w, j), h.line).some(slot => {
      const r = train(w, slot);
      return r.phase === TRAIN_PHASE.STAND && r.at === h.stop && trainDir(r) === dir;
    });
  }
  tick(w: World, tick: number) {
    for (const l of this.lines) for (const j of servingSlots(i => train(w, i), l))
      if (!this.joined.has(j)) this.joined.set(j, tick);
    for (const [key, p] of this.pending) {
      const h = RAIL_HALTS[p.id]!, stops = stopsOf(w, h.line);
      if (trainPassesBy(h.line, h.stop, p.dir, stops.length)) {
        if (p.overdue) this.failures.push(`${h.name}/${p.dir} withdrawn at ${tick} after ${tick - p.since} ticks when the head closed`);
        this.pending.delete(key); // The lay withdrew this head's call.
        continue;
      }
      const stage = `${h.line}/${stops.at(-1)}/${p.boilers.join(',')}`;
      let budget = this.budgets.get(stage);
      if (!budget) {
        budget = serviceBudget(w, h.line, p.boilers);
        this.budgets.set(stage, budget);
        this.stages.add(`${stage} h${budget.headway} b${budget.bound}`);
      }
      // An outstanding call spanning a lay gets the larger of its actual stage budgets.
      p.bound = Math.max(p.bound, budget.bound);
      const wait = tick - p.since;
      assert.ok(wait <= 3 * p.bound, `${h.name}/${p.dir} waited ${wait} ticks, over three times ${p.bound}`);
      if (wait === p.bound + 1) {
        p.overdue = true;
        const rows = (slot: number) => train(w, slot);
        const req = line(w, h.line).req;
        const pick = trainServes(rows, h.line, stops, h.stop, p.dir, tick);
        const poses = servingSlots(rows, h.line).map(j => {
          const r = train(w, j);
          const gap = trainGaps(rows, h.line, stops, j, tick);
          let state = 'running';
          if (r.phase === TRAIN_PHASE.STAND) {
            if (r.at < 0) state = 'waiting at signal';
            else if (tick < r.depart + TRAIN.dwellTicks) state = 'boarding dwell';
            else if (platformHoldPressure(rows, h.line, stops, j, r.at, req, tick)) state = 'spacing yields';
            else if (balancedHold({ row: rows, line: k => line(w, k), headExempt: slot => rows(slot).wagon && footingsOwed(w, h.line) },
              h.line, stops, j, r.at, tick)) state = 'spacing hold';
            else state = 'standing, spacing off';
          }
          return `#${j} ${trainPose(r, h.line, stops, tick).s}cm track${r.track} to${r.to} ${state} gaps ${gap?.ahead}/${gap?.behind}`;
        });
        this.failures.push(`${h.name}/${p.dir} asked ${p.since} with ${p.boilers.length} trains, tick ${tick}, bound ${p.bound}, assigned #${pick}; ${poses.join(', ')}`);
      }
      if (this.there(w, p.id, p.dir)) {
        if (p.overdue) this.failures.push(`${h.name}/${p.dir} served ${tick}, waited ${wait} (bound at service ${p.bound})`);
        this.worst.set(h.line, Math.max(this.worst.get(h.line) ?? 0, wait));
        this.pending.delete(key);
      }
    }
  }
  drain(w: World, tick: number, advance: () => void) {
    while (this.pending.size) {
      advance();
      this.tick(w, ++tick);

    }
  }
}
