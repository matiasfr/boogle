// The stack line to High Gorge, the greybox's views (docs/plans/greybox-route.md, leg 1 step 4, as its design review
// rules it: answers b, e, g, i, j, k and l). A Local view of accepted state, mounted by the railway's works seam
// (railway/works-live.ts) because its prompts send through the adapter only that view holds. Everything is read from
// `adapter.read.world()` at the head of each entry point; nothing is kept from a world.
//
//   the deck      line 2 on from Ring Island's platforms along the `ring` row: a slab, two tracks and sea bents as far
//                 as the line's end (the run-off at stage 0, then each section's end; a section laying grows over its
//                 lay clock), with the buffers and the end board at that end
//   the site      the current section's frame, its bill sign, the rack and its plate: on Ring Island's west platform
//                 for section 1, then at each railhead
//   the heads     a 25 m platform with a sea ramp at every head that is a stop (the levers are railway/halts-view.ts's)
//   the signals   a post, an arm and a plate at each section end the line has passed
//   High Gorge    the pickup post on the north rim, the incline's barrier, the stand-in town's board (the massing is
//                 ./massing.ts's, resident by distance)
//   the prompts   Feed the frame, Take logs, Take rails, the pickup and the barrier
//
// Grey boxes and placeholder labels (none is The Boogler's), no effects and no sound (owner-calls, "mechanisms,
// systems, greybox, details"). The objective line's four texts go to the play record (src/proto/mark.ts): the route
// has no on-screen objective line and this adds no HUD element.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Body } from '../../physics/engine.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { camera } from '../../render/scene.ts';
import { signBoard, type SignBoard } from '../../render/sign-board.ts';
import { playObjective } from '../../proto/mark.ts';
import { LINE2, RAIL_LINES } from '../../sim/railway-lines.ts';
import { LINE_SLOTS } from '../../sim/railway-trains.ts';
import { TRAIN_PHASE } from '../../sim/railway-train.ts';
import { RING_S_HEAD } from '../../sim/railway-ring-layout.ts';
import { LEG_TUNE, RAIL_LEGS, legFrame, legRack, legS } from '../../sim/railway-route.ts';
import { account, aperture, rail, train } from '../../sim/railway-rows.ts';
import { free, heldBig } from '../../sim/railway-queries.ts';
import { gateLeg, legDone, legOpen, legReached, legRow, routeRow } from '../../sim/railway-queries-route.ts';
import { createBoxBatch } from '../railway/works-box-view.ts';
import { LINE2_END_S, line2At, line2World, line2Y } from '../railway/line2-path.ts';
import { islandGround, ringIslandNear } from '../ring-island/state.ts';
import { GATE_AT, GORGE_DECK, PICK_AT, TOWN_PAD, gorgeAt } from './massing.ts';
import type { GreyBox } from './boxes.ts';

// Placeholder labels (the step 4 design review's answers b, e, i, k and l; none is The Boogler's).
const FEED = 'Feed the frame',
  TAKE_LOGS = 'Take logs',
  TAKE_RAILS = 'Take rails',
  BRING_LOGS = 'Bring logs',
  BRING_RAILS = 'Bring rails',
  BRING_BOTH = 'Bring logs or rails',
  BACK_FULL = 'Your back is full',
  HANDS_FULL = 'Hands full',
  TAKE_PICK = 'Take the powered pick',
  NOT_YET = 'Not yet',
  OPEN_GATE = 'Open the barrier',
  NEEDS_PICK = 'Needs the powered pick',
  NO_LINE = 'No line beyond yet',
  LINE_NAME = 'LINE TO HIGH GORGE',
  UNDER_WAY = 'UNDER CONSTRUCTION';
export const LEG_OBJECTIVES = {
  first: "Build the line to High Gorge: section 1 of 4. The frame is on Ring Island's west platform.",
  next: (n: number, of: number) => `Build the line to High Gorge: section ${n} of ${of}. Ride line 2 to the railhead.`,
  open: 'High Gorge is open. Ride line 2 to its end and climb the stair.',
  gate: "Open the barrier behind High Gorge's south platform.",
} as const;

const SIGN_LOOK = { ground: '#fff3d6', ink: '#2a1c10' };
const GREY = '#9c9ea1',
  GREY_DARK = '#6f7275',
  GREY_LIGHT = '#b4b6b8',
  LOG = '#9a8f80',
  RAIL = '#45474b',
  BED = '#77705f',
  DANGER = '#c8402c',
  CLEAR = '#3c8f4a';

