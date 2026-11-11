// The first sea crossing, live from accepted state (docs/plans/split-rock-roundhouse.md, J5c): from Q6 the pier head
// shows twelve empty footing sockets on the sea floor along `ringx` and a stake at each bent, the pier rack on the Pier
// halt holds what the wagon brought, and a jib at the pier head lowers each set footing on a rope into its socket.
// Every pair raises a trestle bent to deck height; twelve set is the finale (./crossing-show.ts): a whistle, then a camera
// pull-out along the bents to Ring Island with ten rockets and a banner. Local view: lowering, bents rising and the show
// play on accepted events and live edges, so every page that sees the twelfth footing live plays the finale (the owner's
// "shared moments play for everyone", 10 November); restore snaps them and never plays one.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { splash } from '../../render/splash.ts';
import { emit } from '../../render/particles.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { camera } from '../../render/scene.ts';
import { createCameraPullOut } from '../../render/camera-pull-out.ts';
import { showMomentBanner, momentBanner } from '../../ui/moment-banner.ts';
import { playMark } from '../../proto/mark.ts';
import { SEA } from '../../constants.ts';
import { FINALE_ROCKETS, FINALE_SHOT, SHOW_HEAR, towardRing } from './crossing-show.ts';
import {
  WORKS,
  PIER_RACK,
  PIER_FRAME,
  CROSSING_BENTS,
  CROSSING_DECK_Y,
  CROSSING_FOOT_OFF,
} from '../../sim/railway-works-layout.ts';
import { pierLaid } from '../../sim/railway-line2-layout.ts';
import { onlyALoadIn, setDownThen } from './back-down.ts';
import { account, beam, boiler, qjob, trains, works as worksRow, type ReadWorld } from '../../sim/railway-rows.ts';
import { line2Completed, line2Trains } from '../../sim/railway-queries-line2.ts';
import { createBoxBatch, footingFrame, footingParts, FOOTING } from './works-box-view.ts';
import { signBoard } from '../../render/sign-board.ts';
import { Q7 } from '../../sim/railway-line2-layout.ts';

/** The rockets' launch height over the sea, and the pieces' timings in seconds. */
const LAUNCH = SEA + 4;
const RISE_S = 2,
  OUT_SPEED = 28,
  LOWER_S = 2.2;
const TIMBER = '#8a6236',
  IRON = '#3a3d44',
  STAKE = '#e8a33a';

