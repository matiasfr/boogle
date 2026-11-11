// Line one's part of the load check (docs/plans/ecs-migration-railway.md, M8b): its conditions on the rows and the
// world queries. Run by railwayCheck (./railway-check.ts) after its own conditions.
//
//   checkLine1(w)    T1 to T3's bounds, order, funding and laying; the axe; the upgraded sources; rock and hardwood
//                    work; stone conservation; the great beam (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { LINE1_STATIONS, lineBeamGround } from './railway-line-layout.ts';
import { RAIL_STONE } from './railway-works-layout.ts';
import { Pile } from './railway-components.ts';
import { account, accounts, beam, forge, hardwoods, rail, rocks, trees, works } from './railway-rows.ts';
import { carried, railJobs, scheduleOf } from './railway-queries.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** Line one's whole-world invariants; throws on the first broken one. */
export function checkLine1(w: World) {
  const r0 = rail(w);
  const jobs = railJobs(w);
  jobs.forEach(({ job: j, run }, index) => {
    const spec = LINE1_STATIONS[index]!;
    const schedule = scheduleOf(spec, j);
    for (const n of [
      j.stock,
      run.allocation,
      run.used,
      j.delivered,
      run.elapsed,
      run.lastTick,
      j.stoneStock,
      run.stoneAllocation,
      run.stoneUsed,
      j.stoneDelivered,
    ])
      if (!railInt(n)) bad('job bounds');
    if (!railInt(j.start, RAILWAY_MAX_INT, -1) || !railInt(j.completion, 1)) bad('job bounds');
    if (run.elapsed > schedule.totalTicks || j.stock > spec.bill[0] || j.stoneStock > spec.bill[1]) bad('job bounds');
    if (index > 0 && !jobs[index - 1]!.job.completion && (j.start >= 0 || j.delivered > 0 || j.stoneDelivered > 0))
      bad('ordered stations');
    if (j.start < 0) {
      if (
        run.allocation ||
        run.used ||
        run.elapsed ||
        j.completion ||
        run.stoneAllocation ||
        run.stoneUsed ||
        j.stock !== j.delivered ||
        j.stoneStock !== j.stoneDelivered
      )
        bad('unfunded job');
      if (j.stock === spec.bill[0] && j.stoneStock === spec.bill[1] && !spec.beam) bad('unstarted full job');
    } else {
      const fraction = Math.max(0, run.elapsed - schedule.depositTicks - schedule.feedTicks) / schedule.layTicks;
      if (
        r0.awake < 0 ||
        j.start < r0.awake + 31 ||
        run.lastTick < j.start ||
        j.stock ||
        j.stoneStock ||
        j.delivered !== spec.bill[0] ||
        j.stoneDelivered !== spec.bill[1] ||
        run.used !== Math.min(spec.bill[0], Math.floor(fraction * spec.bill[0])) ||
        run.stoneUsed !== Math.min(spec.bill[1], Math.floor(fraction * spec.bill[1])) ||
        run.allocation + run.used !== spec.bill[0] ||
        run.stoneAllocation + run.stoneUsed !== spec.bill[1] ||
        j.completion !== Number(run.elapsed === schedule.totalTicks)
      )
        bad('funded job');
    }
  });
  if (r0.axe && !(forge(w).lit >= 0)) bad('axe before the forge');
  const ts = trees(w);
  if (
    ts.some((t) => t.left > (t.big ? 15 : 10)) ||
    ts.some((t) => !railInt(t.work, 15)) ||
    ts.some((t) => t.big && !r0.axe)
  )
    bad('upgraded source');
  const rs = rocks(w);
  if (rs.some((r) => (r.left > 0 && r.age !== 0) || 8 - r.left > 2 * r.work || 8 - r.left < r.work)) bad('rock work');
  if (hardwoods(w).some((h) => 15 - h.left > h.work || h.work % 5 !== 0)) bad('hardwood work');
  let piled = 0;
  w.each([Pile], (_id, p) => (piled += p.kind === 1 ? p.n : 0));
  const stone =
    rs.reduce((n, r) => n + r.left, 0) +
    accounts(w).reduce((n, a) => n + a.stone, 0) +
    piled +
    r0.stoneRack +
    works(w).stone +
    jobs.reduce((n, { job: j, run }) => n + j.stoneStock + run.stoneAllocation + run.stoneUsed, 0);
  if (stone !== RAIL_STONE + r0.stoneProduced) bad('stone conservation');
  const b = beam(w);
  const [t2, t3] = [jobs[1]!.job, jobs[2]!.job];
  if (b.state === 'ground' ? !lineBeamGround(b.x, b.y, b.z) : b.age !== 0) bad('beam ground');
  if (b.state === 'standing' ? b.work >= 12 : b.work !== 12) bad('beam work');
  if (b.work && !t2.completion) bad('beam work before T3');
  if (b.state === 'held') {
    const a = account(w, b.holder);
    if (!a || b.epoch < 1 || b.epoch > a.epoch || carried(a) !== 0) bad('beam holder');
  } else if (b.holder || b.epoch) bad('beam orphan identity');
  // The beam may be laid before the 40 logs: allocated with the job unfunded, never with its bill already full.
  const laid = b.state === 'allocated' || b.state === 'used';
  if (
    (t3.start >= 0 && !laid) ||
    (t3.start < 0 && (b.state === 'used' || (laid && t3.stock === 40))) ||
    (b.state === 'used') !== !!t3.completion
  )
    bad('beam allocation');
}