/** The stack leg (RAIL_LEGS slot 0) and its numbers, metres along line 2. */
const LEG = 0,
  STACK = RAIL_LEGS[LEG]!,
  SECTIONS = STACK.sections.length,
  RING_S = RING_S_HEAD / 100;
/** Each section's end. */
const R = STACK.sections.map((sec) => legS(STACK, sec.toCm) / 100);
/** Where the stack line's own rails and deck start (u 470: ring-island/view.ts ends the Way's there). */
const RAILS_FROM = RING_S + 470,
  DECK_FROM = RING_S + 470;
/** The line's end by sections laid: the run-off's (u 483.5), each section's, the row's (20 m past High Gorge's stop). */
const END = [RING_S + 483.5, ...R.slice(0, -1), LINE2_END_S];
/** The formation: the down track at lat 0, the up track 4 m west; the slab's middle and width. */
const TRACK_LATS = [0, -4],
  FORM_MID = -2,
  FORM_W = 8.6;
const SEG = 10,
  SEA_BED = -8;
/** A head's platform (RING_HEAD's: lat +1.8 to +6.3, the 25 m before the section's end, 90 cm over the rails). */
const PLAT = { len: 25, lat: 4.05, w: 4.5, up: 0.9 };

const metres = (p: { x: number; y: number; z: number }) => ({ x: p.x / 100, y: p.y / 100, z: p.z / 100 });
const within = (p: { x: number; y: number; z: number }, site: { x: number; y: number; z: number }, reach: number) =>
  Math.hypot(p.x - site.x, p.z - site.z) <= reach / 100 - 0.4 && Math.abs(p.y - site.y) <= 2.6;

/** A site's frame: its point, the line's outbound heading there and the unit vector toward the tracks. */
type Site = { x: number; y: number; z: number; hx: number; hz: number; tx: number; tz: number; yaw: number };
const P = { x: 0, z: 0, ux: 0, uz: 1 },
  q = { x: 0, z: 0 };
function siteAt(p: { x: number; y: number; z: number }, s: number, toTrack: 1 | -1): Site {
  line2At(s, P);
  // lat + is (-uz, ux); `toTrack` is the sign of the way from the site to the rails along it.
  return {
    ...metres(p),
    hx: P.ux,
    hz: P.uz,
    tx: -P.uz * toTrack,
    tz: P.ux * toTrack,
    yaw: Math.atan2(P.ux, P.uz),
  };
}
/** Section k's frame and rack: on Ring Island's west platform (the rails are east of it), then at its railhead. */
const FRAMES = STACK.sections.map((_s, k) =>
    siteAt(legFrame(STACK, k), k === 0 ? RING_S + 453 : R[k - 1]! - 8, k === 0 ? 1 : -1),
  ),
  RACKS = STACK.sections.map((_s, k) =>
    siteAt(legRack(STACK, k), k === 0 ? RING_S + 446 : R[k - 1]! - 18, k === 0 ? 1 : -1),
  );
const local = (site: Site, along: number, toTrack: number) => ({
  x: site.x + site.hx * along + site.tx * toTrack,
  z: site.z + site.hz * along + site.tz * toTrack,
});

/** A sign's lines, largest first where `size` says so (fractions of the face's height). */
function paint(sign: SignBoard, lines: readonly { t: string; size: number }[], badge = '') {
  const { g, cw, ch } = sign;
  g.clearRect(0, 0, cw, ch);
  g.fillStyle = SIGN_LOOK.ground;
  g.fillRect(0, 0, cw, ch);
  g.strokeStyle = SIGN_LOOK.ink;
  g.lineWidth = ch * 0.03;
  g.strokeRect(ch * 0.03, ch * 0.03, cw - ch * 0.06, ch - ch * 0.06);
  g.fillStyle = SIGN_LOOK.ink;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  // The section's number in a square at the left, the same on the frame's sign and the rack's plate (answer j).
  const left = badge ? ch * 0.62 : 0;
  if (badge) {
    g.fillRect(ch * 0.1, ch * 0.14, ch * 0.5, ch * 0.72);
    g.fillStyle = SIGN_LOOK.ground;
    g.font = `900 ${ch * 0.56}px Figtree, system-ui, sans-serif`;
    g.fillText(badge, ch * 0.35, ch * 0.53);
    g.fillStyle = SIGN_LOOK.ink;
  }
  const total = lines.reduce((n, l) => n + l.size * 1.25, 0);
  let y = (ch * (1 - total)) / 2;
  for (const l of lines) {
    g.font = `900 ${ch * l.size}px Figtree, system-ui, sans-serif`;
    y += ch * l.size * 0.625;
    g.fillText(l.t, left + (cw - left) / 2, y, (cw - left) * 0.88);
    y += ch * l.size * 0.625;
  }
  sign.painted();
}

