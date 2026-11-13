// Ring Island's steel works, the greybox (docs/plans/ring-island-build2.md, V1; design review rulings B and E): the
// kit's two stacks in the yard, the open shed over build 1's drop hammer with its bill under the roof's front edge, the
// works' rack under a box jib beside the east platform, and the three prompts (Take logs, Take rails, Feed the works).
// A Local view of accepted state, mounted by the railway's works seam (railway/works-live.ts) beside the Meet, because
// the prompts send through the adapter that only that view holds. It reads the Steel, Aperture and Account rows through
// `adapter.read.world()`, re-read at the head of every entry point (update, targets, restore, inspect); nothing is kept
// from a world. The works lights when the server says so (the prediction holds `lit` back, railway-predict.ts), so the
// sign and the rack follow the rows and nothing here guesses. Grey boxes, placeholder labels, no effects and no sound
// (owner-calls, "mechanisms, systems, greybox, details"). Build 1's tarp stack, anvil and hammer are ring-island/view.ts's.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { paintTwoLines, signBoard } from '../../render/sign-board.ts';
import { RING_STEEL_WORKS, RING_STEEL_YARD, STEEL, ringAt } from '../../sim/railway-ring-layout.ts';
import { account, aperture, steel } from '../../sim/railway-rows.ts';
import { free, heldBig } from '../../sim/railway-queries.ts';
import { createBoxBatch, drawWorksBoxes } from '../railway/works-box-view.ts';
import type { WorksBox } from '../railway/works-shape.ts';
import { ringIslandNear } from '../ring-island/state.ts';

// Placeholder labels (docs/agent-calls.md, ruling E; none is The Boogler's).
const TAKE_LOGS = 'Take logs',
  TAKE_RAILS = 'Take rails',
  FEED = 'Feed the works',
  BRING_LOGS = 'Bring logs',
  BRING_RAILS = 'Bring rails',
  BRING_BOTH = 'Bring logs or rails',
  BACK_FULL = 'Your back is full',
  HANDS_FULL = 'Hands full',
  SIGN_TITLE = 'STEEL WORKS';
const BILL_LOOK = { ground: '#fff3d6', ink: '#2a1c10', rim: '#2a1c10' };
const GREY = '#9c9ea1',
  GREY_DARK = '#6f7275',
  GREY_LIGHT = '#b4b6b8',
  LOG = '#9a8f80',
  RAIL = '#45474b',
  STEEL_BLOCK = '#e8742c'; // the island's steel (ring-island/view.ts)

/** The yard deck's top, level with the east platform (m). */
const Y = RING_STEEL_WORKS.y / 100;
/** World (x, z) metres of (u, lat) metres along the island's line. */
const at = (u: number, lat: number) => {
  const p = ringAt(Math.round(u * 100), Math.round(lat * 100));
  return { x: p.x / 100, z: p.z / 100 };
};
const O = at(0, 0),
  U = at(100, 0),
  L = at(0, 100);
/** A box's yaw with its depth along u, and a sign's with its face toward the platform (-lat). */
const YAW = Math.atan2(U.x - O.x, U.z - O.z),
  FACE_PLATFORM = Math.atan2(O.x - L.x, O.z - L.z);
/** An upright box over (u0..u1, l0..l1) metres, from y0 to y1 above the deck. */
function span(
  u0: number,
  u1: number,
  l0: number,
  l1: number,
  y0: number,
  y1: number,
  colour: `#${string}`,
  solid = true,
): WorksBox {
  return {
    ...at((u0 + u1) / 2, (l0 + l1) / 2),
    y: Y + (y0 + y1) / 2,
    w: l1 - l0,
    h: y1 - y0,
    d: u1 - u0,
    yaw: YAW,
    colour,
    solid,
  };
}

// The shed (level finding 4 and flag 3): inside u 448 to 455, lat 6.5 to 14, its door wall 1.2 m off the platform's
// edge, the doorway at the works point (u 452), the roof over the hammer's 6.5 m gantry. Three sides are open.
const SHED = { u0: 448, u1: 455, l0: 6.5, l1: 14, roof: 6.9, wall: 3.6, door: [450.8, 453.2], doorH: 2.6 } as const;
// The loader (rail-map: u 436.9 to 444.3, east of the platform's south half) and the works' rack under it.
const JIB = { u0: 436.9, u1: 444.3, lat: 6.6, y: 4.6 } as const;
const RACK = { u0: 438.6, lat: 6.3, step: 0.64 } as const;
// The kit's two stacks, either side of the yard point (u 445.5, lat 8), on the open deck past the tarp's end.
const LOGS_AT = { u: 444.75, lat: 8.3 },
  RAILS_AT = { u: 446.6, lat: 8.3 };

