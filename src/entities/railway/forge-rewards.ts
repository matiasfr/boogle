// The forge's rewards are its own products (docs/plans/forge-made-rewards.md; owner, 17 November). When the 24th log
// goes in, the pack frame stands bare on a timber block at its spot and one of the frame's log haulers fetches an offcut from
// the forge frame's foot, carries it over and hammers the pack together; the straps go on with a knock. The scaffold
// pair keep hammering the walls the 32 logs pay for.
// Local presentation over accepted state: the pack is drawn, and offered, from the accepted edge; the errand plays once,
// on a live crossing seen with no prediction pending, never on a reload, a late join or a resync (restore() snaps it
// done), and nothing plays under reduced motion. Created by line2-view.ts beside the forge's finish.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { reducedMotion } from '../../constants.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { emit } from '../../render/particles.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { merged } from '../../render/part-geometry.ts';
import { flat } from '../../render/flat.ts';
import { H } from '../../place/terrain.ts';
import { packParts } from '../../render/gear-models.ts';
import { makeAxeModel } from '../../render/axe-models.ts';
import { LINE2_AXE, LINE2_BOILER, LINE2_FORGE, LINE2_PACK } from '../../sim/railway-line2-layout.ts';
import { LINE1_HARDWOODS } from '../../sim/railway-line-layout.ts';
import { boiler, forge, rail, works, type ReadWorld } from '../../sim/railway-rows.ts';
import { line2PackReady } from '../../sim/railway-queries-line2.ts';

/** The errand's timings, in seconds: the hammering at the pack, a leg that counts as arrived (the walk to the offcut
 * gets longer, as the nearest stroller can start across the yard), the whole errand's cap, and how long the pack takes
 * to finish itself with no little guy within `near` m of the offcut. `packShow`: the pack's scale on its block. */
export const FORGE_REWARDS = {
  hammer: 1.4,
  leg: 6,
  fetchLeg: 10,
  packCap: 16,
  packSelf: 1.5,
  near: 30,
  packShow: 1.5,
  axeShow: 1.4,
  roofHoldMax: 5,
  cool: 3,
} as const;
const HOT = new THREE.Color('#ff7a2a'),
  /** The steel's own colour while hot: near-white steel in daylight swallows an emissive glow on its own. */
  HOT_STEEL = new THREE.Color('#9a3a12'),
  SPARK = new THREE.Color('#ffb347'),
  SPARK_WHITE = new THREE.Color('#fff1c2');
/** The plinth's top above the pedestal's foot (boiler-view.ts), and the lean: how far out from the pedestal's centre
 * the axe's foot stands and how far it tips toward the plinth, its head clear over the plinth's edge. */
const PLINTH = 0.6,
  LEAN = { out: 1.55, tilt: 0.38, toward: 0.5 };
/** A cast part (the boiler, then the breaker) waits on the pedestal: the axe leans against the plinth instead, so a
 * cast never waits for the optional axe (owner, 17 November, as recommended). Accepted state, read every frame. */
export const axeLeans = (w: ReadWorld) => boiler(w).state === 'pedestal' || works(w).breaker === 1;
const foot = new THREE.Vector3(LINE2_BOILER.x / 100, LINE2_BOILER.y / 100, LINE2_BOILER.z / 100);
/** The axe's reach point: the pedestal's centre at the plinth's top. The server judges `rail.axe` from the same point
 * (LINE2_AXE), whichever way the model stands. */
export const AXE_AT: Readonly<THREE.Vector3> = new THREE.Vector3(LINE2_AXE.x / 100, foot.y + PLINTH, LINE2_AXE.z / 100);
const hardwood = LINE1_HARDWOODS.find(([id]) => id === 232)!;
/** Stands `o` (the axe's holder) in its pose: upright in the block on the plinth, the blade (local -Z) toward hardwood
 * 232; or off the plinth's north side, a little east of the hoist's lookers, tipped onto it with the blade outward. */