export async function createLegView(adapter: RailwayAdapter, owner: OwnedView) {
  const [{ addStatic, slab }, ground] = await Promise.all([import('../../place/land.ts'), islandGround()]);
  const deck = createBoxBatch(owner, 2400, false),
    things = createBoxBatch(owner, 420, false);
  // Named, so a look can count what the leg's views add to a frame (dev/look/evals/stack-draws.ts).
  deck.mesh.name = 'route-greybox:deck';
  things.mesh.name = 'route-greybox:things';

  // ---------------------------------------------------------------- signs
  const sign = (w: number, h: number, foot: number, posts: 'one' | 'two' | 'none', px = 512) => {
    const s = signBoard(owner, { w, h, px, foot, posts, wood: '#5d6063' });
    s.mesh.visible = false;
    s.mesh.name = 'route-greybox:sign';
    return { ...s, text: '' };
  };
  type Sign = ReturnType<typeof sign>;
  /** Paints `lines` on `s` if they changed, and stands it at (x, y, z) facing (nx, nz). */
  function show(
    s: Sign,
    at: { x: number; z: number },
    y: number,
    nx: number,
    nz: number,
    lines: readonly { t: string; size: number }[],
    badge = '',
  ) {
    const text = `${badge}|${lines.map((l) => l.t).join('|')}`;
    if (text !== s.text) {
      s.text = text;
      paint(s, lines, badge);
    }
    s.mesh.position.set(at.x, y, at.z);
    s.mesh.rotation.y = Math.atan2(nx, nz);
    s.mesh.visible = true;
  }
  // The bill's foot clears the frame's top rail (1.7 m), which covered its last line from across the tracks.
  const bill = sign(4.2, 1.8, 1.8, 'one', 768),
    plate = sign(1.9, 0.8, 1.3, 'one', 384),
    endBoard = sign(5.2, 1.4, 0.9, 'two', 768),
    signalPlates = R.slice(0, -1).map(() => sign(1.5, 0.8, 2.6, 'one', 256)),
    pickPlate = sign(2.2, 0.9, 1.7, 'one', 384),
    gatePlate = sign(3, 1, 2.3, 'none', 384),
    townBoard = sign(3.2, 1.3, 1.2, 'two', 512);

  // ---------------------------------------------------------------- the deck and its colliders
  let deckEnd = -1,
    deckLaid = -1;
  const deckBodies: Body[] = [];
  /** A box along the line from `s0` to `s1` at `lat`, its top `up` over the rails. */
  function along(batch: typeof deck, s0: number, s1: number, lat: number, up: number, w: number, h: number, c: string) {
    line2World(s0, lat, q);
    const ax = q.x,
      az = q.z,
      ay = line2Y(s0) + up;
    line2World(s1, lat, q);
    const by = line2Y(s1) + up,
      run = Math.hypot(q.x - ax, q.z - az),
      pitch = Math.atan2(by - ay, run);
    batch.box(
      (ax + q.x) / 2,
      (ay + by) / 2 - h / 2,
      (az + q.z) / 2,
      w,
      h,
      Math.hypot(run, by - ay) + 0.02,
      c,
      Math.atan2(q.x - ax, q.z - az),
      -pitch,
    );
  }
  function drawDeck(end: number) {
    deck.begin();
    for (let s0 = RAILS_FROM; s0 < end - 1e-6; s0 += SEG) {
      const s1 = Math.min(end, s0 + SEG);
      if (s1 > DECK_FROM) along(deck, Math.max(s0, DECK_FROM), s1, FORM_MID, 0, FORM_W, 0.5, GREY);
      for (const t of TRACK_LATS) {
        along(deck, s0, s1, t, 0.13, 2.4, 0.1, BED);
        for (const r of [-0.5, 0.5]) along(deck, s0, s1, t + r, 0.29, 0.12, 0.14, RAIL);
      }
      // A bent every 20 m where the deck stands clear of the ground: two posts to the sea bed and a cap.
      if (Math.round((s0 - RAILS_FROM) / SEG) % 2 === 0 && s0 >= DECK_FROM) {
        const y = line2Y(s0);
        line2World(s0, FORM_MID, q);
        const foot = Math.max(SEA_BED, ground.onIsland(q.x, q.z) ? ground.islandH(q.x, q.z) : SEA_BED);
        if (foot < y - 1.5) {
          line2At(s0, P);
          const yaw = Math.atan2(P.ux, P.uz);
          for (const lat of [FORM_MID - 3.4, FORM_MID + 3.4]) {
            line2World(s0, lat, q);
            deck.box(q.x, (y - 0.5 + foot) / 2, q.z, 0.5, y - 0.5 - foot, 0.5, GREY_DARK, yaw);
          }
          line2World(s0, FORM_MID, q);
          deck.box(q.x, y - 0.75, q.z, FORM_W, 0.5, 0.6, GREY_DARK, yaw);
        }
      }
    }
    deck.commit();
  }
  /** The deck's walkable top as far as the laid end (a section still laying is drawn, not yet solid). */
  function solidDeck(laid: number) {
    for (const b of deckBodies.splice(0)) owner.removeBody(b);
    const end = END[laid]!,
      a = { x: 0, z: 0 },
      b = { x: 0, z: 0 };
    for (let s0 = DECK_FROM; s0 < end - 1e-6; s0 += SEG) {
      const s1 = Math.min(end, s0 + SEG);
      line2World(s0, FORM_MID, a);
      line2World(s1, FORM_MID, b);
      deckBodies.push(slab(a.x, a.z, b.x, b.z, line2Y(s0), line2Y(s1), FORM_W, owner, 0.05));
    }
  }

  // ---------------------------------------------------------------- the pieces that stand by state
  /** The boxes that stand for a state of the line: buffers at its end, and each stopping head's platform and ramp. */
  function pieces(laid: number): GreyBox[] {
    const out: GreyBox[] = [];
    const box = (s0: number, s1: number, lat: number, up0: number, up1: number, w: number, h: number, c: string) => {
      line2World(s0, lat, q);
      const a = { x: q.x, z: q.z, y: line2Y(s0) + up0 };
      line2World(s1, lat, q);
      const b = { x: q.x, z: q.z, y: line2Y(s1) + up1 },
        run = Math.hypot(b.x - a.x, b.z - a.z),
        pitch = Math.atan2(b.y - a.y, run);
      out.push({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2 - (h / 2) * Math.cos(pitch),
        z: (a.z + b.z) / 2,
        w,
        h,
        d: Math.hypot(run, b.y - a.y),
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
        pitch,
        colour: c,
      });
    };
    // The buffers: a timber stop on each track, its face half a metre short of the run-off's end and 1.8 m short of
    // a railhead's (the review's g) and of the Gorge's concourse.
    const end = END[laid]!,
      face = laid === 0 ? end - 0.5 : end - 1.8;
    for (const t of TRACK_LATS) box(face, face + 0.6, t, 1.4, 1.4, 2.6, 1.2, GREY_DARK);
    // The heads that are stops now: head j (1 to 3) from its section's lay until it closes behind two lays on; the
    // third stays (the request stop `Stack halt`).
    for (let j = 1; j < SECTIONS; j++) {
      const closes = RAIL_LINES[LINE2]!.halts[STACK.railheadHalt + j - 1]!.closesAt;
      if (laid < j || (closes !== undefined && laid >= j + 2)) continue;
      const r = R[j - 1]!;
      for (let s = r - PLAT.len; s < r - 1e-6; s += 5) {
        box(s, s + 5, PLAT.lat, PLAT.up, PLAT.up, PLAT.w, 0.5, GREY_LIGHT);
        line2World(s + 2.5, PLAT.lat, q);
        const top = line2Y(s + 2.5) + PLAT.up - 0.5;
        out.push({
          x: q.x,
          y: (top + SEA_BED) / 2,
          z: q.z,
          w: 0.5,
          h: top - SEA_BED,
          d: 0.5,
          yaw: 0,
          colour: GREY_DARK,
        });
      }
      // The sea ramp (the deck is 4 m over open water): a landing behind the platform's home end, then a slip down
      // along the line to under the surface, at the Ring ramps' pitch.
      const lat = PLAT.lat + PLAT.w / 2 + 1,
        drop = line2Y(r) + PLAT.up + 1.3;
      box(r - PLAT.len, r - PLAT.len + 3, lat, PLAT.up, PLAT.up, 2, 0.4, GREY);
      box(r - PLAT.len + 3, r - PLAT.len + 3 + drop / 0.54, lat, PLAT.up, PLAT.up - drop, 2, 0.3, GREY);
    }
    return out;
  }
  let stood = -1;
  /** Takes the deck's slabs and the standing pieces' colliders away (and forgets what was drawn), until next shown. */
  function clear() {
    if (deckLaid < 0 && stood < 0 && deckEnd < 0) return;
    for (const b of deckBodies.splice(0)) owner.removeBody(b);
    for (const b of standing.bodies.splice(0)) owner.removeBody(b);
    standing.boxes = [];
    deckLaid = stood = deckEnd = -1;
    deck.begin();
    deck.commit();
  }
  const standing: { boxes: GreyBox[]; bodies: Body[] } = { boxes: [], bodies: [] };
  const euler = new THREE.Euler(0, 0, 0, 'YXZ'),
    quat = new THREE.Quaternion();
  function stand(laid: number) {
    if (laid === stood) return;
    stood = laid;
    for (const b of standing.bodies.splice(0)) owner.removeBody(b);
    standing.boxes = pieces(laid);
    for (const b of standing.boxes)
      standing.bodies.push(
        addStatic(
          { kind: 'box', hx: b.w / 2, hy: b.h / 2, hz: b.d / 2 },
          { x: b.x, y: b.y, z: b.z },
          quat.setFromEuler(euler.set(-(b.pitch ?? 0), b.yaw, 0)).clone(),
          undefined,
          owner,
        ),
      );
  }

  // ---------------------------------------------------------------- reads
  function rows() {
    if (!adapter.read.whole()) return null;
    const wd = adapter.read.world(),
      leg = legRow(wd, LEG),
      route = routeRow(wd),
      stock = rail(wd);
    const open = legOpen(wd, LEG),
      done = legDone(wd, LEG);
    return {
      wd,
      leg,
      open,
      done,
      reached: legReached(wd, LEG),
      joined: aperture(wd).joined >= 0,
      laid: Math.min(SECTIONS, leg.laid),
      // The racks are the open leg's only once it is open (before, Rail.depot is a Q job's).
      rack: open ? { logs: stock.depot, rails: stock.depotRails } : { logs: 0, rails: 0 },
      pick: !!(route.grants & 1),
      gate: !!(route.gates & 1),
    };
  }
  /** A train of line 2 held at the block signal at `s` metres (standing at no halt, within a train's length of it). */
  const heldAt = (wd: ReturnType<typeof adapter.read.world>, s: number) =>
    LINE_SLOTS[LINE2]!.some((slot) => {
      const t = train(wd, slot);
      return t.phase === TRAIN_PHASE.STAND && t.at < 0 && Math.abs(t.from / 100 - s) < 80;
    });
  const nearGorge = () => {
    const g = gorgeAt(0, 0),
      b = me.body?.position;
    return (
      Math.hypot(camera.position.x - g.x, camera.position.z - g.z) < 700 ||
      (!!b && Math.hypot(b.x - g.x, b.z - g.z) < 700)
    );
  };

  let objective = '';
  function draw() {
    const r = rows();
    for (const s of [bill, plate, endBoard, pickPlate, gatePlate, townBoard, ...signalPlates]) s.mesh.visible = false;
    // With nothing laid the line's end is Ring Island's run-off, which belongs to the island's near view: its deck,
    // its slabs and the buffers (drawn and solid) stand only while that view is mounted. Across the sea the island
    // is its far cones, and a slab there would float over the bare hillside.
    const here = !!r && (r.laid > 0 || ringIslandNear.mounted);
    deck.mesh.visible = here;
    things.mesh.visible = !!r;
    if (!r || !here) {
      clear();
      things.begin();
      things.commit();
      if (!r) return;
      gorge(r);
      things.commit();
      note(r);
      return;
    }
    const { leg, laid } = r;
    // The deck: to the laid end, and on over a laying section's lay clock (2 m steps).
    const laying = r.open && leg.start >= 0 && laid < SECTIONS;
    const grown = laying
      ? Math.max(0, Math.min(1, (adapter.read.tick() - leg.start) / LEG_TUNE.layTicks)) * (END[laid + 1]! - END[laid]!)
      : 0;
    const end = END[laid]! + Math.floor(grown / 2) * 2;
    if (end !== deckEnd) drawDeck((deckEnd = end));
    if (laid !== deckLaid) solidDeck((deckLaid = laid));
    stand(laid);

    things.begin();
    for (const b of standing.boxes) things.box(b.x, b.y, b.z, b.w, b.h, b.d, b.colour ?? GREY, b.yaw, -(b.pitch ?? 0));
    // The end board, 1.5 m behind the buffers' faces, facing back down the line: blank until the rivet, then the
    // line's name; it travels with the head and is gone at High Gorge (answer i).
    const ringEnd = laid === 0;
    if (laid < SECTIONS) {
      const s = ringEnd ? END[0]! + 0.6 : END[laid]! - 0.3;
      line2At(s, P);
      line2World(s, FORM_MID, q);
      show(
        endBoard,
        q,
        line2Y(s),
        -P.ux,
        -P.uz,
        r.joined
          ? [
              { t: LINE_NAME, size: 0.34 },
              { t: UNDER_WAY, size: 0.22 },
            ]
          : [],
      );
    }
    // The block signals the line has passed (answer e): a post between the tracks 3 m beyond each section end, its
    // arm at danger while a train is held there.
    signalPlates.forEach((s, k) => {
      if (laid <= k + 1) return;
      const at = R[k]! + 3;
      line2At(at, P);
      line2World(at, FORM_MID, q);
      const y = line2Y(at);
      show(s, q, y, -P.ux, -P.uz, [
        { t: 'SIGNAL', size: 0.36 },
        { t: 'TRAIN AHEAD', size: 0.22 },
      ]);
      const held = heldAt(r.wd, R[k]!);
      things.box(q.x, y + 3.9, q.z, 1.3, 0.22, 0.12, held ? DANGER : CLEAR, Math.atan2(P.ux, P.uz), 0, held ? 0 : 0.7);
    });

    // The current section's frame, bill, rack and plate.
    if (r.open) {
      const f = FRAMES[laid]!,
        k = RACKS[laid]!,
        sec = STACK.sections[laid]!,
        n = String(laid + 1);
      const put = (site: Site, a: number, t: number, y: number, w: number, h: number, d: number, c: string) => {
        const p = local(site, a, t);
        things.box(p.x, site.y + y, p.z, w, h, d, c, site.yaw);
      };
      // The frame: 2.6 m along, 2.0 m across: a pallet, four posts and two top rails; the fed logs and rails inside.
      put(f, 0, 0, 0.06, 2.0, 0.12, 2.6, GREY_DARK);
      for (const a of [-1.25, 1.25]) for (const t of [-0.95, 0.95]) put(f, a, t, 0.85, 0.1, 1.7, 0.1, GREY);
      for (const t of [-0.95, 0.95]) put(f, 0, t, 1.65, 0.1, 0.1, 2.6, GREY);
      for (let i = 0; i < Math.min(leg.logs, sec.logs); i++)
        put(f, -1.05 + (i % 5) * 0.22, 0, 0.24 + Math.floor(i / 5) * 0.22, 1.7, 0.2, 0.2, LOG);
      for (let i = 0; i < Math.min(leg.rails, sec.rails); i++)
        put(f, 0.2 + (i % 5) * 0.2, 0, 0.18 + Math.floor(i / 5) * 0.12, 1.7, 0.1, 0.1, RAIL);
      const where = laying
        ? 'LAYING THE SECTION'
        : r.rack.logs + r.rack.rails > 0
          ? 'KIT: ON THE RACK'
          : 'KIT: ON A TRAIN';
      show(
        bill,
        local(f, 1.5, 0),
        f.y,
        f.tx,
        f.tz,
        [
          { t: LINE_NAME, size: 0.2 },
          { t: `SECTION ${n} OF ${SECTIONS}`, size: 0.15 },
          { t: `LOGS ${leg.logs}/${sec.logs}   RAILS ${leg.rails}/${sec.rails}`, size: 0.15 },
          { t: where, size: 0.13 },
        ],
        n,
      );
      // The rack: a pallet, the logs and rails a train has set down, and the plate with the section's number.
      put(k, 0, 0, 0.06, 1.9, 0.12, 2.6, GREY_DARK);
      for (let i = 0; i < Math.min(r.rack.logs, 40); i++)
        put(k, -1.05 + (i % 5) * 0.22, 0, 0.24 + Math.floor(i / 5) * 0.22, 1.7, 0.2, 0.2, LOG);
      for (let i = 0; i < Math.min(r.rack.rails, 40); i++)
        put(k, 0.2 + (i % 5) * 0.2, 0, 0.18 + Math.floor(i / 5) * 0.12, 1.7, 0.1, 0.1, RAIL);
      show(plate, local(k, -1.6, 0), k.y, k.tx, k.tz, [{ t: `KIT ${n}`, size: 0.5 }], n);
    }

    gorge(r);
    things.commit();
    note(r);
  }
  /** High Gorge: the pickup post, the barrier and the stand-in town's board, while you are near it (into `things`). */
  function gorge(r: NonNullable<ReturnType<typeof rows>>) {
    if (nearGorge()) {
      const north = gorgeAt(0, -1),
        o = gorgeAt(0, 0),
        toSplit = { x: o.x - north.x, z: o.z - north.z },
        alongA = { x: gorgeAt(1, 0).x - o.x, z: gorgeAt(1, 0).z - o.z },
        yawA = Math.atan2(alongA.x, alongA.z);
      if (!r.pick)
        things.box(PICK_AT.x, PICK_AT.y + 0.7, PICK_AT.z, 0.5, 1.4, 0.5, r.done ? '#e8b72c' : GREY_DARK, yawA);
      show(
        pickPlate,
        { x: PICK_AT.x - alongA.x * 1.6, z: PICK_AT.z - alongA.z * 1.6 },
        PICK_AT.y,
        toSplit.x,
        toSplit.z,
        [
          { t: 'POWERED PICK', size: 0.34 },
          { t: r.pick ? 'TAKEN' : r.done ? 'TAKE IT' : 'NOT YET', size: 0.26 },
        ],
      );
      // The barrier: two posts and a bar across the pad, lifted once it is open.
      for (const side of [-1.6, 1.6])
        things.box(
          GATE_AT.x + alongA.x * side,
          GATE_AT.y + 1.1,
          GATE_AT.z + alongA.z * side,
          0.3,
          2.2,
          0.3,
          GREY_DARK,
          yawA,
        );
      things.box(
        GATE_AT.x,
        GATE_AT.y + (r.gate ? 2.1 : 1.1),
        GATE_AT.z,
        0.2,
        r.gate ? 0.2 : 1.6,
        3.2,
        r.gate ? CLEAR : DANGER,
        yawA,
      );
      show(gatePlate, GATE_AT, GATE_AT.y, -toSplit.x, -toSplit.z, [
        { t: 'BARRIER: THE INCLINE', size: 0.3 },
        { t: r.gate ? 'OPEN' : r.pick ? 'SHUT' : 'NEEDS THE POWERED PICK', size: 0.24 },
      ]);
      const t = gorgeAt(TOWN_PAD.a1 - 1.2, (TOWN_PAD.c0 + TOWN_PAD.c1) / 2);
      show(townBoard, t, GORGE_DECK, alongA.x, alongA.z, [
        { t: 'HIGH GORGE TOWN', size: 0.3 },
        { t: 'STAND-IN: 3 PLOTS STAKED', size: 0.2 },
      ]);
    }
  }
  /** The objective line's text, to the play record (no on-screen line on the route). */
  function note(r: NonNullable<ReturnType<typeof rows>>) {
    const laid = r.laid;
    const text = !r.reached
      ? ''
      : !r.done
        ? laid === 0
          ? LEG_OBJECTIVES.first
          : LEG_OBJECTIVES.next(laid + 1, SECTIONS)
        : !r.pick
          ? LEG_OBJECTIVES.open
          : !r.gate
            ? LEG_OBJECTIVES.gate
            : '';
    if (text !== objective) {
      objective = text;
      if (text) playObjective(text);
    }
  }

  const v3 = (p: { x: number; z: number }, y: number) => new THREE.Vector3(p.x, y, p.z);
  draw();
  return {
    restore: draw,
    update: draw,
    accepted() {},
    /** Feed the frame and the rack's two takes while the leg is open; the pickup and the barrier at High Gorge. An
     * empty or wrong back meets "Feed the frame" blocked with its reason, never silence. */
    targets(): Interactable[] {
      const p = me.body?.position,
        r = rows();
      if (!p || !r || !adapter.read.ready()) return [];
      const { wd, leg, laid } = r,
        mine = account(wd, adapter.read.pid),
        out: Interactable[] = [];
      if (r.open && (laid > 0 || ringIslandNear.mounted)) {
        const f = FRAMES[laid]!,
          k = RACKS[laid]!,
          sec = STACK.sections[laid]!;
        if (leg.start < 0 && within(p, f, legFrame(STACK, laid).reach)) {
          const needLogs = leg.logs < sec.logs,
            needRails = leg.rails < sec.rails;
          if (needLogs || needRails) {
            const fills = ((mine?.carry ?? 0) > 0 && needLogs) || ((mine?.rails ?? 0) > 0 && needRails);
            const target = { id: 'railway-leg-feed', verb: FEED, at: v3(f, f.y + 1.5) };
            out.push(
              fills
                ? { ...target, run: () => void adapter.feedLeg(LEG) }
                : { ...target, blocked: needLogs && needRails ? BRING_BOTH : needLogs ? BRING_LOGS : BRING_RAILS },
            );
          }
        }
        if (within(p, k, legRack(STACK, laid).reach)) {
          // A blocked prompt carries its reason and no `run`.
          const full = mine && free(wd, mine) <= 0 ? (heldBig(wd, mine) ? HANDS_FULL : BACK_FULL) : null;
          const take = (id: string, verb: string, along: number, run: () => void): Interactable => {
            const target = { id, verb, at: v3(local(k, along, 0), k.y + 1.3) };
            return full ? { ...target, blocked: full } : { ...target, run };
          };
          if (r.rack.logs > 0)
            out.push(take('railway-leg-take-logs', TAKE_LOGS, -0.6, () => void adapter.depotTake()));
          if (r.rack.rails > 0)
            out.push(take('railway-leg-take-rails', TAKE_RAILS, 0.6, () => void adapter.depotRailTake()));
        }
      }
      // The pickup refuses until the fourth section is laid ("Not yet": call 28); the barrier until the room holds
      // the pick, and then until the leg it shuts is built (leg 2's rules: the rule refuses it today).
      if (!r.pick && within(p, PICK_AT, 400)) {
        const target = { id: 'railway-leg-pick', verb: TAKE_PICK, at: v3(PICK_AT, PICK_AT.y + 1.6) };
        out.push(r.done ? { ...target, run: () => void adapter.takeGrant(0) } : { ...target, blocked: NOT_YET });
      }
      if (!r.gate && within(p, GATE_AT, 1260)) {
        const target = { id: 'railway-leg-gate', verb: OPEN_GATE, at: v3(GATE_AT, GATE_AT.y + 1.6) },
          shuts = gateLeg(0);
        out.push(
          !r.pick
            ? { ...target, blocked: NEEDS_PICK }
            : shuts && legOpen(wd, shuts.leg)
              ? { ...target, run: () => void adapter.openGate(0) }
              : { ...target, blocked: NO_LINE },
        );
      }
      return out;
    },
    inspect: () => {
      const r = rows();
      return {
        legView: {
          laid: r?.laid ?? null,
          deckEnd,
          deckSolids: deckBodies.length,
          standing: standing.boxes.length,
          boxes: deck.count + things.count,
          bill: bill.mesh.visible ? bill.text : null,
          plate: plate.mesh.visible ? plate.text : null,
          endBoard: endBoard.mesh.visible ? endBoard.text : null,
          signals: signalPlates.filter((s) => s.mesh.visible).length,
          frame: r ? { logs: r.leg.logs, rails: r.leg.rails, laying: r.leg.start >= 0 } : null,
          rack: r?.rack ?? null,
          pick: r?.pick ?? false,
          gate: r?.gate ?? false,
          objective,
        },
      };
    },
  };
}
