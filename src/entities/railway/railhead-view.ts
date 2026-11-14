// The railhead and the gap (docs/plans/ring-island-build1.md, R4b), live from accepted state: once Q7 is laid, line 2
// runs on from the pier head over bents 7-13. Each footing the jib sets drops into one of the next bent's two sockets;
// the second stands the bent up, the prefabricated span (planks, stringers, both tracks' rails, the side walkway) comes
// down on its caps, and the railhead platform, rack, jib and buffers slide out along it in about 3 s. The platform's 25 m
// stay behind as the side walkway (RING_WALK), so a player on it is never left over the sea; the rack's and the jib's
// prompts wait for the slide. Beyond the railhead the gap reads as unbuilt: the deck ends on a striped beam, stakes
// mark the bents to come and the next bent's two sockets glow. With bent 13 come the hook pile and its gold pad, the
// take-off rail, and the joint's west platform with its plank crossing. Both tracks are laid to every railhead (call
// 51): the stub's crossover is the pair of points 50 to 30 m short of the end, the up track runs on to its own buffer.
// Local view over the read facade (`adapter.read`); the sim reads none of it. A restore shows what is built, nothing
// dropping. Bents 1-6 and Q7's deck are crossing-view.ts's and ring-deck.ts's.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted, RailwayCorrection } from '../../adapters/railway-effects.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { splash } from '../../render/splash.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { SEA, reducedMotion } from '../../constants.ts';
import { H, slab } from '../../place/land.ts';
import { UP_LAT } from '../../place/layout.ts';
import { CROSSING_FOOT_OFF, WORKS } from '../../sim/railway-works-layout.ts';
import { RING_BRACE, RING_BRACE_PLATFORM, RING_HEAD, RING_HOOK } from '../../sim/railway-ring-layout.ts';
import { account, aperture, beam, boiler, type ReadWorld } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { q7Laid } from '../../sim/railway-queries.ts';
import { ringIslandNear } from '../ring-island/state.ts';
import { onlyALoadIn, setDownThen } from './back-down.ts';
import { jibOffered, jibVerb } from './leaf-shape.ts';
import { createBoxBatch, footingFrame, footingParts, FOOTING } from './works-box-view.ts';
import { RING_S, line2At, line2World, line2Y } from './line2-path.ts';
import {
  BENTS,
  BUFFER_BACK,
  DECK,
  JIB_BACK,
  PLATFORM,
  RACK_BACK,
  SIDE,
  bentU,
  crossoverSpan,
  headOf,
  headU,
  slide,
  spanFrom,
  spanTo,
  walkwaySpan,
} from './railhead-shape.ts';

const COLOURS = {
  plank: '#a97a45',
  walk: '#b88a52',
  dais: '#8a6236',
  daisTop: '#c9a46a',
  edge: '#f2d36b',
  rail: '#4c5058',
  stringer: '#6e4c2a',
  cap: '#5b4a3a',
  post: '#8a6236',
  brace: '#7a5530',
  leg: '#a2743f',
  iron: '#3a3d44',
  stake: '#e8a33a',
  glow: '#ffd23a',
  rope: '#d8cfa8',
  buffer: '#b8402a',
  gold: '#ffc83a',
  black: '#2a2a2a',
};
/** The glider's own cloth (src/render/gear-models.ts canopyGeometry): cloth in these two means "glide". */
const CLOTH = { cream: '#f2e6c8', teal: '#2fb7a0' };
const OFF = CROSSING_FOOT_OFF / 100;
const TOP = 0.1;
const RISE_S = 2,
  DECK_AFTER = 1.2,
  DROP_S = 0.5,
  DROP_M = 2.2,
  SWEEP_S = 0.04,
  OUT_SPEED = 28,
  LOWER_S = 2.2;
const RACK_PITCH = 1.3,
  BEARER = 0.16;
const MAST = 9,
  ARM = [8.5, 7.5] as const;

type Piece = {
  /** -1: the walkway's first stretch (shown with the railhead); j: bent j's span and what stands on it. */
  group: number;
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
  born: number;
};
type Lowering = { slot: number; from: THREE.Vector3; t: number };

