// What the small objective line says, and where the beacon stands. One short line of plain words, for the next thing only: the
// frame's board and the numbers do the counting. The line fades on its own (./signs.ts). Things you can see for yourself, like
// a machine waking, don't get a line at all. Local.
import { me } from '../../player/player.ts';
import { PATH_SAMPLES } from './land.ts';
import { back, felled, greatTree, ROCK_LIST, standing, TREES, trunkDown, whole, type Rock, type Tree } from './chop.ts';
import { rack } from './depot.ts';
import { rackFrom } from './forge.ts';
import { giftState } from './gifts.ts';
import { haltUnder, onATrain, trainComing } from './cargo.ts';
import { halts } from './halts.ts';
import { job } from './job.ts';
import { FAR, ORIGIN } from './layout.ts';
import { L1, L2, TX, TZ, machine } from './lines.ts';
import { activeFrame, run, stationOf } from './run.ts';
import { beaconAt, setBeacon } from './signs.ts';
import { boilerAt } from './props.ts';
import { techGoal } from './tech.ts';

const nearest = <T extends { x: number; z: number }>(list: T[], ok: (t: T) => boolean) => {
  const b = me.body;
  if (!b) return null;
  let best: T | null = null,
    bd = Infinity;
  for (const t of list) {
    if (!ok(t)) continue;
    const d = Math.hypot(b.position.x - t.x, b.position.z - t.z);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
};
const canChop = (t: Tree) => standing(t) && !t.great;
export const nearestTree = () => nearest<Tree>(TREES, canChop);
export const nearestRock = () => nearest<Rock>(ROCK_LIST, whole);
const dist = (x: number, z: number) => {
  const b = me.body;
  return b ? Math.hypot(b.position.x - x, b.position.z - z) : Infinity;
};

/** Where to head while the machine sleeps: not straight at it over the gorge, but along the path, a little ahead of you. */
const ahead = { x: 0, z: 0 };
function pathAhead() {
  const b = me.body;
  const path = PATH_SAMPLES[0];
  if (!b || !path) return null;
  if (machine.distance(b.position.x, b.position.z) < 25) return beaconAt();
  let bd = Infinity,
    best = 0;
  for (let n = 0; n < path.length; n += 4) {
    const q = path[n]!;
    const d = (q[0] + ORIGIN.x - b.position.x) ** 2 + (q[1] - b.position.z) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  const q = path[Math.min(path.length - 1, best + 24)]!;
  ahead.x = q[0] + ORIGIN.x;
  ahead.z = q[1];
  return ahead;
}
/** What the chevron points at. */
export const arrowTarget = () => (run.mode === 'asleep' ? pathAhead() : beaconAt());

// DESIGN.md 11, show, don't tell: a line only says what nothing in the world can, and mostly it's the beacon's job. Empty means
// no line. A prompt over the thing, a frame's board and the numbers already say the rest.
export function objective(now: number) {
  const beam = (x: number, y: number, z: number) => setBeacon({ x, y, z }, now);
  const none = () => setBeacon(null, now);
  if (run.mode === 'waking' || (job.boiler === 3 && !job.rung.trains)) {
    none();
    return '';
  }
  if (run.mode === 'asleep') {
    beam(machine.flatbed.x, machine.flatbed.y + 2, machine.flatbed.z);
    return dist(machine.flatbed.x, machine.flatbed.z) < 25 ? '' : 'Follow the path.';
  }
  // Ancient technology you've got within reach, or what lets a slab down: the world says what it's for, so no line.
  const tech = techGoal();
  if (tech) {
    beam(tech.x, tech.y, tech.z);
    return '';
  }
  // A chest is what you wanted: go and get it.
  if (job.chest) {
    const c = giftState.crates().find((q) => q.content === job.chest);
    if (c) beam(c.x, c.y + 1, c.z);
    return job.chest === 'axe' && dist(TX, TZ) > 40 ? 'Walk home across your bridge.' : '';
  }
  if (job.ended) {
    // The end: no more jobs. The beacon and the chevron go to the shard across the sea, and you're free to look around.
    beam(FAR.x + ORIGIN.x + 10, 200, FAR.z + ORIGIN.z);
    return 'That was the whole test. Wander as long as you like.';
  }
  if (run.mode === 'feeding' || run.mode === 'laying' || run.mode === 'running') {
    none();
    return '';
  }
  if (run.mode === 'turning' || run.mode === 'shunting') {
    beam(rackFrom.x, rackFrom.y + 1, rackFrom.z);
    return '';
  }
  // The boiler's the last thing by hand.
  if (job.boiler === 1) {
    const q = boilerAt();
    beam(q.x, q.y + 2, q.z);
    return dist(q.x, q.z) > 60 ? 'Head home.' : '';
  }
  if (job.boiler === 2) {
    const c = L1.train.tr.cars[0]!;
    beam(c.x, c.y + 2, c.z);
    return back.big === 'boiler' ? 'Take it to the old train, at the camp.' : '';
  }
  const carried = back.logs + back.rails + back.stone + back.incoming;
  // Trains are on, and the pier's next: get on one.
  if (job.rung.trains && stationOf(L2)?.spec.rack === 'train' && activeFrame()) {
    const st = stationOf(L2)!;
    if (onATrain()) {
      beam(st.x, st.y + 2, st.z);
      return '';
    }
    if (trainComing() !== null && haltUnder()) {
      none();
      return ''; // the board says how long
    }
    if (dist(st.x, st.z) > 90 && rack.logs + rack.rails < 8) {
      const h = halts.filter((q) => q.k === L2.k).sort((p, q) => dist(p.x, p.z) - dist(q.x, q.z))[0];
      if (h) beam(h.x, h.y + 1, h.z);
      return 'Stand on a platform.';
    }
    if (carried && dist(st.x, st.z) < 40) beam(st.x, st.y + 2, st.z);
    else if (rack.logs + rack.rails > 0) beam(rack.x, rack.y + 2, rack.z);
    else beam(L2.train.tr.cars[0]!.x, L2.train.tr.cars[0]!.y + 2, L2.train.tr.cars[0]!.z);
    return '';
  }
  const st = activeFrame();
  if (!st) {
    none();
    return '';
  }
  if (st.wants('beam') > 0 && st.have.logs >= st.need('logs')) {
    // The one big thing.
    if (back.big === 'beam') {
      beam(st.x, st.y + 2, st.z);
      return '';
    }
    beam(greatTree.x, greatTree.y + (trunkDown() ? 2 : 14), greatTree.z);
    return trunkDown() ? '' : 'Fell the great tree.';
  }
  if (back.big) {
    beam(st.x, st.y + 2, st.z);
    return '';
  }
  const reach = dist(st.x, st.z) <= 8;
  // What it still needs that isn't on your back.
  const stillLogs = st.wants('logs') - back.logs,
    stillRails = st.wants('rails') - back.rails,
    stillStone = st.wants('stone') - back.stone;
  const room = back.room();
  if (!reach || carried === 0) {
    if (room > 0 && stillRails > 0) {
      beam(rackFrom.x, rackFrom.y + 1, rackFrom.z);
      return "Take rails from the forge's rack.";
    }
    if (room > 0 && stillLogs > 0 && st.spec.rack === 'cart') {
      if (rack.logs > 0) beam(rack.x, rack.y + 2, rack.z);
      else if (carried === 0) beam(st.x, st.y + 2, st.z);
      return '';
    }
    if (room > 0 && stillLogs > 0) {
      const t = nearestTree();
      if (t) beam(t.x, t.y + 9, t.z);
      return carried || felled.n ? '' : 'Chop a tree with an orange band.'; // once: the band and the beacon do it after that
    }
    if (room > 0 && stillStone > 0) {
      const r = nearestRock();
      if (r) beam(r.x, r.y + 3, r.z);
      return ROCK_LIST.every(whole) ? 'Break a rock with an orange band.' : '';
    }
  }
  beam(st.x, st.y + 2, st.z);
  return '';
}
