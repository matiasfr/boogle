// A railway save for watching the track layer at cruise: `--rail-seed q5-held` is Q4 laid and Q5's bill paid in full
// with the sea switch not yet pulled, so the 260 m double-track stretch (9 m/s, 29 s of laying) starts when the page
// pulls it (dev/look/evals/track-layer-cross.ts), not while the page is still mounting. Accepted ops only. Looks only.
import { act, advance, logs, rails, railwayAtQ5 } from '../../src/sim/railway-seed-route.ts';
import { railwayAtWorks, advanceWorks } from '../../src/sim/railway-seed-works.ts';
import { need, restore } from '../../src/sim/railway-drive.ts';
import { rail, qjob, trains } from '../../src/sim/railway-rows.ts';
import { Q7, LINE2_STATIONS } from '../../src/sim/railway-line2-layout.ts';
import { retainedEndBlock } from '../../src/sim/railway-trains.ts';
import { seedDoc } from './ring-mid-seed.ts';

export const layStage = (stage: string) =>
  stage === 'q5-held' || stage === 'q7-retained' || stage === 'q7-signal' ? stage : null;
export function buildLayDoc(stage = 'q5-held') {
  if (stage !== 'q5-held') return buildQ7Doc(stage === 'q7-signal');
  const seed = railwayAtQ5('q4-done');
  logs(seed, 'a', 'Q5', 24);
  rails(seed, 'b', 'Q5', 24);
  return seedDoc(seed);
}

/** Look-only accepted-op replay: Q7 opens on a Pier arrival, or while a retained departure holds its old signal.
 * Save at final funding, 177 ticks before completion, so the page can mount and frame the live transition. */
function buildQ7Doc(signal: boolean) {
  const seed = railwayAtWorks('crossing-done');
  const [logs, rails] = LINE2_STATIONS[Q7]!.bill;
  for (let guard = 0; rail(seed.w).depot !== logs || rail(seed.w).depotRails !== rails; guard++) {
    need(guard < 6000, 'Q7 look: kit delivered');
    advanceWorks(seed, 1);
  }
  let lastPid = '';
  for (const kind of [0, 2])
    for (let guard = 0; kind ? rail(seed.w).depotRails : rail(seed.w).depot; guard++) {
      need(guard < 8, 'Q7 look: depot emptied');
      const pid = guard % 2 ? 'b' : 'a';
      const n = act(seed, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake');
      need(n > 0, 'Q7 look: kit taken');
      const last = kind === 2 && rail(seed.w).depotRails === 0;
      const count = n - (last ? 1 : 0);
      if (count)
        need(act(seed, pid, 'rail.deposit', { station: 'Q7', kind, n: count }) === count, 'Q7 look: kit deposited');
      if (last) lastPid = pid;
    }
  // Chosen by scanning one ordinary train cycle; these assertions fail if later scheduling changes the beat.
  advanceWorks(seed, signal ? 651 : 158);
  need(act(seed, lastPid, 'rail.deposit', { station: 'Q7', kind: 2, n: 1 }) === 1, 'Q7 look: final rail');
  const future = { w: restore(seed.w), t: seed.t };
  for (let guard = 0; !qjob(future.w, Q7).completion; guard++) {
    need(guard < 6000, 'Q7 look: deck laid');
    advance(future, 1);
  }
  const rows = trains(future.w);
  need(
    rows.some((r) => r.origin === 72650 && r.phase === (signal ? 1 : 0) && retainedEndBlock(r, 1, future.t)),
    'Q7 look: retained train',
  );
  if (signal)
    need(
      rows.some((r) => r.phase === 0 && r.at === -1 && r.track === 0 && r.from === 52780),
      'Q7 look: old-signal waiter',
    );
  console.log(`Q7 look: ${signal ? 'signal' : 'platform'}, seed tick ${seed.t}, completion ${future.t}`);
  return seedDoc(seed);
}
