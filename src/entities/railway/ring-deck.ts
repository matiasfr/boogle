// Line 2 past Q6, drawn from the room's rows (ring-island-build1, R4a): the pier's second track and Q7's double deck.
//  - The relay: once Q7 is laid the up track runs on from the old merge (the turnout before s 556, retired from the
//    track: ./track.ts `retire`) to the pier head as plain double track, with the bents' caps, legs and stringers that
//    carry it. It drops in from the old merge outward, once, on the live edge.
//  - Q7's deck: the double deck over bents 1-6 (the bents are ./crossing-view.ts's), laid a panel at a time as the job
//    lays them (`linePanelCount`), planks, both tracks' rails, stringers, and the plank footway on its east edge from
//    the pad to where the railhead's walkway begins. Solid as it is laid (one slab a panel); the sim reads none of it.
// Local view over the read facade (`adapter.read`); a restore shows what is laid without dropping it.
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { H, slab } from '../../place/land.ts';
import { UP_LAT } from '../../place/layout.ts';
import { LINE2_STATIONS, Q7 } from '../../sim/railway-line2-layout.ts';
import { RING_WALK } from '../../sim/railway-ring-layout.ts';
import { linePanelCount } from '../../sim/railway-line-schedule.ts';
import { line2Jobs, q7Laid, timingOf } from '../../sim/railway-queries.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { createBoxBatch } from './works-box-view.ts';
import { RING_S, line2At, line2World, line2Y } from './line2-path.ts';

/** The formation: lat -5.8 to +1.8, the down track at 0 and the up track at UP_LAT (src/sim/railway-ring-layout.ts
 * RING_FORMATION), 7.6 m across, planks on a 0.04 m-proud deck. */
const LEFT = -5.8,
  RIGHT = 1.8,
  WIDTH = RIGHT - LEFT,
  MID = (LEFT + RIGHT) / 2;
/** The footway on Q7's east edge (1.5 m, lat +1.8 to +3.3), from the pad (u 4) to where the walkway begins (u 95). */
const WALK = { lat0: 1.8, lat1: 3.3, from: RING_S + 4, to: RING_S + RING_WALK(0).u0 / 100 };
const TOP = 0.1;
const PANEL_M = (LINE2_STATIONS[Q7]!.toCm - LINE2_STATIONS[Q7]!.fromCm) / 100 / LINE2_STATIONS[Q7]!.panels;
const DECK_FROM = LINE2_STATIONS[Q7]!.fromCm / 100,
  DECK_TO = LINE2_STATIONS[Q7]!.toCm / 100;
const COLOURS = {
  plank: '#a97a45',
  rail: '#4c5058',
  stringer: '#6e4c2a',
  cap: '#7f5630',
  leg: '#a2743f',
  sleeper: '#8a6236',
  foot: '#b88a52',
};
/** Seconds a piece takes to drop into its place, from this high up (m). */
const DROP_S = 0.5,
  DROP_M = 2.2;
/** Seconds between neighbours along the relay's sweep, per metre. */
const SWEEP_S = 0.025;

type Piece = {
  /** Which part shows it: the relay (all or nothing) or a Q7 panel. */
  group: 'relay' | number;
  /** Its metre along the line, for the sweep. */
  at: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  colour: string;
  yaw: number;
  pitch: number;
  roll: number;
  /** Seconds on the view's clock it showed (-Infinity: settled). */
  born: number;
};