function poseAxe(o: THREE.Object3D, lean: boolean) {
  if (!lean) {
    o.position.copy(AXE_AT).y += 0.1;
    o.rotation.set(0, Math.atan2(AXE_AT.x - hardwood[1] / 100, AXE_AT.z - hardwood[2] / 100), 0, 'YXZ');
  } else {
    const x = foot.x + Math.sin(Math.PI - LEAN.toward) * LEAN.out,
      z = foot.z + Math.cos(Math.PI - LEAN.toward) * LEAN.out;
    o.position.set(x, H(x, z), z);
    o.rotation.set(LEAN.tilt, Math.atan2(foot.x - x, foot.z - z), 0, 'YXZ');
  }
  o.updateMatrixWorld(true);
}
const scratch = new THREE.Object3D(),
  /** The head's middle in the holder's space (axe-models.ts: the head sits at 0.86 of the proper axe's 0.8 m). */
  HEAD_Y = 0.86 * 0.8;
/** The axe's head in `lean`'s pose: where its prompt points and its card starts (tools.ts). */
export function axeHeadAt(lean: boolean, out: THREE.Vector3) {
  poseAxe(scratch, lean);
  return out.set(0, HEAD_Y * FORGE_REWARDS.axeShow, 0).applyMatrix4(scratch.matrixWorld);
}
const BLOCK = { w: 1.05, h: 0.22, d: 0.85 },
  OFFCUT = 1.2;
type Errand = 'done' | 'fetch' | 'carry' | 'hammer' | 'self';

