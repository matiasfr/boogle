// Internal progression labels for playdata, retained after removing the player-facing objective (DESIGN.md 11).
// These strings are telemetry only: no HUD, world beacon or arrow reads them. Local.
import { me } from '../../player/player.ts';
import { back, felled, ROCK_LIST, trunkDown, whole } from './chop.ts';
import { rack } from './depot.ts';
import { haltUnder, onATrain, trainComing } from './cargo.ts';
import { job } from './job.ts';
import { L2, TX, TZ, machine } from './lines.ts';
import { activeFrame, run, stationOf } from './run.ts';
import { boilerAt } from './props.ts';
import { hasTechGoal } from './tech.ts';

const dist = (x: number, z: number) => {
  const b = me.body;
  return b ? Math.hypot(b.position.x - x, b.position.z - z) : Infinity;
};

/** Keep the previous label ordering and empty transitions so old and new playdata remain comparable. */
export function objective() {
  if (run.mode === 'waking' || (job.boiler === 3 && !job.rung.trains)) return '';
  if (run.mode === 'asleep') return dist(machine.flatbed.x, machine.flatbed.z) < 25 ? '' : 'Follow the path.';
  if (hasTechGoal()) return '';
  if (job.chest) return job.chest === 'axe' && dist(TX, TZ) > 40 ? 'Walk home across your bridge.' : '';
  if (job.ended) return 'That was the whole test. Wander as long as you like.';
  if (
    run.mode === 'feeding' ||
    run.mode === 'laying' ||
    run.mode === 'running' ||
    run.mode === 'turning' ||
    run.mode === 'shunting'
  )
    return '';
  if (job.boiler === 1) {
    const q = boilerAt();
    return dist(q.x, q.z) > 60 ? 'Head home.' : '';
  }
  if (job.boiler === 2) return back.big === 'boiler' ? 'Take it to the old train, at the camp.' : '';
  const carried = back.logs + back.rails + back.stone + back.incoming;
  if (job.rung.trains && stationOf(L2)?.spec.rack === 'train' && activeFrame()) {
    const st = stationOf(L2)!;
    if (onATrain() || (trainComing() !== null && haltUnder())) return '';
    return dist(st.x, st.z) > 90 && rack.logs + rack.rails < 8 ? 'Stand on a platform.' : '';
  }
  const st = activeFrame();
  if (!st) return '';
  if (st.wants('beam') > 0 && st.have.logs >= st.need('logs'))
    return back.big === 'beam' || trunkDown() ? '' : 'Fell the great tree.';
  if (back.big) return '';
  const reach = dist(st.x, st.z) <= 8;
  const stillLogs = st.wants('logs') - back.logs,
    stillRails = st.wants('rails') - back.rails,
    stillStone = st.wants('stone') - back.stone;
  const room = back.room();
  if (!reach || carried === 0) {
    if (room > 0 && stillRails > 0) return '';
    if (room > 0 && stillLogs > 0 && st.spec.rack === 'cart') return '';
    if (room > 0 && stillLogs > 0) return carried || felled.n ? '' : 'Chop an ordinary tree.';
    if (room > 0 && stillStone > 0) return ROCK_LIST.every(whole) ? 'Break a rock with an orange band.' : '';
  }
  return '';
}