const STATIC: WorksBox[] = [
  // the shed: four posts, the roof, the door wall either side of the doorway and its lintel
  ...[SHED.u0, SHED.u1 - 0.3].flatMap((u) =>
    [SHED.l0, SHED.l1 - 0.3].map((l) => span(u, u + 0.3, l, l + 0.3, 0, SHED.roof, GREY_DARK)),
  ),
  span(SHED.u0 - 0.2, SHED.u1 + 0.2, SHED.l0 - 0.2, SHED.l1 + 0.2, SHED.roof, SHED.roof + 0.2, GREY),
  span(SHED.u0 + 0.3, SHED.door[0], SHED.l0, SHED.l0 + 0.2, 0, SHED.wall, GREY_LIGHT),
  span(SHED.door[1], SHED.u1 - 0.3, SHED.l0, SHED.l0 + 0.2, 0, SHED.wall, GREY_LIGHT),
  span(SHED.door[0], SHED.door[1], SHED.l0, SHED.l0 + 0.2, SHED.doorH, SHED.wall, GREY_LIGHT),
  // the loader: a mast and a post, the beam between them, an arm out over the platform and its block
  span(JIB.u1 - 0.8, JIB.u1 - 0.4, JIB.lat - 0.2, JIB.lat + 0.2, 0, JIB.y + 0.4, GREY_DARK),
  span(JIB.u0, JIB.u0 + 0.3, JIB.lat - 0.15, JIB.lat + 0.15, 0, JIB.y, GREY_DARK),
  span(JIB.u0, JIB.u1, JIB.lat - 0.2, JIB.lat + 0.2, JIB.y, JIB.y + 0.4, GREY_DARK, false),
  span(440.4, 440.8, 1.4, JIB.lat - 0.2, JIB.y, JIB.y + 0.3, GREY_DARK, false),
  span(440.45, 440.75, 1.6, 1.9, JIB.y - 0.7, JIB.y, GREY_DARK, false),
  // the rack's bed and the yard's two pallets
  span(RACK.u0, RACK.u0 + 4, RACK.lat - 0.5, RACK.lat + 0.5, 0, 0.25, GREY_DARK, false),
  span(LOGS_AT.u - 0.75, LOGS_AT.u + 0.75, LOGS_AT.lat - 0.9, LOGS_AT.lat + 0.9, 0, 0.12, GREY_DARK, false),
  span(RAILS_AT.u - 0.7, RAILS_AT.u + 0.7, RAILS_AT.lat - 0.9, RAILS_AT.lat + 0.9, 0, 0.12, GREY_DARK, false),
];

const metres = (s: { x: number; y: number; z: number }) => ({ x: s.x / 100, y: s.y / 100, z: s.z / 100 });
const YARD = metres(RING_STEEL_YARD),
  WORKS_AT = metres(RING_STEEL_WORKS);
/** Inside a site's reach, less the 0.4 m the other railway prompts keep off the server's edge, and on its deck. */
const within = (p: { x: number; y: number; z: number }, site: typeof YARD, reach: number) =>
  Math.hypot(p.x - site.x, p.z - site.z) <= reach / 100 - 0.4 && Math.abs(p.y - site.y) <= 2.6;