export function createRailwayRailhead(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: { toRing: () => number; hookRing: (on: boolean) => void },
) {
  const P = { x: 0, z: 0, ux: 0, uz: 1 },
    q = { x: 0, z: 0 },
    m = new THREE.Matrix4(),
    p = new THREE.Vector3();
  const S = (u: number) => RING_S + u;
  const yAt = (u: number) => line2Y(S(u));
  const yawAt = (u: number) => (line2At(S(u), P), Math.atan2(P.ux, P.uz));
  const pitchAt = (u: number) => -Math.atan2(yAt(u + 1) - yAt(u - 1), 2);
  const world = (u: number, lat: number) => line2World(S(u), lat, q);

  // ---------------------------------------------------------------- the rows, once a frame
  let wd: ReadWorld = adapter.read.world();
  let opened = false,
    set = 0,
    rack = 0,
    cw = 0,
    joined = false;
  // The first whole state, latched (read.whole()): a full pending window or a dropped link must not un-deck the bents.
  const refresh = () => {
    wd = adapter.read.world();
    opened = adapter.read.whole() && line2Trains(wd) && q7Laid(wd);
    const a = opened ? aperture(wd) : null;
    set = a?.set ?? 0;
    rack = a?.rack ?? 0;
    cw = a?.cw ?? 0;
    joined = !!a && a.joined >= 0;
  };

  // ---------------------------------------------------------------- the bents' places
  const sockets = Array.from({ length: BENTS * 2 }, (_, k) => {
    const j = k >> 1,
      lat = DECK.mid + (k & 1 ? 1 : -1) * OFF;
    world(bentU(j), lat);
    return { x: q.x, z: q.z, y: Math.min(H(q.x, q.z), SEA - 1) };
  });
  const bentAt = Array.from({ length: BENTS }, (_, j) => {
    world(bentU(j), DECK.mid);
    return { x: q.x, z: q.z, deck: yAt(bentU(j)), yaw: yawAt(bentU(j)) };
  });

  // ---------------------------------------------------------------- the spans: planks, stringers, the walkway
  const pieces: Piece[] = [];
  function put(group: number, u: number, lat: number, dy: number, w: number, h: number, d: number, colour: string) {
    world(u, lat);
    pieces.push({
      group,
      at: u,
      x: q.x,
      y: yAt(u) + dy,
      z: q.z,
      w,
      h,
      d,
      colour,
      yaw: yawAt(u),
      pitch: pitchAt(u),
      born: -Infinity,
    });
  }
  const sideMid = (SIDE.lat0 + SIDE.lat1) / 2,
    sideW = SIDE.lat1 - SIDE.lat0;
  /** The side walkway from `u0` to `u1`: planks, bearers out from the deck's edge, piles at its outer edge. */
  function walkway(group: number, u0: number, u1: number) {
    for (let u = u0; u < u1 - 1e-6; u++) put(group, u + 0.5, sideMid, -0.02, sideW, 0.12, 0.84, COLOURS.walk);
    for (let u = u0 + 1; u < u1; u += 4) put(group, u, sideMid - 0.1, -0.3, sideW + 0.2, 0.2, 0.3, COLOURS.stringer);
    for (let u = u0 + 2.5; u < u1; u += 5) {
      world(u, SIDE.lat1 - 0.3);
      const foot = Math.min(H(q.x, q.z), SEA - 1) - 0.4,
        top = yAt(u) - 0.2;
      if (top - foot > 0.3)
        put(group, u, SIDE.lat1 - 0.3, foot - yAt(u) + (top - foot) / 2, 0.4, top - foot, 0.4, COLOURS.leg);
    }
  }
  walkway(-1, walkwaySpan(0)[0], spanFrom(0));
  for (let j = 0; j < BENTS; j++) {
    const a = spanFrom(j),
      b = spanTo(j);
    for (let u = a; u < b - 1e-6; u++)
      put(j, u + 0.5, DECK.mid, -0.02, DECK.lat1 - DECK.lat0, 0.12, 0.84, COLOURS.plank);
    for (const lat of [-5, -3, -1, 1]) put(j, (a + b) / 2, lat, -0.42, 0.8, 0.5, b - a + 0.1, COLOURS.stringer);
    walkway(j, a, b);
  }
  // The joint's west platform and its plank crossing, with bent 13 (group 6): lat -9.6 to -5.8, u 235-260, 0.9 m up on
  // bearers and piles; the crossing is a strip of boards over both tracks at u 240.
  {
    const lat0 = -9.6,
      lat1 = DECK.lat0,
      mid = (lat0 + lat1) / 2;
    const u0 = 235,
      u1 = 260;
    put(6, (u0 + u1) / 2, mid, PLATFORM.up - 0.4, lat1 - lat0, 0.8, u1 - u0, COLOURS.dais);
    for (let u = u0; u < u1 - 1e-6; u++)
      put(6, u + 0.5, mid, PLATFORM.up + 0.02, lat1 - lat0 - 0.2, 0.06, 0.88, COLOURS.daisTop);
    put(6, (u0 + u1) / 2, lat0 + 0.12, PLATFORM.up + 0.06, 0.2, 0.04, u1 - u0, COLOURS.edge);
    for (let u = u0 + 2.5; u < u1; u += 5) {
      world(u, lat0 + 0.4);
      const foot = Math.min(H(q.x, q.z), SEA - 1) - 0.4,
        top = yAt(u) - 0.2;
      put(6, u, lat0 + 0.4, foot - yAt(u) + (top - foot) / 2, 0.4, top - foot, 0.4, COLOURS.leg);
      put(6, u, mid, -0.3, lat1 - lat0 + 0.2, 0.2, 0.3, COLOURS.stringer);
    }
    put(6, 240.75, DECK.mid, 0.085, DECK.lat1 - DECK.lat0, 0.1, 1.5, COLOURS.daisTop);
    // A ramp of two steps from the crossing's end onto the platform (0.45 m each) reads as the way up.
    for (const [k, lat] of [
      [1, lat1 - 0.3],
      [2, lat1 - 0.9],
    ] as const)
      put(6, 240.75, lat, PLATFORM.up - 0.45 * k + 0.3, 0.6, 0.1, 1.5, COLOURS.daisTop);
  }
  // The hook pile, 276 m out and 12 m east (RING_HOOK): three timbers from the sea floor to 3 m over the water, a mast
  // to the ring's height.
  const pile = { x: RING_HOOK.x / 100, z: RING_HOOK.z / 100, ringY: RING_HOOK.y / 100 };
  const floor = Math.min(H(pile.x, pile.z), SEA - 1);
  const pileTop = SEA + RING_HOOK.pileTop / 100;
  for (const [dx, dz] of [
    [-0.45, -0.3],
    [0.45, -0.3],
    [0, 0.5],
  ] as const)
    pieces.push({
      group: 6,
      at: 276,
      x: pile.x + dx,
      y: (floor + pileTop) / 2,
      z: pile.z + dz,
      w: 0.5,
      h: pileTop - floor,
      d: 0.5,
      colour: COLOURS.post,
      yaw: 0,
      pitch: 0,
      born: -Infinity,
    });
  pieces.push({
    group: 6,
    at: 276,
    x: pile.x,
    y: pileTop + 0.15,
    z: pile.z,
    w: 1.8,
    h: 0.3,
    d: 1.8,
    colour: COLOURS.dais,
    yaw: 0,
    pitch: 0,
    born: -Infinity,
  });
  pieces.push({
    group: 6,
    at: 276,
    x: pile.x,
    y: (pileTop + pile.ringY - 0.55) / 2,
    z: pile.z,
    w: 0.22,
    h: pile.ringY - 0.55 - pileTop,
    d: 0.22,
    colour: COLOURS.stake,
    yaw: 0,
    pitch: 0,
    born: -Infinity,
  });

  // ---------------------------------------------------------------- state
  const staticBatch = createBoxBatch(owner, pieces.length + 16);
  const live = createBoxBatch(owner, 2600);
  const bodies = new Map<string, ReturnType<typeof slab>>();
  const lowering: Lowering[] = [];
  /** Per bent: seconds since it started rising (≥ RISE_S once stood), or −1 for not yet. */
  const rise = Array.from({ length: BENTS }, () => -1);
  /** Per bent: its span is down (or dropping). */
  const decked = Array.from({ length: BENTS }, () => false);
  let clock = 0,
    started = 0,
    shownU = headU(0),
    baseOn = false,
    animating = 0,
    actor: string | null = null,
    drawnKey = '';
  const stood = () => {
    let n = 0;
    while (n < BENTS && rise[n]! >= RISE_S) n++;
    return n;
  };
  const inSea = () => Math.max(0, started - lowering.length);
  const simHead = () => headOf(set);
  /** The kit is where the sim has it: the railhead has caught up with the bents and nothing is sliding. */
  const settled = () => stood() === simHead() && Math.abs(shownU - headU(stood())) < 0.05;

  // ---------------------------------------------------------------- the rack's tag
  // An empty rack with work still owed says where its next load is (gap-readability, step 7; 55 s idle at an empty
  // rack on 14 November): a plate standing in the rack's empty bed, facing across the platform, gone the moment a
  // footing lands. Draft copy, not The Boogler's.
  const RACK_TAG = 'Next load: on the wagon';
  const tag = instantiate(
    'railway.rack-tag',
    { id: 'railhead-rack-tag', prefab: 'railway.rack-tag', pos: [0, 0, 0], labels: { sign: 'load' } },
    { owner, texts: { load: [RACK_TAG] } },
  ).root;
  tag.visible = false;
  let tagOn = false;
  function placeTag() {
    tagOn = opened && jibOffered(set, cw) && Math.max(0, rack - deps.toRing()) === 0;
    tag.visible = tagOn;
    if (!tagOn) return;
    const u = shownU - RACK_BACK;
    world(u, 4.8);
    tag.position.set(q.x, platY(u) + 0.04, q.z);
    tag.rotation.y = yawAt(u) + Math.PI / 2;
  }

  // ---------------------------------------------------------------- the jib and the rack, at the shown railhead
  const platY = (u: number) => yAt(u) + PLATFORM.up;
  const rackSlot = (k: number, out: THREE.Vector3) => {
    const u = shownU - RACK_BACK,
      yaw = yawAt(u),
      v = (k % 6) - 2.5;
    world(u, 4.8);
    return out.set(
      q.x + Math.sin(yaw) * v * RACK_PITCH,
      platY(u) + 0.04 + BEARER + Math.floor(k / 6) * (FOOTING.h + 0.1),
      q.z + Math.cos(yaw) * v * RACK_PITCH,
    );
  };
  const jibHead = new THREE.Vector3(),
    jibFoot = new THREE.Vector3();
  function placeJib() {
    const u = shownU - JIB_BACK;
    world(u, 3.6);
    jibFoot.set(q.x, platY(u) + 0.04, q.z);
    world(u + 6, 2.4);
    jibHead.set(q.x, platY(u) + 0.04 + ARM[1], q.z);
  }
  placeJib();
  const avatarBack = (pid: string, out: THREE.Vector3) => {
    const a =
      pid === adapter.read.pid ? me.avatar : [...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar;
    if (!a) return false;
    out.copy(a.position);
    out.y += 1.3;
    return true;
  };

  // ---------------------------------------------------------------- solids
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
  /** A slab along the line from u0 to u1 at `lat`, `w` wide, its top `up` over the rail line. */
  function strip(u0: number, u1: number, lat: number, w: number, up: number) {
    line2World(S(u0), lat, a);
    line2World(S(u1), lat, b);
    return slab(a.x, a.z, b.x, b.z, yAt(u0) + up, yAt(u1) + up, w, owner, 0.05);
  }
  function solids() {
    wantSolid('base', baseOn, () => strip(walkwaySpan(0)[0], spanFrom(0), sideMid, sideW, TOP));
    for (let j = 0; j < BENTS; j++) {
      wantSolid(`d${j}`, decked[j]!, () => strip(spanFrom(j), spanTo(j), DECK.mid, DECK.lat1 - DECK.lat0, TOP));
      wantSolid(`w${j}`, decked[j]!, () => strip(spanFrom(j), spanTo(j), sideMid, sideW, TOP));
    }
    // The west platform with bent 13.
    wantSolid('west', decked[6]!, () => strip(235, 260, (-9.6 + DECK.lat0) / 2, DECK.lat0 + 9.6, PLATFORM.up + 0.08));
    wantSolid('pile', decked[6]!, () => {
      const body = slab(pile.x, pile.z - 0.01, pile.x, pile.z + 0.01, pileTop + 0.3, pileTop + 0.3, 1.8, owner, 0.8);
      return body;
    });
    // The platform stands as a solid only while it is where the sim has it; moving, it is a picture, and whoever is on
    // it drops to the walkway under it (its 25 m are inside the walkway: platformSpan <= walkwaySpan).
    const k = stood();
    const key = `plat${k}`;
    for (const have of [...bodies.keys()])
      if (have.startsWith('plat') && have !== key) wantSolid(have, false, () => null as never);
    wantSolid(key, baseOn && settled(), () => strip(shownU - PLATFORM.len, shownU, sideMid, sideW, PLATFORM.up + 0.08));
  }

  // ---------------------------------------------------------------- drawing
  const visible = (pc: Piece) => (pc.group < 0 ? baseOn : decked[pc.group]!);
  function drawStatic() {
    staticBatch.begin();
    for (const pc of pieces) {
      if (!visible(pc)) continue;
      const t = (clock - pc.born) / DROP_S;
      if (t < 0) continue;
      const e = Math.min(1, t),
        drop = (1 - e * e * (3 - 2 * e)) * DROP_M;
      staticBatch.box(pc.x, pc.y + drop, pc.z, pc.w, pc.h, pc.d, pc.colour, pc.yaw, pc.pitch, 0);
    }
    staticBatch.commit();
  }
  /** A box from (uA, latA) to (uB, latB) along its own heading, `dy` over the rail line. */
  function seg(uA: number, latA: number, uB: number, latB: number, w: number, h: number, dy: number, c: string) {
    world(uA, latA);
    const ax = q.x,
      az = q.z;
    world(uB, latB);
    const dx = q.x - ax,
      dz = q.z - az,
      len = Math.hypot(dx, dz),
      ya = yAt(uA) + dy,
      yb = yAt(uB) + dy;
    live.box(
      (ax + q.x) / 2,
      (ya + yb) / 2,
      (az + q.z) / 2,
      w,
      h,
      Math.hypot(len, yb - ya),
      c,
      Math.atan2(dx, dz),
      -Math.atan2(yb - ya, len),
    );
  }
  /** A bar between two world points. */
  function bar(ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number, c: string) {
    const dx = bx - ax,
      dz = bz - az,
      run = Math.hypot(dx, dz);
    live.box(
      (ax + bx) / 2,
      (ay + by) / 2,
      (az + bz) / 2,
      w,
      w,
      Math.hypot(run, by - ay),
      c,
      Math.atan2(dx, dz),
      -Math.atan2(by - ay, run),
    );
  }
  function drawBent(j: number) {
    const t = rise[j]!;
    if (t < 0) return;
    const c = bentAt[j]!;
    const foot = Math.max(sockets[j * 2]!.y, sockets[j * 2 + 1]!.y) + FOOTING.h;
    const postH = c.deck - foot;
    const piece = (k: number) => Math.min(1, Math.max(0, (t - k * 0.4) / 0.6));
    const across = { x: Math.cos(c.yaw), z: -Math.sin(c.yaw) };
    for (const [k, side] of [
      [0, -1],
      [1, 1],
    ] as const) {
      const u = piece(k);
      if (u <= 0) continue;
      const drop = (1 - u * u * (3 - 2 * u)) * postH;
      live.box(
        c.x + across.x * side * OFF,
        foot + postH / 2 - drop,
        c.z + across.z * side * OFF,
        0.75,
        postH,
        0.75,
        COLOURS.post,
        c.yaw,
      );
    }
    const braced = piece(2);
    if (braced > 0) {
      const high = c.deck - 0.6 - (SEA - 1),
        span = Math.hypot(OFF * 2, high);
      for (const lean of [-1, 1])
        live.box(
          c.x,
          SEA - 1 + high / 2 - (1 - braced) * postH,
          c.z,
          0.3,
          span,
          0.3,
          COLOURS.brace,
          c.yaw,
          0,
          lean * Math.atan2(OFF * 2, high),
        );
    }
    const cap = piece(3);
    if (cap > 0) live.box(c.x, c.deck - 0.4 + (1 - cap) * 3, c.z, OFF * 2 + 1.8, 0.8, 1, COLOURS.cap, c.yaw);
  }
  function drawLowering(l: Lowering) {
    const s = sockets[l.slot]!;
    const hook = new THREE.Vector3();
    const up = 0.6,
      out = Math.hypot(s.x - jibHead.x, s.z - jibHead.z) / OUT_SPEED;
    let fx: number, fy: number, fz: number;
    if (l.t < up) {
      const u = Math.max(0, l.t / up);
      hook.copy(jibHead);
      fx = l.from.x + (jibHead.x - l.from.x) * u;
      fy = l.from.y + (jibHead.y - 2.2 - l.from.y) * u + Math.sin(u * Math.PI) * 0.8;
      fz = l.from.z + (jibHead.z - l.from.z) * u;
    } else if (l.t < up + out) {
      const u = (l.t - up) / out,
        e = u * u * (3 - 2 * u);
      hook.set(jibHead.x + (s.x - jibHead.x) * e, jibHead.y, jibHead.z + (s.z - jibHead.z) * e);
      fx = hook.x;
      fy = hook.y - 2.2;
      fz = hook.z;
    } else {
      const u = Math.min(1, (l.t - up - out) / LOWER_S);
      hook.set(s.x, jibHead.y, s.z);
      fx = s.x;
      fy = jibHead.y - 2.2 + (s.y - (jibHead.y - 2.2)) * u;
      fz = s.z;
    }
    footingParts(live, footingFrame(m, fx, fy, fz, bentAt[0]!.yaw));
    if (l.t >= up) {
      const rope = hook.y - (fy + FOOTING.h);
      if (rope > 0.05) live.box(hook.x, fy + FOOTING.h + rope / 2, hook.z, 0.06, rope, 0.06, COLOURS.rope);
      live.box(hook.x, hook.y, hook.z, 0.5, 0.3, 0.5, COLOURS.iron);
      const dx = hook.x - jibHead.x,
        dz = hook.z - jibHead.z,
        run = Math.hypot(dx, dz);
      if (run > 0.3)
        live.box(
          (hook.x + jibHead.x) / 2,
          jibHead.y,
          (hook.z + jibHead.z) / 2,
          0.08,
          0.08,
          run,
          COLOURS.rope,
          Math.atan2(dx, dz),
        );
    }
  }
  /** The rails from Q7's end (u 120) to the railhead's buffer, both tracks, and the stub's crossover. */
  function drawRails(end: number) {
    for (const lat of [0, UP_LAT])
      for (const r of [-0.5, 0.5])
        for (let u = 120; u < end - 1e-6; u += 4)
          seg(u, lat + r, Math.min(end, u + 4), lat + r, 0.1, 0.12, TOP, COLOURS.rail);
    const [c0, c1] = crossoverSpan(end);
    if (c0 >= 120) {
      const ease = (t: number) => t * t * (3 - 2 * t);
      const N = 8;
      for (const r of [-0.5, 0.5])
        for (let i = 0; i < N; i++) {
          const u0 = c0 + ((c1 - c0) * i) / N,
            u1 = c0 + ((c1 - c0) * (i + 1)) / N;
          seg(
            u0,
            UP_LAT * (1 - ease(i / N)) + r,
            u1,
            UP_LAT * (1 - ease((i + 1) / N)) + r,
            0.1,
            0.12,
            TOP + 0.005,
            COLOURS.rail,
          );
        }
      // Long timbers where the crossover runs between the tracks.
      for (let i = 1; i < N; i++) {
        const u = c0 + ((c1 - c0) * i) / N;
        seg(
          u - 0.21,
          UP_LAT * (1 - ease(i / N)),
          u + 0.21,
          UP_LAT * (1 - ease(i / N)),
          2.3,
          0.12,
          -0.02,
          COLOURS.stringer,
        );
      }
    }
  }
  function drawEnd(end: number, bare: boolean) {
    // Buffers on both tracks at the railhead, until the rivet makes the line a through one.
    if (!bare) {
      for (const lat of [0, UP_LAT]) {
        seg(end - BUFFER_BACK - 0.3, lat, end - BUFFER_BACK + 0.3, lat, 1.9, 0.9, TOP + 0.5, COLOURS.iron);
        seg(end - BUFFER_BACK - 0.35, lat, end - BUFFER_BACK - 0.25, lat, 1.6, 0.5, TOP + 0.55, COLOURS.buffer);
      }
      // The deck's raw end: a striped beam across the formation and the side walkway.
      const yaw = yawAt(end);
      for (let i = 0; i < 24; i++) {
        world(end - 0.15, DECK.lat0 + 0.25 + i * 0.5);
        live.box(q.x, yAt(end) + 0.1, q.z, 0.5, 0.1, 0.3, i % 2 ? COLOURS.black : COLOURS.edge, yaw, pitchAt(end));
      }
    }
  }
  function drawPlatform(u: number) {
    const [u0, u1] = [u - PLATFORM.len, u];
    const mid = (u0 + u1) / 2;
    // The dais: a solid 0.9 m block on the walkway, planks on top, a yellow safe line along the track side.
    world(mid, sideMid);
    live.box(
      q.x,
      yAt(mid) + PLATFORM.up / 2 - 0.02,
      q.z,
      sideW,
      PLATFORM.up - 0.04,
      PLATFORM.len,
      COLOURS.dais,
      yawAt(mid),
      pitchAt(mid),
    );
    world(mid, sideMid);
    live.box(
      q.x,
      yAt(mid) + PLATFORM.up + 0.02,
      q.z,
      sideW + 0.1,
      0.08,
      PLATFORM.len + 0.1,
      COLOURS.daisTop,
      yawAt(mid),
      pitchAt(mid),
    );
    world(mid, SIDE.lat0 + 0.2);
    live.box(q.x, yAt(mid) + PLATFORM.up + 0.07, q.z, 0.2, 0.03, PLATFORM.len, COLOURS.edge, yawAt(mid), pitchAt(mid));
  }
  function drawKit() {
    // The rack (as the pier's): two bearers, chocks and corner posts, its stack of footings.
    const u = shownU - RACK_BACK,
      yaw = yawAt(u);
    world(u, 4.8);
    footingFrame(m, q.x, platY(u) + 0.04, q.z, yaw);
    const half = 3 * RACK_PITCH + 0.15;
    for (const side of [-0.42, 0.42]) {
      live.part(m, side, BEARER / 2, 0, 0.18, BEARER, half * 2, '#8a6236');
      for (const e of [-half, half]) live.part(m, side * 1.2, 0.65, e, 0.14, 1.3, 0.14, '#7f5630');
    }
    for (let k = 0; k <= 6; k++) live.part(m, 0, BEARER + 0.04, (k - 3) * RACK_PITCH, 1.1, 0.08, 0.1, '#7f5630');
    const resting = Math.max(0, rack - deps.toRing());
    for (let k = 0; k < Math.min(resting, 18); k++) {
      rackSlot(k, p);
      footingParts(live, footingFrame(m, p.x, p.y, p.z, yaw));
    }
    // The jib: a mast on the platform and an arm out over the gap, its hook head where footings go down.
    live.box(jibFoot.x, jibFoot.y + MAST / 2, jibFoot.z, 0.35, MAST, 0.35, COLOURS.iron);
    live.box(jibFoot.x, jibFoot.y + 0.15, jibFoot.z, 1.6, 0.3, 1.6, COLOURS.iron);
    const top = new THREE.Vector3(jibFoot.x, jibFoot.y + ARM[0], jibFoot.z);
    const dx = jibHead.x - top.x,
      dz = jibHead.z - top.z,
      run = Math.hypot(dx, dz);
    live.box(
      (top.x + jibHead.x) / 2,
      (top.y + jibHead.y) / 2,
      (top.z + jibHead.z) / 2,
      0.25,
      0.25,
      Math.hypot(run, jibHead.y - top.y),
      COLOURS.stake,
      Math.atan2(dx, dz),
      -Math.atan2(jibHead.y - top.y, run),
    );
  }
  /** Which way is forward (gap-readability, section 4): the glide is the crossing and cloth means glide. A take-off
   * board juts 2 m off the platform's end toward the folk's brace platform, through a gap in an end rail; a windsock
   * in the glider's own cream and teal streams toward the gold strut; and a square of the same cloth lies pegged on
   * the brace platform beside the strut as the place to land. Drawn only: the board adds no reach. */
  function drawTakeOff() {
    const yaw = yawAt(shownU),
      pitch = pitchAt(shownU);
    const BOARD = { lat: 5, w: 1.1, out: 2 };
    // The end rail, open where the board goes out.
    for (const [a, b] of [
      [SIDE.lat0 + 0.2, BOARD.lat - BOARD.w / 2 - 0.1],
      [BOARD.lat + BOARD.w / 2 + 0.1, SIDE.lat1 - 0.2],
    ] as const) {
      seg(shownU - 0.2, a, shownU - 0.2, b, 0.1, 0.1, PLATFORM.up + 1.0, COLOURS.edge);
      for (const lat of [a, b]) {
        world(shownU - 0.2, lat);
        live.box(q.x, platY(shownU) + 0.55, q.z, 0.12, 1, 0.12, COLOURS.iron);
      }
    }
    // The board: a plank on two brackets, banded in the cloth's colours at its lip.
    const mid = shownU - 0.5 + (BOARD.out + 0.5) / 2;
    world(mid, BOARD.lat);
    live.box(q.x, platY(mid) + 0.1, q.z, BOARD.w, 0.1, BOARD.out + 0.5, COLOURS.daisTop, yaw, pitch);
    for (const [k, c] of [CLOTH.cream, CLOTH.teal, CLOTH.cream].entries()) {
      const u = shownU + BOARD.out - 0.2 - k * 0.3;
      world(u, BOARD.lat);
      live.box(q.x, platY(u) + 0.155, q.z, BOARD.w, 0.02, 0.28, c, yaw, pitch);
    }
    for (const side of [-0.4, 0.4]) {
      world(shownU + 0.5, BOARD.lat + side);
      const bx = q.x,
        bz = q.z;
      world(shownU - 0.05, BOARD.lat + side);
      bar(bx, platY(shownU + 0.5) + 0.02, bz, q.x, platY(shownU) - 0.6, q.z, 0.1, COLOURS.iron);
    }
    // The windsock on its pole beside the board, on the sea side: it streams out over the gap toward the strut,
    // quartering to seaward so its length and bands show from the deck behind it, and flutters.
    world(shownU - 0.45, BOARD.lat + BOARD.w / 2 + 0.3);
    const px = q.x,
      pz = q.z,
      py = platY(shownU - 0.45) + 0.06;
    live.box(px, py + 2.3, pz, 0.12, 4.6, 0.12, COLOURS.post);
    const strut = { x: RING_BRACE.x / 100, z: RING_BRACE.z / 100 };
    const way = Math.atan2(strut.x - px, strut.z - pz) - 0.8;
    let sx = px,
      sy = py + 4.25,
      sz = pz;
    for (let k = 0; k < 6; k++) {
      const flap = reducedMotion ? 0 : Math.sin(clock * 5 - k * 0.9) * 0.05 * (k + 1),
        a = way + flap,
        len = 0.6,
        girth = 0.75 - k * 0.08;
      const nx = sx + Math.sin(a) * len,
        nz = sz + Math.cos(a) * len,
        ny = sy - 0.07 * k;
      live.box(
        (sx + nx) / 2,
        (sy + ny) / 2,
        (sz + nz) / 2,
        girth,
        girth,
        len + 0.02,
        k % 2 ? CLOTH.teal : CLOTH.cream,
        a,
      );
      sx = nx;
      sy = ny;
      sz = nz;
    }
    // The landing cloth on the brace platform, 2 m beyond the strut's foot: four quarters, pegged at the corners.
    const lu = RING_BRACE_PLATFORM.u0 / 100 + 3,
      llat = RING_BRACE_PLATFORM.lat0 / 100 + 3.6,
      ly = RING_BRACE_PLATFORM.y / 100 + 0.03,
      lyaw = yawAt(lu);
    for (const [i, du, dl] of [
      [0, -0.6, -0.6],
      [1, -0.6, 0.6],
      [1, 0.6, -0.6],
      [0, 0.6, 0.6],
    ] as const) {
      world(lu + du, llat + dl);
      live.box(q.x, ly, q.z, 1.2, 0.04, 1.2, i ? CLOTH.teal : CLOTH.cream, lyaw);
      world(lu + du * 2.05, llat + dl * 2.05);
      live.box(q.x, ly + 0.08, q.z, 0.1, 0.2, 0.1, COLOURS.iron, lyaw);
    }
  }
  function drawGap(next: number) {
    // Stakes at the bents to come, the next bent's two sockets glowing until the gap is footed.
    for (let j = 0; j < BENTS; j++) {
      if (rise[j]! >= 0) continue;
      const c = bentAt[j]!;
      const ground = Math.min(H(c.x, c.z), SEA - 1);
      const glowing = j === next && set < WORKS.ring;
      const top = SEA + (glowing ? 4 : 2.6),
        pulse = glowing ? 1 + 0.12 * Math.sin(clock * 4) : 1;
      live.box(c.x, (ground + top) / 2, c.z, 0.25, top - ground, 0.25, COLOURS.post);
      live.box(c.x, top - 0.3, c.z, 0.5 * pulse, 0.9 * pulse, 0.5 * pulse, glowing ? COLOURS.glow : COLOURS.stake);
    }
    for (let k = 0; k < sockets.length; k++) {
      const j = k >> 1,
        s = sockets[k]!;
      if (j > next || rise[j]! >= RISE_S) continue;
      const yaw = bentAt[j]!.yaw;
      const colour = j === next && set < WORKS.ring ? COLOURS.glow : COLOURS.iron;
      for (const [dx, dz, w, d] of [
        [0, 0.8, 1.7, 0.2],
        [0, -0.8, 1.7, 0.2],
        [0.8, 0, 0.2, 1.4],
        [-0.8, 0, 0.2, 1.4],
      ] as const)
        live.box(
          s.x + Math.cos(yaw) * dx + Math.sin(yaw) * dz,
          s.y + 0.15,
          s.z - Math.sin(yaw) * dx + Math.cos(yaw) * dz,
          w,
          0.3,
          d,
          colour,
          yaw,
        );
      if (k < inSea()) footingParts(live, footingFrame(m, s.x, s.y, s.z, yaw));
    }
  }
  function drawLive() {
    live.begin();
    if (opened) {
      const k = stood();
      for (let j = 0; j < BENTS; j++) drawBent(j);
      drawRails(shownU);
      drawEnd(shownU, joined && k === BENTS);
      drawPlatform(shownU);
      drawKit();
      drawGap(Math.min(k, BENTS - 1));
      if (k === BENTS) {
        // The take-off rail along the platform's last 5 m and the gold land pad (RING_HOOK.pad), on the sea edge.
        for (let u = shownU - 5; u <= shownU - 0.2; u += 1.25) {
          world(u, SIDE.lat1 - 0.2);
          live.box(q.x, platY(u) + 0.55, q.z, 0.12, 1, 0.12, COLOURS.iron);
        }
        seg(shownU - 5, SIDE.lat1 - 0.2, shownU - 0.2, SIDE.lat1 - 0.2, 0.1, 0.1, PLATFORM.up + 1.0, COLOURS.edge);
        const pu = RING_HOOK.pad.u / 100;
        world(pu, RING_HOOK.pad.lat / 100);
        live.box(q.x, yAt(pu) + PLATFORM.up + 0.1, q.z, 2.4, 0.04, 2.4, COLOURS.gold, yawAt(pu), pitchAt(pu));
        // The ring's line home (gap-readability, H-A): a taut rope from the ring down to a short post and pulley at
        // the pad's rear sea corner (clear of the take-off), so the ring reads as one end of a line whose other end
        // is the pad. Drawn only.
        world(pu - 0.95, RING_HOOK.pad.lat / 100 + 0.95);
        const py = yAt(pu) + PLATFORM.up + 0.1;
        live.box(q.x, py + 0.55, q.z, 0.2, 1.1, 0.2, COLOURS.post, yawAt(pu));
        live.box(q.x, py + 1.16, q.z, 0.34, 0.34, 0.12, COLOURS.iron, yawAt(pu) + 0.35);
        bar(q.x, py + 1.16, q.z, pile.x, pile.ringY - 0.6, pile.z, 0.07, COLOURS.rope);
        drawTakeOff();
      }
      for (const l of lowering) drawLowering(l);
    }
    live.commit();
  }

  // ---------------------------------------------------------------- one frame
  function stepLowering(dt: number) {
    for (let i = lowering.length - 1; i >= 0; i--) {
      const l = lowering[i]!;
      const before = l.t;
      l.t += dt;
      const s = sockets[l.slot]!;
      const down = 0.6 + Math.hypot(s.x - jibHead.x, s.z - jibHead.z) / OUT_SPEED;
      if (before < down + LOWER_S * 0.55 && l.t >= down + LOWER_S * 0.55) splash(s.x, s.z, 0.6, SEA);
      if (l.t < down + LOWER_S) continue;
      lowering.splice(i, 1);
      thump(s.x, s.z);
      const pair = l.slot >> 1;
      if (inSea() >= pair * 2 + 2 && rise[pair]! < 0) {
        rise[pair] = 0;
        clank(bentAt[pair]!.x, bentAt[pair]!.z);
      }
    }
  }
  function snap() {
    refresh();
    lowering.length = 0;
    started = set;
    const pairs = Math.min(BENTS, set >> 1);
    for (let j = 0; j < BENTS; j++) {
      rise[j] = j < pairs ? RISE_S : -1;
      decked[j] = j < pairs;
    }
    baseOn = opened;
    shownU = headU(pairs);
    for (const pc of pieces) pc.born = -Infinity;
    for (const key of [...bodies.keys()]) wantSolid(key, false, () => null as never);
    placeJib();
    solids();
    drawStatic();
    animating = 0;
    drawnKey = '';
  }
  snap();

  function writeLeaf() {
    // The island's near view (the Way, the leaf, the halt) stays mounted at any distance once Q7 is laid: trains run on
    // it past the pier, and the far leaf is a picture.
    ringIslandNear.keep = opened;
  }

  return {
    restore: snap,
    /** Where a footing hopping off the wagon lands: the railhead rack's slot k. */
    rackSlot,
    update(dt: number) {
      clock += dt;
      refresh();
      if (set < started || (!opened && started)) snap();
      // Footings set since the last frame go down on the jib's rope from whoever set them.
      while (started < set) {
        const from = new THREE.Vector3();
        if (!actor || !avatarBack(actor, from)) from.copy(jibHead);
        lowering.push({ slot: Math.min(BENTS * 2 - 1, started), from, t: 0 });
        started++;
        clank(jibFoot.x, jibFoot.z);
      }
      actor = null;
      stepLowering(dt);
      // A bent whose pair arrived without a lowering here (a correction, a late accept) still rises.
      const pairs = Math.min(BENTS, inSea() >> 1);
      let changed = false;
      for (let j = 0; j < BENTS; j++) {
        if (rise[j]! >= 0) rise[j] = rise[j]! + dt;
        else if (j < pairs) rise[j] = 0;
        if (!decked[j] && rise[j]! >= DECK_AFTER) {
          decked[j] = true;
          changed = true;
          for (const pc of pieces) if (pc.group === j) pc.born = clock + (pc.at - spanFrom(j)) * SWEEP_S;
          placeSound('shoulder', bentAt[j]!.x, bentAt[j]!.z);
        }
      }
      if (baseOn !== opened) {
        baseOn = opened;
        changed = true;
      }
      if (changed) {
        animating = DROP_S + 1.2;
        solids();
      }
      const goal = headU(stood());
      shownU = slide(shownU, goal, dt);
      placeJib();
      if (animating > 0) {
        animating -= dt;
        drawStatic();
      }
      const key = `${stood()}|${settled()}`;
      if (key !== drawnKey) {
        drawnKey = key;
        solids();
      }
      deps.hookRing(opened && decked[BENTS - 1]! && set >= WORKS.ring);
      writeLeaf();
      placeTag();
      drawLive();
    },
    accepted(e: RailwayAccepted) {
      if (e.op === 'rail.footSet' && e.site === 3) actor = e.pid;
      if (e.op === 'rail.footTake' && e.rack === 2) {
        rackSlot(Math.max(0, rack - 1), p);
        placeSound('shoulder', p.x, p.z);
        dustRing(p.x, p.y + 0.1, p.z, 6, 1, 0.2);
      }
    },
    corrected(c: RailwayCorrection) {
      if (c.event.op === 'rail.footSet' && c.event.site === 3) lowering.length = 0;
    },
    targets(): Interactable[] {
      const pos = me.body?.position;
      refresh();
      if (!opened || !pos || !settled()) return [];
      const head = RING_HEAD[simHead()]!;
      const pid = adapter.read.pid,
        mine = account(wd, pid),
        out: Interactable[] = [];
      const backFree = !mine?.carry && !mine?.stone && !mine?.rails && !mine?.foot;
      const free = backFree && beam(wd).holder !== pid && boiler(wd).holder !== pid;
      const rackAt = { x: head.rack.x / 100, z: head.rack.z / 100 };
      if (
        rack > 0 &&
        Math.hypot(pos.x - rackAt.x, pos.z - rackAt.z) <= head.rack.reach / 100 - 0.4 &&
        Math.abs(pos.y - head.rack.y / 100) <= 2.6
      ) {
        const top = rackSlot(Math.max(0, rack - 1), new THREE.Vector3()).add(new THREE.Vector3(0, 1.6, 0));
        out.push(
          free
            ? {
                id: 'railway-foot-take-2',
                verb: 'Shoulder a footing',
                at: top,
                run: () => void adapter.shoulderFooting(2),
              }
            : onlyALoadIn(wd, pid, false)
              ? {
                  id: 'railway-foot-take-2',
                  verb: 'Shoulder a footing',
                  at: top,
                  run: () => void setDownThen(adapter, () => adapter.shoulderFooting(2), rackAt),
                }
              : { id: 'railway-foot-take-2', verb: 'Shoulder a footing', at: top, blocked: 'Empty your back first' },
        );
      }
      if (
        mine?.foot &&
        // The bent's footing, then (the gap footed) a counterweight footing: one site, its meaning by state (call 7).
        jibOffered(set, cw) &&
        Math.hypot(pos.x - head.jib.x / 100, pos.z - head.jib.z / 100) <= head.jib.reach / 100 - 0.4 &&
        Math.abs(pos.y - head.jib.y / 100) <= 2.6
      )
        out.push({
          id: 'railway-foot-set-3',
          verb: jibVerb(set),
          at: new THREE.Vector3(jibFoot.x, jibFoot.y + 1.8, jibFoot.z),
          run: () => void adapter.setFooting(3),
        });
      return out;
    },
    inspect: () => ({
      railheadView: {
        opened,
        set,
        started,
        sim: simHead(),
        stood: stood(),
        decked: decked.filter(Boolean).length,
        shownU,
        settled: settled(),
        rackTag: tagOn ? RACK_TAG : null,
        lowering: lowering.length,
        inSea: inSea(),
        rack: Math.max(0, rack - deps.toRing()),
        pieces: staticBatch.count,
        live: live.count,
        solids: bodies.size,
      },
    }),
  };
}
