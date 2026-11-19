// The turnouts' moving parts (docs/plans/turnouts.md, step 6): every junction's two switch blades, the tie bar across
// their tips, the rod to its points lever and the lever's arm (a line's lever box too: Home's three are the station's),
// in one box batch, rewritten only while a junction changes. The blades lie for the road the next train takes
// (./turnout-route.ts `routeOf`) and ease over in 0.4 s with a clank: sprung points, with no lever for players to throw
// (the owner, on the plan's open question 2). The rails they are cut from are the lines' (track.ts `points`). Nothing
// here is solid. Local: a pure function of accepted rows (the trains, the shunt, the cart), the same on every tab; no
// op, state or message.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { clank } from '../../render/machine-sfx.ts';
import { lerp, smoothstep } from '../../math-pure.ts';
import { H } from '../../place/terrain.ts';
import { KIT, type Blade, type XZY } from '../../place/turnout.ts';
import { movedBy } from '../../place/junctions.ts';
import { line2Completed } from '../../sim/railway-queries-line2.ts';
import { createBoxBatch } from './box-batch.ts';
import { createShuntPath } from './shunt-path.ts';
import type { TrackPoint } from './track.ts';
import { routeOf, routeRows } from './turnout-route.ts';

const RAIL = '#4c5058',
  IRON = '#3c3a36',
  POST = '#5c4530',
  BRASS = '#e6a33e';
/** How far a points lever's arm leans either way from upright (radians), and its length. */
const LEAN = 0.45,
  ARM = 0.85;
/** Seconds the blades take to go over. */
const THROW_S = 0.4;
/** The rails' centre over their height (track.ts TOP), and a rail's height. */
const TOP = 0.1,
  RAIL_H = 0.12;
/** Where the tie bar crosses the blades, metres from their tips. */
const TIE = 0.25;
type Shown = 'hidden' | 'plain' | 'live';

/** A blade's tip, middle and heel and the tie bar's point on it, set for the through road (0) and the diverging road
 * (1): `Blade.at` is a straight blend between them, so a frame only blends. */
const poses = (blade: Blade) =>
  [0, 1].map((k) => [0, blade.to / 2, blade.to, TIE].map((d) => blade.at(d, k))) as [XZY[], XZY[]];
const blend = (a: XZY, b: XZY, k: number): XZY => ({
  x: lerp(a.x, b.x, k),
  y: lerp(a.y, b.y, k),
  z: lerp(a.z, b.z, k),
});

/** `points`: every junction whose parts are drawn: both lines' (track.ts `points`, J1 to J9), the railhead's (J10,
 * moving with the head) and the greybox stack's (J12). */