export async function createRingSteel(adapter: RailwayAdapter, owner: OwnedView) {
  const fixed = await drawWorksBoxes(owner, STATIC);
  const batch = createBoxBatch(owner, STEEL.logs + STEEL.rails + STEEL.rackCap, false);
  // The bill, hung under the roof's front edge over the door wall, facing the platform (ruling E: it stands from the
  // rivet's strike). Its foot is 0.7 m over the top of build 1's RINGWORKS board (u 445.4 to 450.6, lat 5.0), which
  // hid a lintel plaque from the platform's south end (V1's first look).
  const sign = signBoard(owner, { w: 6.4, h: 1.4, px: 768, foot: 5.4, posts: 'none' });
  {
    const p = at((SHED.u0 + SHED.u1) / 2, SHED.l0 - 0.1);
    sign.mesh.position.set(p.x, Y, p.z);
    sign.mesh.rotation.y = FACE_PLATFORM;
  }
  sign.mesh.visible = false;
  let painted = '';

  /** The works' rows once the first whole state is in (`read.whole()`, a latch), or null. */
  function rows() {
    if (!adapter.read.whole()) return null;
    const wd = adapter.read.world();
    return { wd, s: steel(wd), joined: aperture(wd).joined >= 0 };
  }
  function draw() {
    const r = rows(),
      on = ringIslandNear.mounted;
    fixed.visible = on;
    batch.mesh.visible = on && !!r;
    sign.mesh.visible = on && !!r && r.joined;
    if (!r || !on) return;
    const { s } = r;
    if (sign.mesh.visible) {
      const counts =
        s.lit >= 0
          ? `lit  steel ${s.poured}/${STEEL.total}`
          : `logs ${Math.min(s.logs, STEEL.logs)}/${STEEL.logs}  rails ${Math.min(s.rails, STEEL.rails)}/${STEEL.rails}`;
      if (counts !== painted) {
        painted = counts;
        // The heading is the largest line (the greybox route's step 4 review, b: two bills stand either side of the
        // tracks, `STEEL WORKS` east and `LINE TO HIGH GORGE` west, and the headings tell them apart); the counts
        // under it.
        paintTwoLines(sign, SIGN_TITLE, counts, BILL_LOOK);
        sign.painted();
      }
    }
    batch.begin();
    for (let i = 0; i < Math.min(s.yardLogs, STEEL.logs); i++) {
      const p = at(LOGS_AT.u - 0.54 + (i % 4) * 0.36, LOGS_AT.lat);
      batch.box(p.x, Y + 0.28 + Math.floor(i / 4) * 0.34, p.z, 1.6, 0.32, 0.32, LOG, YAW);
    }
    for (let i = 0; i < Math.min(s.yardRails, STEEL.rails); i++) {
      const p = at(RAILS_AT.u - 0.55 + (i % 6) * 0.22, RAILS_AT.lat);
      batch.box(p.x, Y + 0.19 + Math.floor(i / 6) * 0.16, p.z, 1.7, 0.12, 0.12, RAIL, YAW);
    }
    for (let i = 0; i < Math.min(s.rack, STEEL.rackCap); i++) {
      const p = at(RACK.u0 + 0.4 + i * RACK.step, RACK.lat);
      batch.box(p.x, Y + 0.45, p.z, 0.8, 0.4, 0.5, STEEL_BLOCK, YAW);
    }
    batch.commit();
  }
  const v = (u: number, lat: number, up: number) => {
    const p = at(u, lat);
    return new THREE.Vector3(p.x, Y + up, p.z);
  };
  draw();
  return {
    restore: draw,
    update: draw,
    accepted() {},
    /** The yard's two takes while the kit lies there, and the feed until the works lights; none before the rivet. An
     * empty or wrong back meets "Feed the works" blocked with its reason (ruling E), never silence. */
    targets(): Interactable[] {
      const p = me.body?.position,
        r = rows();
      if (!p || !r || !r.joined || !ringIslandNear.mounted || !adapter.read.ready()) return [];
      const { wd, s } = r,
        mine = account(wd, adapter.read.pid),
        out: Interactable[] = [];
      if (within(p, YARD, RING_STEEL_YARD.reach)) {
        const full =
          mine && free(wd, mine) <= 0 ? { blocked: heldBig(wd, mine) ? HANDS_FULL : BACK_FULL } : {};
        if (s.yardLogs > 0)
          out.push({
            id: 'railway-steel-take-logs',
            verb: TAKE_LOGS,
            at: v(LOGS_AT.u, LOGS_AT.lat, 1.3),
            run: () => void adapter.steelTake(0),
            ...full,
          });
        if (s.yardRails > 0)
          out.push({
            id: 'railway-steel-take-rails',
            verb: TAKE_RAILS,
            at: v(RAILS_AT.u, RAILS_AT.lat, 1.3),
            run: () => void adapter.steelTake(1),
            ...full,
          });
      }
      if (s.lit < 0 && within(p, WORKS_AT, RING_STEEL_WORKS.reach)) {
        // The bill still lacks logs, rails, or both; a full bill waits for the server to light the works: no prompt.
        const needLogs = s.logs < STEEL.logs,
          needRails = s.rails < STEEL.rails;
        if (needLogs || needRails) {
          const fills = ((mine?.carry ?? 0) > 0 && needLogs) || ((mine?.rails ?? 0) > 0 && needRails);
          const target = {
            id: 'railway-steel-feed',
            verb: FEED,
            at: v((SHED.door[0] + SHED.door[1]) / 2, SHED.l0, 1.7),
          };
          out.push(
            fills
              ? { ...target, run: () => void adapter.feedSteel() }
              : { ...target, blocked: needLogs && needRails ? BRING_BOTH : needLogs ? BRING_LOGS : BRING_RAILS },
          );
        }
      }
      return out;
    },
    inspect: () => {
      const r = rows();
      return {
        steelView: {
          shown: fixed.visible,
          sign: sign.mesh.visible ? painted : null,
          yard: r ? { logs: r.s.yardLogs, rails: r.s.yardRails } : null,
          bill: r ? { logs: r.s.logs, rails: r.s.rails, lit: r.s.lit >= 0 } : null,
          rack: r ? r.s.rack : 0,
        },
      };
    },
  };
}
