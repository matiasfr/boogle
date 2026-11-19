// The halt yards' bays at the Camp, the Quarry and Far Head (docs/plans/halt-yard.md, step 2): a low timber bay
// beside the foot of each halt's back ramp, with a log cradle, a rails shelf and a stone bin. It stands, solid where it
// looks solid, once its yard opens (`haltYardOpen`): it drops in with the halt kit's drop-set when it opens near you,
// and is simply there when you load a world where it is open. Each bin offers Pick up or Leave it here (owner
// question 2) and sends the real `rail.haltTake` or `rail.haltPut`. What a bin holds, its flights and the Village's
// shelf are step 3's; the Village yard is the recovery rack (./sources.ts). Local view over accepted rows. The bay's
// pieces and its collider record are one table (haltYardBay, src/content/prefabs/halts.ts).
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { me } from '../../player/player.ts';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { PLAYER_R } from '../../constants.ts';
import { thump } from '../../render/machine-sfx.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { HALT_YARDS, HALT_YARD_REACH, type HaltYardId } from '../../sim/railway-yard-layout.ts';
import { haltYardOpen, haltYardStock } from '../../sim/railway-queries-yard.ts';
import { balanceOf, railAccount, roomOf, LOGS, STONE } from '../../sim/railway-queries.ts';
import { RAILS } from '../../sim/railway-line2-layout.ts';
import { bayBin, bayKey, haltYardBay, type BayHand } from '../../content/prefabs/halts.ts';
import { inReach } from './tools.ts';

type Box = import('../../render/boxes.ts').Box;
type Kind = 0 | 1 | 2;
/** Each drawn yard's row in `HALTS` (src/place/layout.ts). */
const HALT_ROW: Partial<Record<HaltYardId, number>> = { camp: 1, quarry: 3, farhead: 4 };
const KINDS = [LOGS, STONE, RAILS] as Kind[];
// A full kind refuses only that kind: the words a pile and the rack already use (./sources.ts). Draft UI copy.
const KIND_FULL = ['Logs full', 'Stone full', 'Rails full'];
const NOUN = ['logs', 'stone', 'rails'];
/** m: a resting contact is not an overlap (src/place/site-clearance.ts). */
const CONTACT = 0.02;
/** m: a bin's prompt stands this far inside the server's reach of the bay's centre, for the press's travel. */
const REACH_SLACK = 0.3;
/** m: a yard that opens nearer than this drops in; farther off it is simply there when you come. */
const SEEN = 80;