export async function createRailwayCrossing(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: {
    toPier: () => number;
    /** A reward card has the screen: the finale's shot, rockets and banner wait for it (the whistle doesn't). */
    busy: () => boolean;
    seated: () => boolean;
  },
) {
  const [{ H, addStatic }, layout, sounds] = await Promise.all([
    import('../../place/land.ts'),
    import('../../place/layout.ts'),
    import('../../render/fanfare.ts'),
  ]);
  // The finale's shot: every pull-out's rules (plays to the end, the one highlighted Interact skip from 0.8 s; none for
  // reduced motion or a seated player, who still get the rockets).
  const finaleCamera = createCameraPullOut(deps.busy, true, deps.seated);
  owner.cleanup(() => finaleCamera.dispose());
  const line = layout.LINKS[1]!.line;
  const P = { x: 0, z: 0, ux: 0, uz: 1 };
  // The rows, re-read at the head of each entry (update, snap, targets): a refill swaps the world.
  let wd: ReadWorld = adapter.read.world();
  let opened = false,
    /** Q7 is under way or laid: the footway's board stands. */
    started = false;
  const refresh = () => {
    wd = adapter.read.world();
    opened = adapter.read.ready() && line2Trains(wd) && pierLaid(line2Completed(wd));
    started = opened && (!!qjob(wd, Q7).completion || qjob(wd, Q7).start >= 0);
  };
  refresh();
  const batch = createBoxBatch(owner, 360);
  const m = new THREE.Matrix4(),
    p = new THREE.Vector3();

  // ---------------------------------------------------------------- the crossing's line: bents, sockets, stakes
  const first = CROSSING_BENTS[0]!,
    last = CROSSING_BENTS.at(-1)!;
  const along = { x: last.x - first.x, z: last.z - first.z };
  const len = Math.hypot(along.x, along.z);
  along.x /= len;
  along.z /= len;
  const across = { x: along.z, z: -along.x };
  const bentYaw = Math.atan2(along.x, along.z);
  // Each bent's deck top on the 4% bow (CROSSING_DECK_Y), 7.6 m wide for the double track (world-blockout ruling 11).
  const bents = CROSSING_BENTS.map((b, i) => ({ x: b.x / 100, z: b.z / 100, deck: CROSSING_DECK_Y[i]! / 100 }));
  const off = CROSSING_FOOT_OFF / 100;
  const sockets = bents.flatMap((b) =>
    [-1, 1].map((side) => {
      const x = b.x + across.x * side * off,
        z = b.z + across.z * side * off;
      return { x, z, y: H(x, z) };
    }),
  );

  // ---------------------------------------------------------------- the pier rack, on the Pier halt's deck
  // The halt's deck is 2.5 m wide (lat +1.65 to +4.15 m, east of the down track from Q6: call 53); PIER_RACK stands 3.5
  // m off the rails, so a single row of footings along its seaward edge (lat +2.9 to +4.1 m) leaves the track side clear
  // to walk and board.
  const rack = { x: PIER_RACK.x / 100, z: PIER_RACK.z / 100 };
  layout.lineAt(line, 733, P);
  const rackYaw = Math.atan2(P.ux, P.uz);
  const rackY = layout.railY(line, 733) + 0.72; // the halt deck's top (halts-view's `low`)
  const rackAxis = { x: Math.sin(rackYaw), z: Math.cos(rackYaw) };
  const RACK_PITCH = 1.3,
    BEARER = 0.16;
  /** Rack slot k's base centre: six in a row along the deck, landward first, then a second layer. */
  const rackSlot = (k: number, out: THREE.Vector3) => {
    const v = (k % 6) - 2.5;
    return out.set(
      rack.x + rackAxis.x * v * RACK_PITCH,
      rackY + BEARER + Math.floor(k / 6) * (FOOTING.h + 0.1),
      rack.z + rackAxis.z * v * RACK_PITCH,
    );
  };
  /** The rack, as Line 2's depot racks are built: two bearers, a chock between slots and a post at each corner. */
  const rackParts = (() => {
    const out: [number, number, number, number, number, number, string][] = [];
    const half = 3 * RACK_PITCH + 0.15;
    for (const side of [-0.42, 0.42]) {
      out.push([side, BEARER / 2, 0, 0.18, BEARER, half * 2, '#8a6236']);
      for (const end of [-half, half]) out.push([side * 1.2, 0.65, end, 0.14, 1.3, 0.14, '#7f5630']);
    }
    for (let k = 0; k <= 6; k++) out.push([0, BEARER + 0.04, (k - 3) * RACK_PITCH, 1.1, 0.08, 0.1, '#7f5630']);
    return out;
  })();

  // ---------------------------------------------------------------- the pier head's pad, Q7's piled deck and the jib
  // The Pier platform stands east of the trestle from Q6 (s 719-741, lat +1.65 to +4.15, 0.68 m over the trestle's
  // deck). Past its north end the pad (s 741-746, lat +1.8 to +5.3, at the trestle's deck height) carries the jib
  // (PIER_FRAME, 3.5 m east of the rails' end); a drop going out, a plain jump coming back. South of the platform's
  // ramp (s 713-719) a piled deck (s 703-713, lat +1.8 to +6.0) carries Q7's frame, its depot rack and shelf.
  type Deck = { s: number; lat: number; hx: number; hz: number; legs: readonly (readonly [number, number])[] };
  const DECKS: Deck[] = [
    // The pad: legs at its seaward corners.
    {
      s: 743.5,
      lat: 3.55,
      hx: 1.75,
      hz: 2.5,
      legs: [
        [1.4, -2],
        [1.4, 2],
      ],
    },
    // Q7's deck: legs along its seaward edge and its south-west corner.
    {
      s: 708,
      lat: 3.9,
      hx: 2.1,
      hz: 5,
      legs: [
        [1.8, -4.5],
        [1.8, 0],
        [1.8, 4.5],
        [-1.5, -4.5],
      ],
    },
  ];
  const decks = DECKS.map((d) => {
    layout.lineAt(line, d.s, P);
    return {
      ...d,
      yaw: Math.atan2(P.ux, P.uz),
      x: P.x - P.uz * d.lat + layout.ORIGIN.x,
      z: P.z + P.ux * d.lat + layout.ORIGIN.z,
      y: layout.railY(line, d.s) + 0.04,
      body: null as ReturnType<typeof addStatic> | null,
    };
  });
  // The jib's pad is the first.
  const deckY = decks[0]!.y;
  const solidDecks = (on: boolean) => {
    for (const d of decks)
      if (on && !d.body)
        d.body = addStatic(
          { kind: 'box', hx: d.hx, hy: 0.1, hz: d.hz },
          { x: d.x, y: d.y - 0.1, z: d.z },
          new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, d.yaw),
          undefined,
          owner,
        );
      else if (!on && d.body) {
        owner.removeBody(d.body);
        d.body = null;
      }
  };
  // The finger board on a post at the pad's north-east corner, pointing out along Q7's footway: "Railhead" (the plan's
  // placeholder word), with an arrow. It stands once Q7 is started, with the footway it points along.
  const finger = signBoard(owner, { w: 1.5, h: 0.5, px: 384, foot: 1.6, posts: 'one' });
  {
    const { g, cw, ch } = finger;
    g.fillStyle = '#fff3d6';
    g.fillRect(0, 0, cw, ch);
    g.strokeStyle = '#2a1c10';
    g.lineWidth = ch * 0.05;
    g.strokeRect(ch * 0.05, ch * 0.05, cw - ch * 0.1, ch - ch * 0.1);
    g.fillStyle = '#2a1c10';
    g.font = `900 ${ch * 0.5}px Figtree, system-ui, sans-serif`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('Railhead', cw * 0.06, ch / 2, cw * 0.64);
    g.beginPath();
    g.moveTo(cw * 0.76, ch * 0.3);
    g.lineTo(cw * 0.9, ch * 0.5);
    g.lineTo(cw * 0.76, ch * 0.7);
    g.closePath();
    g.fill();
    finger.painted();
    layout.lineAt(line, 745.4, P);
    // Its face looks west, onto the pad, so the arrow (right of the face) points out along the line.
    finger.mesh.position.set(P.x - P.uz * 5.0 + layout.ORIGIN.x, decks[0]!.y, P.z + P.ux * 5.0 + layout.ORIGIN.z);
    finger.mesh.rotation.y = Math.atan2(P.uz, -P.ux);
    finger.mesh.visible = false;
  }
  const frame = { x: PIER_FRAME.x / 100, z: PIER_FRAME.z / 100 };
  const jibYaw = Math.atan2(first.x / 100 - frame.x, first.z / 100 - frame.z);
  const jibHead = new THREE.Vector3(frame.x + Math.sin(jibYaw) * 3.2, deckY + 4.6, frame.z + Math.cos(jibYaw) * 3.2);

  // ---------------------------------------------------------------- live pieces
  type Lowering = { slot: number; from: THREE.Vector3; t: number };
  const lowering: Lowering[] = [];
  /** Per bent: seconds since it started rising (≥ RISE_S once stood), or −1 for not yet. */
  const rise = bents.map(() => -1);
  type Rocket = {
    t: number;
    x: number;
    y: number;
    z: number;
    height: number;
    /** Metres it leans out toward Ring Island by its burst. */
    dx: number;
    dz: number;
    colour: THREE.Color;
  };
  let shownCrossing = -1,
    show = -1,
    /** Finales played on this page (a restore never plays one). */
    shows = 0,
    /** Seconds into the finale's shot and rockets, once a reward card has let them start; −1 for none. */
    finale = -1,
    /** The twelfth footing's whistle has played and the shot is waiting for the screen. */
    finaleWaiting = false,
    rockets: Rocket[] = [];
  // Far Head's four shell colours.
  const colours = ['#ffcc63', '#39e6c6', '#ff7272', '#b9a0ff'].map((c) => new THREE.Color(c));
  const trail = new THREE.Color('#ffe9b0');
  const ring = towardRing();

  const open = () => opened;
  /** Footings standing in the sea now: set ones minus those still on their way down. */
  const inSea = () => Math.max(0, worksRow(wd).pierSet - lowering.length);
  const lowerTime = (l: Lowering) => {
    const s = sockets[l.slot]!;
    return Math.hypot(s.x - jibHead.x, s.z - jibHead.z) / OUT_SPEED;
  };
  const avatarBack = (pid: string, out: THREE.Vector3) => {
    const a =
      pid === adapter.read.pid ? me.avatar : [...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar;
    if (!a) return false;
    out.copy(a.position);
    out.y += 1.3;
    return true;
  };

  function snap() {
    refresh();
    lowering.length = 0;
    const pairs = Math.floor(worksRow(wd).pierSet / 2);
    rise.forEach((_, b) => (rise[b] = b < pairs ? RISE_S : -1));
    shownCrossing = worksRow(wd).crossing;
    show = -1;
    finale = -1;
    finaleWaiting = false;
    rockets = [];
    finaleCamera.reset();
    solidDecks(open());
  }
  snap();

  function drawBent(b: number) {
    const t = rise[b]!;
    if (t < 0) return;
    const c = bents[b]!;
    const foot = Math.max(sockets[b * 2]!.y, sockets[b * 2 + 1]!.y) + FOOTING.h;
    const deck = c.deck,
      postH = deck - foot;
    // Four pieces in turn, each sliding up out of the water into place: two posts, the braces, the cap.
    const piece = (k: number) => Math.min(1, Math.max(0, (t - k * 0.4) / 0.6));
    for (const [k, side] of [
      [0, -1],
      [1, 1],
    ] as const) {
      const u = piece(k);
      if (u <= 0) continue;
      const drop = (1 - u * u * (3 - 2 * u)) * postH;
      batch.box(
        c.x + across.x * side * off,
        foot + postH / 2 - drop,
        c.z + across.z * side * off,
        0.75,
        postH,
        0.75,
        TIMBER,
        bentYaw,
      );
    }
    const brace = piece(2);
    if (brace > 0) {
      // An X of braces in the post's top half, where it shows above the water.
      const rise = deck - 0.6 - (SEA - 1),
        span = Math.hypot(off * 2, rise);
      for (const lean of [-1, 1])
        batch.box(
          c.x,
          SEA - 1 + rise / 2 - (1 - brace) * postH,
          c.z,
          0.3,
          span,
          0.3,
          '#7a5530',
          bentYaw,
          0,
          lean * Math.atan2(off * 2, rise),
        );
    }
    const cap = piece(3);
    if (cap > 0) batch.box(c.x, deck - 0.4 + (1 - cap) * 3, c.z, off * 2 + 1.8, 0.8, 1, '#5b4a3a', bentYaw);
  }
  function draw() {
    batch.begin();
    if (open()) {
      // Sockets: an iron collar on the sea floor; a stake at each bent, its top painted to read from the pier.
      sockets.forEach((s, k) => {
        for (const [dx, dz, w, d] of [
          [0, 0.8, 1.7, 0.2],
          [0, -0.8, 1.7, 0.2],
          [0.8, 0, 0.2, 1.4],
          [-0.8, 0, 0.2, 1.4],
        ] as const)
          batch.box(
            s.x + across.x * dx + along.x * dz,
            s.y + 0.15,
            s.z + across.z * dx + along.z * dz,
            w,
            0.3,
            d,
            IRON,
            bentYaw,
          );
        if (k < inSea()) footingParts(batch, footingFrame(m, s.x, s.y, s.z, bentYaw));
      });
      for (const b of bents) {
        const ground = H(b.x, b.z);
        batch.box(b.x, (ground + SEA + 1.8) / 2, b.z, 0.25, SEA + 1.8 - ground, 0.25, TIMBER);
        batch.box(b.x, SEA + 1.55, b.z, 0.3, 0.5, 0.3, STAKE);
      }
      bents.forEach((_, b) => drawBent(b));
      // The pier rack stands once the kiln has cast its first footing (there is something to bring), then its stack
      // (less what is still hopping off the wagon).
      if (worksRow(wd).poured > 0) {
        footingFrame(m, rack.x, rackY, rack.z, rackYaw);
        for (const r of rackParts) batch.part(m, ...r);
      }
      const resting = Math.max(0, worksRow(wd).pierRack - deps.toPier());
      for (let k = 0; k < Math.min(resting, WORKS.pier); k++) {
        rackSlot(k, p);
        footingParts(batch, footingFrame(m, p.x, p.y, p.z, rackYaw));
      }
      // The pad's and Q7's deck's planks, and their legs down to the sea floor.
      for (const d of decks) {
        batch.box(d.x, d.y - 0.1, d.z, d.hx * 2, 0.2, d.hz * 2, '#a97a45', d.yaw);
        for (const [dl, ds] of d.legs) {
          const lx = d.x + Math.cos(d.yaw) * dl + Math.sin(d.yaw) * ds,
            lz = d.z - Math.sin(d.yaw) * dl + Math.cos(d.yaw) * ds,
            foot = H(lx, lz);
          batch.box(lx, (foot + d.y - 0.2) / 2, lz, 0.4, d.y - 0.2 - foot, 0.4, TIMBER);
        }
      }
      // The jib: a mast on the pier head and an arm reaching out over the sea toward the crossing.
      const mastH = jibHead.y - deckY;
      batch.box(frame.x, deckY + mastH / 2, frame.z, 0.35, mastH, 0.35, IRON);
      batch.box(frame.x, deckY + 0.15, frame.z, 1.6, 0.3, 1.6, IRON);
      batch.box((frame.x + jibHead.x) / 2, jibHead.y, (frame.z + jibHead.z) / 2, 0.25, 0.25, 3.4, STAKE, jibYaw);
    }
    for (const l of lowering) drawLowering(l);
    batch.commit();
  }
  /** Off the setter's back up to the jib's hook, out over the stakes at hook height, then down on the rope. */
  function drawLowering(l: Lowering) {
    const s = sockets[l.slot]!;
    const hook = new THREE.Vector3();
    const up = 0.6,
      out = lowerTime(l);
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
    footingParts(batch, footingFrame(m, fx, fy, fz, bentYaw));
    if (l.t >= up) {
      const rope = hook.y - (fy + FOOTING.h);
      if (rope > 0.05) batch.box(hook.x, fy + FOOTING.h + rope / 2, hook.z, 0.06, rope, 0.06, '#d8cfa8');
      batch.box(hook.x, hook.y, hook.z, 0.5, 0.3, 0.5, IRON);
      // The hook runs out on a line paid off the jib's head, so it never travels unsupported.
      const dx = hook.x - jibHead.x,
        dz = hook.z - jibHead.z,
        run = Math.hypot(dx, dz);
      if (run > 0.3)
        batch.box(
          (hook.x + jibHead.x) / 2,
          jibHead.y,
          (hook.z + jibHead.z) / 2,
          0.08,
          0.08,
          run,
          '#d8cfa8',
          Math.atan2(dx, dz),
        );
    }
  }
  function stepLowering(dt: number) {
    for (let i = lowering.length - 1; i >= 0; i--) {
      const l = lowering[i]!;
      const before = l.t;
      l.t += dt;
      const s = sockets[l.slot]!;
      const down = 0.6 + lowerTime(l);
      if (before < down + LOWER_S * 0.55 && l.t >= down + LOWER_S * 0.55) {
        // Through the surface.
        splash(s.x, s.z, 0.6, SEA);
      }
      if (l.t < down + LOWER_S) continue;
      lowering.splice(i, 1);
      thump(s.x, s.z);
      const pair = Math.floor(l.slot / 2);
      if (inSea() >= pair * 2 + 2 && rise[pair]! < 0) {
        rise[pair] = 0;
        clank(bents[pair]!.x, bents[pair]!.z);
      }
    }
  }
  /** The finale proper, once no reward card has the screen: the shot, the fanfare, the banner and the rockets. */
  function startFinale() {
    finaleWaiting = false;
    finale = 0;
    const { from, to, at, seconds } = FINALE_SHOT;
    finaleCamera.play(
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(to.x, to.y, to.z),
      new THREE.Vector3(at.x, at.y, at.z),
      seconds,
    );
    sounds.fanfare(true);
    // UI copy, not The Boogler's: flagged for the owner in docs/agent-calls.md.
    showMomentBanner('Next stop: Ring Island', 'The crossing has begun', 4.5);
    const R = FINALE_ROCKETS,
      b = bents.at(-1)!;
    for (let k = 0; k < R.count; k++) {
      const out = R.beyond[0] + Math.random() * (R.beyond[1] - R.beyond[0]),
        side = (Math.random() - 0.5) * R.side,
        lean = R.lean * (0.7 + Math.random() * 0.6);
      rockets.push({
        t: -(R.first + k * R.gap),
        x: b.x + ring.x * out - ring.z * side,
        y: LAUNCH,
        z: b.z + ring.z * out + ring.x * side,
        height: R.height[0] + Math.random() * (R.height[1] - R.height[0]),
        dx: ring.x * lean,
        dz: ring.z * lean,
        colour: colours[Math.floor(Math.random() * colours.length)]!,
      });
    }
    // For the playtest data: that it played, whether the bursts' height over the far end was on screen as it began,
    // and whether this page took the shot (reduced motion and a seated player don't).
    const burst = new THREE.Vector3(b.x, LAUNCH + 30, b.z);
    const metres = Math.round(camera.position.distanceTo(burst));
    burst.project(camera);
    const onScreen = burst.z < 1 && Math.abs(burst.x) <= 1 && Math.abs(burst.y) <= 1;
    playMark('crossing finale', { authority: 'local', metres, onScreen, shot: finaleCamera.active() });
  }
  function stepShow(dt: number) {
    if (show >= 0) {
      const lastBent = rise.at(-1)!;
      // The show waits for the last bent to stand (or 10 s, whichever is first).
      if (show < 100 && (lastBent >= RISE_S || show > 10)) {
        const b = bents.at(-1)!;
        // Heard from the pier head, 121 m away (./crossing-show.ts): the machine sounds' 45 m range was silent there.
        // The whistle never waits for a reward card; the rest does, as at Far Head.
        whistle(b.x, b.z, SHOW_HEAR);
        show = 100;
        shows++;
        finaleWaiting = true;
      } else if (show < 100) show += dt;
    }
    if (finaleWaiting && !deps.busy()) startFinale();
    if (finale >= 0) {
      finale += dt;
      if (finale > FINALE_SHOT.seconds && rockets.length === 0) finale = -1;
    }
    for (let k = rockets.length - 1; k >= 0; k--) {
      const r = rockets[k]!;
      r.t += dt;
      if (r.t < 0) continue;
      const u = r.t / 0.9;
      if (u >= 1) {
        // Far Head's burst, at size 2.6.
        const size = FINALE_ROCKETS.size;
        for (let n = 0; n < Math.round(44 + size * 8); n++) {
          const a = Math.random() * Math.PI * 2,
            v = Math.random() * 2 - 1,
            radius = Math.sqrt(1 - v * v),
            speed = (10 + Math.random() * 3) * size;
          emit({
            x: r.x + r.dx,
            y: r.y + r.height,
            z: r.z + r.dz,
            vx: Math.cos(a) * radius * speed,
            vy: v * speed,
            vz: Math.sin(a) * radius * speed,
            life: 1.5 + Math.random() * 0.5,
            size: 0.55 * size,
            color: r.colour,
            intensity: readableIntensity(),
            gravity: 7,
            drag: 1.4,
            shrink: 0.4,
          });
        }
        rockets.splice(k, 1);
      } else
        emit({
          x: r.x + r.dx * u * u,
          y: r.y + r.height * (1 - (1 - u) ** 2),
          z: r.z + r.dz * u * u,
          vx: 0,
          vy: -1,
          vz: 0,
          life: 0.5,
          size: 0.35 * FINALE_ROCKETS.size,
          color: trail,
          intensity: readableIntensity(),
          shrink: 0.5,
        });
    }
  }

  return {
    restore: snap,
    /** Where a footing hopping off the wagon lands: the pier rack's slot k. */
    rackSlot,
    update(dt: number) {
      refresh();
      solidDecks(open());
      finger.mesh.visible = started;
      stepLowering(dt);
      // A bent whose pair arrived without a lowering here (a correction, a late accept) still rises.
      const pairs = Math.floor(inSea() / 2);
      rise.forEach((t, b) => {
        if (t >= 0) rise[b] = t + dt;
        else if (b < pairs) rise[b] = 0;
      });
      if (pairs < rise.filter((t) => t >= 0).length) rise.forEach((_, b) => b >= pairs && (rise[b] = -1));
      if (worksRow(wd).crossing >= 0 && shownCrossing < 0) show = 0;
      shownCrossing = worksRow(wd).crossing;
      stepShow(dt);
      finaleCamera.update(dt);
      draw();
    },
    accepted(e: RailwayAccepted) {
      // A published world is never written (M12), so the one held from the last update is from before this packet.
      wd = adapter.read.world();
      if (e.op === 'rail.footSet' && e.site === 2) {
        const from = new THREE.Vector3();
        if (!avatarBack(e.pid, from)) from.copy(jibHead);
        lowering.push({ slot: Math.max(0, worksRow(wd).pierSet - 1), from, t: 0 });
        clank(frame.x, frame.z);
      }
      if (e.op === 'rail.footTake' && e.rack === 1) {
        rackSlot(Math.max(0, worksRow(wd).pierRack), p);
        placeSound('shoulder', p.x, p.z);
        dustRing(p.x, p.y + 0.1, p.z, 6, 1, 0.2);
      }
    },
    corrected(c: RailwayCorrection) {
      if (c.event.op === 'rail.footSet' && c.event.site === 2) lowering.length = 0;
    },
    targets(): Interactable[] {
      const pos = me.body?.position;
      refresh();
      if (!open() || !pos) return [];
      const pid = adapter.read.pid,
        w = worksRow(wd),
        mine = account(wd, pid),
        out: Interactable[] = [];
      const backFree = !mine?.carry && !mine?.stone && !mine?.rails && !mine?.foot;
      const free = backFree && beam(wd).holder !== pid && boiler(wd).holder !== pid;
      if (
        w.pierRack > 0 &&
        Math.hypot(pos.x - rack.x, pos.z - rack.z) <= PIER_RACK.reach / 100 - 0.4 &&
        Math.abs(pos.y - PIER_RACK.y / 100) <= 2.6
      ) {
        const top = rackSlot(Math.max(0, w.pierRack - 1), new THREE.Vector3()).add(new THREE.Vector3(0, 1.6, 0));
        out.push(
          free
            ? {
                id: 'railway-foot-take-1',
                verb: 'Shoulder a footing',
                at: top,
                run: () => void adapter.shoulderFooting(1),
              }
            : onlyALoadIn(wd, pid, false)
              ? {
                  id: 'railway-foot-take-1',
                  verb: 'Shoulder a footing',
                  at: top,
                  run: () => void setDownThen(adapter, () => adapter.shoulderFooting(1), rack),
                }
              : { id: 'railway-foot-take-1', verb: 'Shoulder a footing', at: top, blocked: 'Empty your back first' },
        );
      }
      const aboard = trains(wd).reduce((n, r) => n + r.foot, 0); // on the wagon, whichever train has it
      if (
        mine?.foot &&
        w.pierSet + w.pierRack + aboard < WORKS.pier &&
        Math.hypot(pos.x - frame.x, pos.z - frame.z) <= PIER_FRAME.reach / 100 - 0.4 &&
        Math.abs(pos.y - PIER_FRAME.y / 100) <= 2.6
      )
        out.push({
          id: 'railway-foot-set-2',
          verb: 'Set the footing',
          at: new THREE.Vector3(frame.x, deckY + 1.8, frame.z),
          run: () => void adapter.setFooting(2),
        });
      return out;
    },
    inspect: () => ({
      crossingView: {
        sockets: sockets.length,
        inSea: inSea(),
        lowering: lowering.length,
        bents: rise.filter((t) => t >= RISE_S).length,
        rising: rise.filter((t) => t >= 0 && t < RISE_S).length,
        pierRack: Math.max(0, worksRow(wd).pierRack - deps.toPier()),
        show: show >= 0,
        shows,
        rockets: rockets.length,
        finale: { seconds: finale, waiting: finaleWaiting, shot: finaleCamera.inspect(), banner: momentBanner() },
      },
    }),
  };
}