export async function createForgeRewards(adapter: RailwayAdapter, owner: OwnedView) {
  const folk = await import('../../place/folk.ts');
  const rd = adapter.read;
  const geometries: THREE.BufferGeometry[] = [];
  const keep = <G extends THREE.BufferGeometry>(g: G) => (geometries.push(g), g);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.92 });

  // The pack: the worn frame's own parts, standing as on a back, its straps toward the unload point where the bill is
  // paid, on a timber block. Bare (no straps or buckles) until the little guy is done.
  const isStrap = (kind: string) => kind === 'packstrap' || kind === 's';
  const bare = keep(merged(packParts().filter((p) => !isStrap(p[0]))));
  const straps = keep(merged(packParts().filter((p) => isStrap(p[0]))));
  bare.computeBoundingBox();
  const box = bare.boundingBox!;
  const centre = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
  for (const g of [bare, straps]) g.translate(-centre.x, -centre.y, -centre.z);
  const at = new THREE.Vector3(LINE2_PACK.x / 100, 0, LINE2_PACK.z / 100);
  at.y = H(at.x, at.z);
  const pack = new THREE.Group();
  pack.position.copy(at);
  // Local +z is away from the wearer's back: turn it away from the unload point so the straps face it.
  const ux = LINE2_FORGE.x / 100 - at.x,
    uz = LINE2_FORGE.z / 100 - at.z;
  pack.rotation.y = Math.atan2(-ux, -uz);
  const block = new THREE.Mesh(keep(new THREE.BoxGeometry(BLOCK.w, BLOCK.h, BLOCK.d)), flat('#8a6236', 0.9));
  block.position.y = BLOCK.h / 2;
  const frame = new THREE.Mesh(bare, material),
    strapped = new THREE.Mesh(straps, material);
  for (const m of [frame, strapped]) {
    m.position.y = BLOCK.h;
    m.scale.setScalar(FORGE_REWARDS.packShow);
  }
  for (const m of [block, frame, strapped]) {
    m.castShadow = m.receiveShadow = true;
    pack.add(m);
  }
  pack.visible = false;
  owner.add(pack);
  /** Where the card flies from and the prompt points: the pack's head. */
  const head = at.clone().add(new THREE.Vector3(0, BLOCK.h + 0.7 * FORGE_REWARDS.packShow, 0));

  // The proper axe on the forge's pedestal, offered once the forge is lit: upright in a small timber block on the
  // plinth, its edge turned toward hardwood 232 (in sight 44 m north), or leaning on the plinth's north side while a
  // cast part waits. Reach is measured from the pedestal's centre on both sides (AXE_AT); only the prompt's point and the
  // card's start follow the model. Its materials are this model's own (makeAxeModel clones them).
  const axe = new THREE.Group(),
    axeModel = makeAxeModel('proper');
  axeModel.scale.setScalar(FORGE_REWARDS.axeShow);
  axe.add(axeModel);
  const socket = new THREE.Mesh(keep(new THREE.BoxGeometry(0.34, 0.16, 0.34)), flat('#8a6236', 0.9));
  socket.castShadow = socket.receiveShadow = true;
  socket.position.copy(AXE_AT).y += 0.08;
  axe.visible = socket.visible = false;
  owner.add(axe, socket);
  let leaning: boolean | null = null;
  // Forge-hot: the head, its eye and its edge glow orange from the lit edge until the cut lands, then cool to steel.
  const hot: { m: THREE.MeshStandardNodeMaterial; steel: THREE.Color }[] = [];
  axeModel.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name === 'axe-handle') return;
    const m = o.material as THREE.MeshStandardNodeMaterial;
    hot.push({ m, steel: m.color.clone() });
  });
  let heat: 'cool' | 'waiting' | 'cooling' = 'cool',
    heatT = 0,
    arrivals = 0;
  const glow = (k: number) => {
    for (const { m, steel } of hot) {
      m.color.copy(steel).lerp(HOT_STEEL, k);
      // Above 1: the glow reads against the daylight's exposure (HDR, as the forge's mouth does).
      m.emissive.copy(HOT).multiplyScalar(3 * k);
    }
  };
  /** The axe arrives: one hammer ring at the pedestal and a burst of sparks off the head; it cools from here. At most
   * once per lit edge (the cut's landing, or the fallback after roofHoldMax). */
  function axeArrives() {
    if (heat !== 'waiting') return;
    heat = 'cooling';
    heatT = 0;
    arrivals++;
    clank(AXE_AT.x, AXE_AT.z);
    if (reducedMotion) return;
    const head = axeHeadAt(!!leaning, new THREE.Vector3());
    for (let n = 0; n < 12; n++) {
      const a = Math.random() * Math.PI * 2,
        out = 1.2 + Math.random() * 1.8;
      emit({
        x: head.x,
        y: head.y,
        z: head.z,
        vx: Math.cos(a) * out,
        vy: 1.6 + Math.random() * 2.2,
        vz: Math.sin(a) * out,
        life: 0.5 + Math.random() * 0.4,
        size: 0.14,
        intensity: 2.5,
        color: n % 3 ? SPARK : SPARK_WHITE,
        gravity: 9,
        shape: 'glint',
      });
    }
  }

  // The offcut: one timber left over from the frame, lying at the frame's foot on the pack's side.
  const toPack = new THREE.Vector2(at.x - LINE2_FORGE.x / 100, at.z - LINE2_FORGE.z / 100).normalize();
  const fetchAt = { x: LINE2_FORGE.x / 100 + toPack.x * 2.6, z: LINE2_FORGE.z / 100 + toPack.y * 2.6 };
  const workAt = { x: at.x - toPack.x * 0.95, z: at.z - toPack.y * 0.95 };
  const offcut = new THREE.Mesh(keep(new THREE.BoxGeometry(0.16, 0.16, OFFCUT)), flat('#a07444', 0.9));
  offcut.castShadow = true;
  offcut.visible = false;
  owner.add(offcut);
  const lie = () => {
    offcut.position.set(fetchAt.x, H(fetchAt.x, fetchAt.z) + 0.08, fetchAt.z);
    offcut.rotation.set(0, Math.atan2(toPack.y, -toPack.x), 0);
  };

  let errand: Errand = 'done',
    leg = 0,
    total = 0,
    wait = 0,
    crewMine = false,
    carried = false,
    errands = 0,
    readyShown = line2PackReady(rd.world());
  const guyAt = { x: 0, z: 0 };
  let guyYaw = 0;
  const endCrew = () => {
    if (crewMine) folk.crewEnd();
    crewMine = false;
  };
  const send = (to: { x: number; z: number }, carrying: boolean) => {
    leg = 0;
    folk.crewSend([to], carrying, carrying || errand === 'fetch' ? to : at);
  };
  /** The straps are on: done, with a wooden knock and a small ring of dust when it was played. */
  function finish(played: boolean) {
    errand = 'done';
    endCrew();
    carried = false;
    offcut.visible = false;
    strapped.visible = true;
    if (played) {
      thump(at.x, at.z);
      dustRing(at.x, at.y + 0.1, at.z, 8, 1.1, 0.2);
    }
  }
  function start() {
    errands++;
    strapped.visible = false;
    total = 0;
    if (reducedMotion) return finish(false);
    lie();
    offcut.visible = true;
    crewMine = folk.crewStart(fetchAt.x, fetchAt.z, 1, false) > 0;
    const guy = crewMine ? folk.crewState()?.[0] : null;
    if (guy && Math.hypot(guy.x - fetchAt.x, guy.z - fetchAt.z) > FORGE_REWARDS.near) endCrew();
    if (crewMine) {
      errand = 'fetch';
      send(fetchAt, false);
    } else {
      errand = 'self';
      wait = FORGE_REWARDS.packSelf;
    }
  }
  /** `crossing`: line two's restore as the machine crosses, a few seconds after the lighting: an arrival in flight
   * keeps its heat. Any other restore (a reload, a late join, a resync) finds the axe cool. */
  function restore(crossing = false) {
    readyShown = line2PackReady(rd.world());
    finish(false);
    if (crossing && heat !== 'cool') return;
    heat = 'cool';
    glow(0);
  }
  restore();
  owner.cleanup(() => {
    endCrew();
    for (const g of geometries) g.dispose();
    material.dispose();
  });

  return {
    restore,
    /** The live lit edge: the axe shows forge-hot and still until it arrives (it is never hidden while offered). */
    axeHot() {
      heat = 'waiting';
      heatT = 0;
      glow(1);
    },
    axeArrives,
    /** The pack's spot on the ground, and its head (the prompt's point and the card's `from`). */
    packAt: () => at,
    packTarget: () => head,
    update(dt: number) {
      const w = rd.world();
      axe.visible = forge(w).lit >= 0 && !rail(w).axe;
      if (axe.visible && axeLeans(w) !== leaning) poseAxe(axe, (leaning = axeLeans(w)));
      socket.visible = axe.visible && !leaning;
      if (heat !== 'cool') {
        heatT += dt;
        // A queued cut that never lands (dropped from the queue) never leaves the axe glowing.
        if (heat === 'waiting' && heatT > FORGE_REWARDS.roofHoldMax) axeArrives();
        else if (heat === 'cooling') {
          // Slow to leave red at first, quicker at the end, like steel out of a fire.
          const u = Math.min(1, heatT / FORGE_REWARDS.cool);
          glow((1 - u) ** 0.6);
          if (u === 1) heat = 'cool';
        }
      }
      const ready = line2PackReady(w),
        claimed = rail(w).pack;
      pack.visible = ready && !claimed;
      // A crossing counts once the view is the confirmed world (nothing of yours pending): never on prediction.
      if (rd.pending() === 0) {
        if (ready && !readyShown && !claimed) start();
        readyShown = ready;
      }
      if (!pack.visible && errand !== 'done') return finish(false);
      if (errand === 'done') return;
      total += dt;
      leg += dt;
      wait -= dt;
      const crew = crewMine ? folk.crewState() : null;
      if (crewMine && !crew) crewMine = false; // someone else took the crew (the roof show): finish now
      const guy = crew?.[0];
      if (guy) {
        if (Math.hypot(guy.x - guyAt.x, guy.z - guyAt.z) > 0.01) guyYaw = Math.atan2(guy.x - guyAt.x, guy.z - guyAt.z);
        guyAt.x = guy.x;
        guyAt.z = guy.z;
      }
      const here = !guy || guy.here;
      const arrived = here || leg > (errand === 'fetch' ? FORGE_REWARDS.fetchLeg : FORGE_REWARDS.leg);
      if (total > FORGE_REWARDS.packCap || (errand !== 'self' && !crewMine)) return finish(true);
      if (errand === 'self' && wait <= 0) return finish(true);
      if (errand === 'fetch' && arrived) {
        // A walk that ran out leaves the offcut where it lies (never a jump onto his shoulder); it goes as the straps do.
        carried = here;
        errand = 'carry';
        send(workAt, carried);
      } else if (errand === 'carry' && arrived) {
        if (carried) {
          offcut.visible = false;
          thump(workAt.x, workAt.z);
        }
        carried = false;
        errand = 'hammer';
        wait = FORGE_REWARDS.hammer;
        send(workAt, false);
      } else if (errand === 'hammer' && wait <= 0) return finish(true);
      if (carried && guy) {
        // On his shoulder, along the way he walks (forge-finish.ts's carried beams).
        offcut.position.set(guy.x, guy.y + 0.95, guy.z);
        offcut.rotation.set(0, guyYaw, 0);
      }
    },
    inspect: () => ({
      axe: { shown: axe.visible, leaning: !!leaning, heat, arrivals },
      pack: { x: at.x, y: at.y, z: at.z, shown: pack.visible, strapped: strapped.visible },
      errand,
      errands,
      crew: crewMine ? folk.crewState() : null,
    }),
  };
}