export async function createHaltYards(adapter: RailwayAdapter, owner: OwnedView) {
  const [{ H }, { box, place }, { dropSet, dustRing }, { haltFrame }, { siteExit }, { outOf }] = await Promise.all([
    import('../../place/terrain.ts'),
    import('../../render/boxes.ts'),
    import('../../place/pieces.ts'),
    import('../../prefab/halt-deck.ts'),
    import('../../place/site-clearance.ts'),
    import('../../place/sites.ts'),
  ]);
  const boxes: Box[] = [];
  const bays = HALT_YARDS.flatMap((spec, k) => {
    const row = HALT_ROW[spec.id];
    if (row === undefined) return [];
    const x = spec.x / 100,
      z = spec.z / 100,
      y = H(x, z);
    // The bay's +x faces the platform (its open side) and +z runs along the line (the halt's heading, or against it).
    const frame = haltFrame(row, false),
      c = frame.c;
    const facing = (c.x - x) * Math.cos(frame.yaw) - (c.z - z) * Math.sin(frame.yaw) >= 0;
    const yaw = frame.yaw + (facing ? 0 : Math.PI);
    const cos = Math.cos(yaw),
      sin = Math.sin(yaw),
      along = { x: sin, z: cos };
    // The cradle at the end nearer the back ramp, which leaves the platform's middle.
    const hand: BayHand = (c.x - x) * along.x + (c.z - z) * along.z >= 0 ? 1 : -1;
    // The table is in centimetres; the view works in metres.
    const parts = haltYardBay(hand).map(
      ([lx, ly, lz, w, h, d, colour]) => [lx / 100, ly / 100, lz / 100, w / 100, h / 100, d / 100, colour] as const,
    );
    const hulls = parts.map(([dx, dy, dz, w, h, d]) => ({ dx, dy, dz, hx: w / 2, hy: h / 2, hz: d / 2 }));
    const k0 = boxes.length;
    for (const [lx, ly, lz, w, h, d, colour] of parts) {
      const b = box(x, z, place(lx, ly - h / 2, lz, w, h, d, yaw), colour);
      b.y = y;
      boxes.push(b);
    }
    const key = bayKey(hand);
    const solid = instantiate(
      key,
      { id: `halt-yard-${spec.id}`, prefab: key, pos: [x, y, z], rot: [yaw, 0, 0] },
      { owner },
    );
    solid.setEnabled(false);
    return [
      {
        k,
        x,
        y,
        z,
        k0,
        k1: boxes.length,
        solid,
        hulls,
        // The footprint is the floor's, the table's first box.
        foot: { x, z, c: cos, s: sin, hw: hulls[0]!.hx, hd: hulls[0]!.hz },
        at: KINDS.map((kind) => {
          const s = bayBin(hand, kind) / 100;
          return new THREE.Vector3(x + along.x * s, y + 1.1, z + along.z * s);
        }),
        shown: false,
      },
    ];
  });
  type Bay = (typeof bays)[number];
  let landed = 0;
  const set = dropSet(
    boxes,
    (k) => {
      const b = boxes[k]!;
      if (landed++ % 3 === 0) thump(b.x, b.z);
      if (landed % 4 === 0) dustRing(b.x, b.y + 0.2, b.z, 4, 1.4, 0.2);
    },
    owner,
  );
  boxes.forEach((_, k) => set.snap(k, false));

  /** Before the solids come in, a player standing in them is moved clear by the shared clearance; one resting against
   * them or on the ground they touch stays put. */
  function standUp(bay: Bay, on: boolean) {
    const b = me.body;
    if (on && b) {
      const exit = siteExit(b.position, bay.foot, bay.y, bay.hulls, outOf, undefined, CONTACT);
      if (exit) {
        const top = H(exit.x, exit.z) + PLAYER_R + 0.2;
        b.position.set(exit.x, top, exit.z);
        b.interpolatedPosition.set(exit.x, top, exit.z);
        b.velocity.set(0, 0, 0);
      }
    }
    bay.solid.setEnabled(on);
  }
  // The first state seen is the world as you came to it: what is open there stands built, with no show.
  let seen = false;
  owner.animate(({ dt }) => {
    set.update(dt);
    if (!adapter.read.ready()) return;
    const w = adapter.read.world(),
      p = me.body?.position;
    for (const bay of bays) {
      const open = haltYardOpen(w, bay.k);
      if (open === bay.shown) continue;
      bay.shown = open;
      const show = seen && open && !!p && Math.hypot(p.x - bay.x, p.z - bay.z) < SEEN;
      for (let k = bay.k0; k < bay.k1; k++)
        if (show) set.drop(k, 3.2, (k - bay.k0) * 0.05);
        else set.snap(k, open);
      standUp(bay, open);
    }
    seen = true;
  }, 0);

  /** One target a bin (owner question 2): Pick up when it has stock, you carry none of its kind and have room for it;
   * otherwise Leave it here when you carry anything the yard takes, which puts all of it down in one press. A closed
   * yard has no bay, so it offers nothing. */
  function targets(): Interactable[] {
    if (!adapter.read.ready() || !me.body) return NO_TARGETS;
    const p = me.body.interpolatedPosition;
    const near = bays.filter(
      (bay) => bay.shown && Math.hypot(p.x - bay.x, p.z - bay.z) <= HALT_YARD_REACH / 100 - REACH_SLACK,
    );
    if (!near.length) return NO_TARGETS;
    const w = adapter.read.world(),
      account = railAccount(w, adapter.read.pid);
    const mine = KINDS.map((kind) => (account ? balanceOf(account, kind) : 0));
    const carried = KINDS.filter((kind) => mine[kind]! > 0);
    let out: Interactable[] | null = null;
    for (const bay of near)
      for (const kind of KINDS) {
        const at = bay.at[kind]!;
        if (!inReach(at)) continue;
        const stock = haltYardStock(w, bay.k, kind);
        const id = `halt-yard-${bay.k}-${kind}`;
        // A Pick up names what the bin holds, as a pile's does; Leave it here needs no count.
        const note = `${stock} ${NOUN[kind]}`;
        let target: Interactable;
        if (stock > 0 && mine[kind] === 0 && account && roomOf(w, account, kind) > 0)
          target = { id, at, note, verb: 'Pick up', run: () => void adapter.haltTake(bay.k, kind) };
        else if (carried.length)
          target = {
            id,
            at,
            verb: 'Leave it here', // draft, for the owner (docs/plans/halt-yard.md, question 3)
            run: () => {
              for (const c of carried) adapter.haltPut(bay.k, c);
            },
          };
        else if (stock > 0) target = { id, at, note, verb: 'Pick up', blocked: KIND_FULL[kind]! };
        else continue;
        (out ??= []).push(target);
      }
    return out ?? NO_TARGETS;
  }

  return {
    targets,
    inspect: () => ({ haltYards: bays.map((b) => ({ k: b.k, shown: b.shown, solid: b.solid.bodies.length })) }),
  };
}