export function createTurnoutBlades(adapter: RailwayAdapter, owner: OwnedView, points: readonly TrackPoint[]) {
  const read = adapter.read;
  const shuntPath = createShuntPath();
  const batch = createBoxBatch(owner, points.length * 10);
  const junctions = points.map((point) => {
    const { j, t } = point;
    // The lever: where its arm turns (Home's on the station's box, a line's on its own box on the headblocks, J8's
    // mirrored across the track), its heading, and which way across it the track is.
    const stand = j.stand,
      c = j.through(-KIT.leverBack),
      line = j.leverAcross ? { x: 2 * c.x - t.lever.x, z: 2 * c.z - t.lever.z } : t.lever,
      at = stand ?? line,
      yaw = stand?.yaw ?? t.lever.yaw;
    const pivot = { x: at.x, z: at.z, y: stand ? H(stand.x, stand.z) + 0.36 : t.lever.y + 0.04 + 0.3 };
    // The box's local x across its heading (the way it leans), toward the track where that is.
    const toward = Math.sign((t.toe.x - at.x) * Math.cos(yaw) - (t.toe.z - at.z) * Math.sin(yaw)) || 1;
    return {
      point,
      blades: t.blades.map(poses),
      lever: { pivot, yaw, toward, own: !stand },
      shown: 'hidden' as Shown,
      from: 0,
      to: 0 as 0 | 1,
      u: 1,
      /** Metres along its line it stands from where its turnout was built (TrackPoint.moved), as last drawn. */
      ds: 0,
    };
  });
  let settled = false;

  /** Where the junction being drawn has moved to (TrackPoint.moved): added to every point of it. */
  const by = { x: 0, y: 0, z: 0 };
  /** A box from `a` to `b` (world, centres), `w` wide and `h` high, `dy` over them. */
  const span = (a: XZY, b: XZY, w: number, h: number, dy: number, colour: string) => {
    const dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz);
    batch.box(
      (a.x + b.x) / 2 + by.x,
      (a.y + b.y) / 2 + dy + by.y,
      (a.z + b.z) / 2 + by.z,
      w,
      h,
      len,
      colour,
      Math.atan2(dx, dz),
      -Math.atan2(b.y - a.y, len),
    );
  };
  function draw() {
    batch.begin();
    for (const s of junctions) {
      if (s.shown === 'hidden') continue;
      const { j, t, from } = s.point;
      // A moving junction's parts translate along its straight, evenly graded line.
      Object.assign(by, movedBy(j, s.ds));
      if (s.shown === 'plain') {
        // No turnout here (yet, or any more): the cut is plain rail again, the through road's inner rail.
        const rail = t.blades[0];
        span(rail.plain(from), rail.plain(rail.to), KIT.rail, RAIL_H, TOP, RAIL);
        continue;
      }
      const k = lerp(s.from, s.to, smoothstep(0, 1, s.u));
      const [through, diverging] = s.blades.map(([set0, set1]) => set0.map((p, n) => blend(p, set1[n]!, k)));
      for (const [tip, mid, heel] of [through!, diverging!]) {
        span(tip!, mid!, KIT.rail * KIT.bladeTip, RAIL_H, TOP, RAIL);
        span(mid!, heel!, KIT.rail * KIT.bladeHeel, RAIL_H, TOP, RAIL);
      }
      // The tie bar across the tips, under the rails' heads; the rod from the blade on the lever's side to the lever.
      const a = through![3]!,
        b = diverging![3]!,
        { pivot, yaw, toward, own } = s.lever;
      span(a, b, 0.08, 0.03, 0.06, IRON);
      const near = (a.x - b.x) * (pivot.x - b.x) + (a.z - b.z) * (pivot.z - b.z) > 0 ? a : b;
      span(near, { ...pivot, y: near.y }, 0.05, 0.03, 0.06, IRON);
      if (own) batch.box(pivot.x + by.x, pivot.y - 0.15 + by.y, pivot.z + by.z, 0.5, 0.3, 0.8, POST, yaw);
      // The arm leans away from the track for the through road and toward it for the diverging road.
      const lean = toward * LEAN * (1 - 2 * k);
      batch.box(
        pivot.x - Math.sin(lean) * Math.cos(yaw) * (ARM / 2) + by.x,
        pivot.y + Math.cos(lean) * (ARM / 2) + by.y,
        pivot.z + Math.sin(lean) * Math.sin(yaw) * (ARM / 2) + by.z,
        0.08,
        ARM,
        0.08,
        BRASS,
        yaw,
        0,
        lean,
      );
    }
    batch.commit();
  }

  function update(dt: number) {
    const w = read.world(),
      whole = read.whole();
    const rows = routeRows(w, read.tickNow(), whole, shuntPath);
    const legLaid = line2Completed(w) >= 1;
    let dirty = !settled;
    for (const s of junctions) {
      const p = s.point;
      const shown: Shown = !p.laid() ? 'hidden' : p.retired() || (p.j.when === 'leg' && !legLaid) ? 'plain' : 'live';
      const ds = p.moved?.() ?? 0;
      if (ds !== s.ds) {
        s.ds = ds;
        if (shown !== 'hidden') dirty = true;
      }
      const to = shown === 'live' ? routeOf(ds ? { j: { ...p.j, s: p.j.s + ds }, t: p.t } : p, rows) : 0;
      // Points that come into view, or a first or restored frame, are simply where they lie; a live change throws.
      const snap = !settled || shown !== s.shown;
      if (shown !== s.shown) dirty = true;
      s.shown = shown;
      if (to !== s.to) {
        s.from = lerp(s.from, s.to, smoothstep(0, 1, s.u));
        s.to = to;
        s.u = snap ? 1 : 0;
        if (!snap) {
          const toe = p.j.through(p.j.dir * ds);
          clank(toe.x, toe.z);
        }
        dirty = true;
      } else if (snap) s.u = 1;
      if (s.u < 1) {
        s.u = Math.min(1, s.u + dt / THROW_S);
        dirty = true;
      }
    }
    settled = whole;
    if (dirty) draw();
  }
  return {
    update,
    /** A restore or resync: the next frame sets every junction where it lies, without a throw. */
    restore() {
      settled = false;
    },
  };
}