export function createRingDeck(
  adapter: RailwayAdapter,
  owner: OwnedView,
  track: { retire(on: boolean): number },
) {
  const pieces: Piece[] = [];
  const P = { x: 0, z: 0, ux: 0, uz: 1 },
    q = { x: 0, z: 0 };
  /** A box at metre `s` along the line and `lat` across it, `dy` over the rail line, its length `d` along the line. */
  function put(group: Piece['group'], s: number, lat: number, dy: number, w: number, h: number, d: number, c: string) {
    line2World(s, lat, q);
    line2At(s, P);
    pieces.push({
      group,
      at: s,
      x: q.x,
      y: line2Y(s) + dy,
      z: q.z,
      w,
      h,
      d,
      colour: c,
      yaw: Math.atan2(P.ux, P.uz),
      pitch: -Math.atan2(line2Y(s + 1) - line2Y(s - 1), 2),
      roll: 0,
      born: -Infinity,
    });
  }
  const bed = (s: number, lat: number) => (line2World(s, lat, q), line2Y(s) - H(q.x, q.z));

  // ---------------------------------------------------------------- the relay: the pier's up track
  const relayFrom = track.retire(false);
  for (let s = relayFrom; s < RING_S;) {
    const sea = bed(s + 0.5, UP_LAT) > 1;
    const len = Math.min(sea ? 1 : 1.2, RING_S - s),
      mid = s + len / 2;
    if (sea) put('relay', mid, (LEFT + -1.8) / 2, -0.02, 4, 0.12, Math.min(0.84, len), COLOURS.plank);
    else {
      put('relay', mid, UP_LAT, -0.02, 2.3, 0.12, Math.min(0.42, len), COLOURS.sleeper);
      for (const side of [-0.75, 0.75]) {
        line2World(mid, UP_LAT + side, q);
        const foot = H(q.x, q.z) - 0.08,
          top = line2Y(mid) - 0.02;
        if (top - foot > 0.18)
          put('relay', mid, UP_LAT + side, foot - line2Y(mid) + (top - foot) / 2, 0.35, top - foot, 0.35, COLOURS.leg);
      }
    }
    s += len;
  }
  for (let s = relayFrom; s < RING_S; s += 3) {
    const len = Math.min(3, RING_S - s);
    for (const r of [-0.5, 0.5]) put('relay', s + len / 2, UP_LAT + r, TOP, 0.1, 0.12, len, COLOURS.rail);
  }
  // The trestle's bents (./track.ts: every 6.5 m from s 3) get the up track's half: a cap out to lat -5.8, two legs and
  // two stringers.
  for (let s = 3; s < RING_S; s += 6.5) {
    if (s < relayFrom || bed(s, UP_LAT) < 1.2) continue;
    const y = line2Y(s),
      capW = 3.5,
      capLat = LEFT + capW / 2;
    put('relay', s, capLat, -0.97, capW, 0.55, 1, COLOURS.cap);
    for (const lat of [-3.6, -5.2]) {
      line2World(s, lat, q);
      const g = H(q.x, q.z) - 0.4,
        top = y - 0.97;
      put('relay', s, lat, g - y + (top - g) / 2, 0.5, top - g, 0.5, COLOURS.leg);
    }
    for (const lat of [-3.2, -5.0]) put('relay', s, lat, -0.42, 0.8, 0.4, 6.6, COLOURS.stringer);
  }

  // ---------------------------------------------------------------- Q7's deck: planks, rails, stringers, the footway
  const panelOf = (s: number) => Math.min(LINE2_STATIONS[Q7]!.panels - 1, Math.floor((s - DECK_FROM) / PANEL_M));
  for (let s = DECK_FROM; s < DECK_TO - 1e-6; s += 1) {
    const g = panelOf(s + 0.5);
    put(g, s + 0.5, MID, -0.02, WIDTH, 0.12, 0.84, COLOURS.plank);
    if (s + 0.5 > WALK.from && s + 0.5 < WALK.to)
      put(g, s + 0.5, (WALK.lat0 + WALK.lat1) / 2 + 0.01, -0.02, WALK.lat1 - WALK.lat0, 0.12, 0.84, COLOURS.foot);
  }
  for (let s = DECK_FROM; s < DECK_TO - 1e-6; s += PANEL_M / 2) {
    const g = panelOf(s + 0.1);
    for (const track of [0, UP_LAT])
      for (const r of [-0.5, 0.5]) put(g, s + PANEL_M / 4, track + r, TOP, 0.1, 0.12, PANEL_M / 2, COLOURS.rail);
    // The footway's bearers, out from the deck's edge under its planks.
    if (s + PANEL_M / 4 > WALK.from && s + PANEL_M / 4 < WALK.to)
      put(
        g,
        s + PANEL_M / 4,
        (WALK.lat0 + WALK.lat1) / 2,
        -0.3,
        WALK.lat1 - WALK.lat0 + 0.4,
        0.2,
        0.3,
        COLOURS.stringer,
      );
  }
  for (let s = DECK_FROM; s < DECK_TO - 1e-6; s += PANEL_M)
    for (const lat of [-5.0, -3.0, -1.0, 1.0])
      put(panelOf(s + 0.1), s + PANEL_M / 2, lat, -0.42, 0.8, 0.5, PANEL_M + 0.1, COLOURS.stringer);

  // ---------------------------------------------------------------- state and drawing
  const batch = createBoxBatch(owner, pieces.length + 8);
  const bodies = new Map<string, ReturnType<typeof slab>>();
  let clock = 0,
    shown = { relay: false, panels: 0 },
    settle = true,
    animating = 0;
  const wantSolid = (key: string, on: boolean, make: () => ReturnType<typeof slab>) => {
    const body = bodies.get(key);
    if (on && !body) bodies.set(key, make());
    else if (!on && body) {
      owner.removeBody(body);
      bodies.delete(key);
    }
  };
  const a = { x: 0, z: 0 },
    b = { x: 0, z: 0 };
  function solids(relay: boolean, panels: number) {
    // The up track's half of the pier, a slab every 6 m from the relay's start.
    for (let s = relayFrom, k = 0; s < RING_S; s += 6, k++) {
      const e = Math.min(RING_S, s + 6);
      wantSolid(`r${k}`, relay, () => {
        line2World(s, (LEFT + -1.8) / 2, a);
        line2World(e, (LEFT + -1.8) / 2, b);
        return slab(a.x, a.z, b.x, b.z, line2Y(s) + TOP, line2Y(e) + TOP, 4, owner, 0.05);
      });
    }
    for (let k = 0; k < LINE2_STATIONS[Q7]!.panels; k++) {
      const s = DECK_FROM + k * PANEL_M,
        e = s + PANEL_M;
      wantSolid(`d${k}`, k < panels, () => {
        line2World(s, MID, a);
        line2World(e, MID, b);
        return slab(a.x, a.z, b.x, b.z, line2Y(s) + TOP, line2Y(e) + TOP, WIDTH, owner, 0.05);
      });
      const w0 = Math.max(s, WALK.from),
        w1 = Math.min(e, WALK.to);
      wantSolid(`w${k}`, k < panels && w1 - w0 > 0.5, () => {
        const lat = (WALK.lat0 + WALK.lat1) / 2;
        line2World(w0, lat, a);
        line2World(w1, lat, b);
        return slab(a.x, a.z, b.x, b.z, line2Y(w0) + TOP, line2Y(w1) + TOP, WALK.lat1 - WALK.lat0 + 0.2, owner, 0);
      });
    }
  }
  /** What the room has laid: whether the relay is down, and how many of Q7's panels. */
  function laid(): { relay: boolean; panels: number } {
    const wd = adapter.read.world();
    if (!adapter.read.ready() || !line2Trains(wd)) return { relay: false, panels: 0 };
    if (q7Laid(wd)) return { relay: true, panels: LINE2_STATIONS[Q7]!.panels };
    const { job, run } = line2Jobs(wd, adapter.read.tick())[Q7]!;
    return {
      relay: false,
      panels: job.start < 0 ? 0 : linePanelCount(LINE2_STATIONS[Q7]!, run.elapsed, timingOf(job)),
    };
  }
  const visible = (p: Piece, now: { relay: boolean; panels: number }) =>
    p.group === 'relay' ? now.relay : p.group < now.panels;
  function draw() {
    batch.begin();
    for (const p of pieces) {
      if (!visible(p, shown)) continue;
      const t = (clock - p.born) / DROP_S;
      if (t < 0) continue; // waiting its turn in the sweep
      const e = Math.min(1, t),
        drop = (1 - e * e * (3 - 2 * e)) * DROP_M;
      batch.box(p.x, p.y + drop, p.z, p.w, p.h, p.d, p.colour, p.yaw, p.pitch, p.roll);
    }
    batch.commit();
  }
  function update(dt: number) {
    clock += dt;
    const now = laid();
    if (now.relay !== shown.relay || now.panels !== shown.panels) {
      // A live edge: what is new drops in (the relay in a sweep from the old merge outward), what went (a rewind) goes.
      for (const p of pieces) {
        const was = visible(p, shown),
          is = visible(p, now);
        if (is && !was)
          p.born = settle
            ? -Infinity
            : clock +
              (p.group === 'relay'
                ? (p.at - relayFrom) * SWEEP_S
                : (p.at - DECK_FROM - (typeof p.group === 'number' ? p.group * PANEL_M : 0)) * 0.08);
        if (!is) p.born = -Infinity;
      }
      if (now.relay !== shown.relay) track.retire(now.relay);
      shown = now;
      solids(now.relay, now.panels);
      animating = DROP_S + 7;
      draw();
      settle = false;
      return;
    }
    if (animating > 0) {
      animating -= dt;
      draw();
    }
  }
  /** Snaps to what the room has laid, nothing dropping. */
  function restore() {
    settle = true;
    for (const p of pieces) p.born = -Infinity;
    shown = { relay: false, panels: 0 };
    track.retire(false);
    for (const key of [...bodies.keys()]) wantSolid(key, false, () => null as never);
    const now = laid();
    shown = now;
    if (now.relay) track.retire(true);
    solids(now.relay, now.panels);
    animating = 0;
    draw();
    settle = false;
  }
  restore();
  return {
    update,
    restore,
    inspect: () => ({
      ringDeck: { relay: shown.relay, panels: shown.panels, pieces: batch.count, from: relayFrom, solids: bodies.size },
    }),
  };
}
