// The forge's rewards are its own products (docs/plans/forge-made-rewards.md; owner, 17 November). When the 24th log
// goes in, the pack frame stands bare on a timber stand at its spot (chest height, in the station frames' timber with
// their amber caps, a coral glimmer while it waits) and one of the frame's log haulers fetches an offcut from the forge
// frame's foot, carries it over and hammers the pack together; the straps go on with a knock. The scaffold pair keep
// hammering the walls the 32 logs pay for.
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
import { softGlow } from '../../place/look.ts';
import { H } from '../../place/terrain.ts';
import { packParts, yokeAssembly } from '../../render/gear-models.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { compiled } from '../../prefab/catalogue.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import kit from '../../../content/built/levels/railway-yoke.json' with { type: 'json' };
import { PROPS } from '../../place/home-station.ts';
import { me } from '../../player/state.ts';
import { YOKE_VERB } from './reward-data.ts';
import { makeAxeModel } from '../../render/axe-models.ts';
import { LINE2_AXE, LINE2_BOILER, LINE2_FORGE, LINE2_PACK, LINE2_YOKE } from '../../sim/railway-line2-layout.ts';
import { LINE1_HARDWOODS } from '../../sim/railway-line-layout.ts';
import { boiler, forge, rail, works, type ReadWorld } from '../../sim/railway-rows.ts';
import { line2PackReady, line2YokeReady } from '../../sim/railway-queries-line2.ts';
export function yokeAt() {
  const x = LINE2_YOKE.x / 100,
    z = LINE2_YOKE.z / 100;
  return new THREE.Vector3(x, H(x, z), z);
}
export const yokeAvailable = (adapter: RailwayAdapter) => {
  const w = adapter.read.world();
  return adapter.read.ready() && line2YokeReady(w) && !rail(w).yoke;
};

/** The errand's timings, in seconds: the hammering at the pack, a leg that counts as arrived (the walk to the offcut
 * gets longer, as the nearest stroller can start across the yard), the whole errand's cap, and how long the pack takes
 * to finish itself with no little guy within `near` m of the offcut. `packShow`: the pack's scale on its stand, a
 * back-sized frame that reads from the unload point at follow distance (owner's review, 18 November). */
export const FORGE_REWARDS = {
  hammer: 1.4,
  leg: 6,
  fetchLeg: 10,
  packCap: 16,
  packSelf: 1.5,
  near: 30,
  packShow: 2.4,
  axeShow: 2.2,
  roofHoldMax: 5,
  cool: 3,
} as const;
/** Steel out of the fire, hottest first: yellow, orange, red, then dark before it greys back to steel (heat 1 to 0).
 * The steel's own colour follows it, as near-white steel in daylight swallows an emissive glow on its own; going through
 * dark rather than straight from red to the near-white steel keeps it from passing through pink. */
const HEAT_RAMP: readonly [number, THREE.Color][] = [
    [1, new THREE.Color('#ffd04a')],
    [0.7, new THREE.Color('#ff8a1c')],
    [0.4, new THREE.Color('#d8461a')],
    [0.18, new THREE.Color('#5a4640')],
  ],
  SPARK = new THREE.Color('#ffb347'),
  SPARK_WHITE = new THREE.Color('#fff1c2');
/** The plinth's top above the pedestal's foot (boiler-view.ts), and the lean: how far out from the pedestal's centre
 * the axe's foot stands and how far it tips toward the plinth, its head clear over the plinth's edge. */
const PLINTH = 0.6,
  LEAN = { out: 1.4, tilt: 0.38, toward: 0.5 };
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
/** The pack's stand: a shelf at about a Buddy's chest, `w` wide and `d` deep (the pack's cradle runs back into it), two
 * back posts `post` high with a rail across and the station frames' amber caps. */
const STAND = { shelf: 0.7, w: 1.9, d: 2.05, post: 2.35 },
  OFFCUT = 1.2;
/** The pack's head above its spot: where its prompt points and its card starts (tools.ts). */
export const PACK_HEAD_Y = STAND.shelf + 1.25;
type Errand = 'done' | 'fetch' | 'carry' | 'hammer' | 'self';

export async function createForgeRewards(adapter: RailwayAdapter, owner: OwnedView) {
  const folk = await import('../../place/folk.ts');
  const rd = adapter.read;
  const geometries: THREE.BufferGeometry[] = [];
  const keep = <G extends THREE.BufferGeometry>(g: G) => (geometries.push(g), g);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.92 });

  // The pack: the worn frame's own parts, standing as on a back, its straps toward the unload point where the bill is
  // paid, on its stand. Bare (no straps or buckles) until the little guy is done.
  const isStrap = (kind: string) => kind === 'packstrap' || kind === 's';
  const parts = packParts();
  const bare = keep(merged(parts.filter((p) => !isStrap(p[0]))));
  const straps = keep(merged(parts.filter((p) => isStrap(p[0]))));
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
  // The stand, in the pack's own space (+z runs back from the straps into the stand): a plank shelf on four legs, two
  // back posts rising past the pack with a rail across, capped amber like every station frame's posts.
  const wood = flat('#8a6236', 0.9),
    post = flat('#7f5630', 0.9),
    amber = flat('#f2a51a', 0.8);
  const back = STAND.d - 0.12,
    front = -0.12,
    mid = (back + front) / 2;
  const part = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    const mesh = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    pack.add(mesh);
  };
  part(STAND.w, 0.1, STAND.d, 0, STAND.shelf - 0.05, mid, wood);
  for (const sx of [-1, 1]) {
    const x = (sx * (STAND.w - 0.12)) / 2;
    part(0.12, STAND.shelf - 0.1, 0.12, x, (STAND.shelf - 0.1) / 2, front + 0.06, post);
    part(0.14, STAND.post, 0.14, x, STAND.post / 2, back, post);
    part(0.22, 0.18, 0.22, x, STAND.post + 0.09, back, amber);
  }
  part(STAND.w, 0.12, 0.12, 0, STAND.post - 0.25, back, wood);
  part(STAND.w, 0.1, 0.1, 0, 0.25, back, wood);
  const frame = new THREE.Mesh(bare, material),
    strapped = new THREE.Mesh(straps, material);
  for (const m of [frame, strapped]) {
    m.position.y = STAND.shelf;
    m.scale.setScalar(FORGE_REWARDS.packShow);
    m.castShadow = m.receiveShadow = true;
    pack.add(m);
  }
  // The chests' low glimmer (crates-view.ts), in the pack's coral: a waiting reward still signals from across the yard.
  const glimmer = softGlow('#ffc79e', 0.4, 'up');
  glimmer.mat.blending = THREE.NormalBlending;
  const glimmerMesh = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(1.15, 1.35, 1.9, 14, 1, true).translate(0, STAND.shelf + 0.95, mid)),
    glimmer.mat,
  );
  pack.add(glimmerMesh);
  pack.visible = false;
  owner.add(pack);
  const base = yokeAt();
  const record = loadLevelArtifact(kit, compiled.prefabs).placements[0]!;
  const yoke = instantiate(
    record.prefab,
    { ...record, pos: [base.x, base.y, base.z], rot: [PROPS.yoke.yaw, 0, 0] },
    {
      owner,
      handlers: {
        'railway.take-yoke': () => {
          const p = me.body?.interpolatedPosition;
          if (
            !p ||
            !yokeAvailable(adapter) ||
            Math.hypot(p.x - base.x, p.z - base.z) > LINE2_YOKE.reach / 100 ||
            Math.abs(p.y - base.y) > 3
          )
            return [];
          // The rack and block are point targets. Reach is checked above; pick radius would bias every facing toward the yoke.
          return [{ id: 'railway-yoke', at: target, verb: YOKE_VERB, run: () => void adapter.takeYoke() }];
        },
      },
    },
  );
  const target: THREE.Vector3 = yoke.attach('pickup').at;
  const assembly = yokeAssembly();
  const iron = new THREE.Group();
  const bar = new THREE.Mesh(keep(merged(assembly.bar)), material);
  const hooks = new THREE.Mesh(keep(merged(assembly.hooks)), material);
  for (const piece of [bar, hooks]) {
    piece.castShadow = piece.receiveShadow = true;
    iron.add(piece);
  }
  const bounds = new THREE.Box3().setFromObject(iron);
  const bareBottom = new THREE.Box3().setFromObject(bar).min.y;
  iron.scale.setScalar(2);
  iron.position.set(0, 0.7 - 2 * bounds.min.y, -(bounds.min.z + bounds.max.z));
  const halo = glimmerMesh.clone();
  halo.position.set(0, 0, -mid);
  yoke.root.add(iron, halo);
  /** Where the card flies from and the prompt points: the pack's head. */
  const head = at.clone().add(new THREE.Vector3(0, PACK_HEAD_Y, 0));

  // The proper axe on the forge's pedestal, offered once the forge is lit: upright in a small timber block on the
  // plinth, its edge turned toward hardwood 232 (in sight 44 m north), or leaning on the plinth's north side while a
  // cast part waits. Reach is measured from the pedestal's centre on both sides (AXE_AT); only the prompt's point and the
  // card's start follow the model. Its materials are this model's own (makeAxeModel clones them).
  const axe = new THREE.Group(),
    axeModel = makeAxeModel('proper');
  axeModel.scale.setScalar(FORGE_REWARDS.axeShow);
  axe.add(axeModel);
  const socket = new THREE.Mesh(keep(new THREE.BoxGeometry(0.5, 0.2, 0.5)), flat('#8a6236', 0.9));
  socket.castShadow = socket.receiveShadow = true;
  socket.position.copy(AXE_AT).y += 0.1;
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
  const tint = new THREE.Color();
  const glow = (k: number) => {
    // Where `k` falls on the ramp; below its last stop the dark fades back into the steel.
    let i = 0;
    while (i < HEAT_RAMP.length - 1 && k < HEAT_RAMP[i + 1]![0]) i++;
    const [k0, c0] = HEAT_RAMP[i]!,
      [k1, c1] = HEAT_RAMP[i + 1] ?? [0, null];
    if (c1) tint.copy(c1).lerp(c0, (k - k1) / (k0 - k1));
    else tint.copy(c0);
    for (const { m, steel } of hot) {
      if (c1) m.color.copy(tint);
      else m.color.copy(steel).lerp(tint, k / k0);
      // Above 1: the glow reads against the daylight's exposure (HDR, as the forge's mouth does); none once it's dark.
      m.emissive.copy(tint).multiplyScalar(k > HEAT_RAMP.at(-1)![0] ? 2.5 * k : 0);
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
    sparksAt(axeHeadAt(!!leaning, new THREE.Vector3()), 12);
  }
  function sparksAt(head: THREE.Vector3, count: number) {
    for (let n = 0; n < count; n++) {
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

  function makeErrand({
    at,
    fetchAt,
    workAt,
    fittings,
    readyNow,
    length,
    colour,
    offcutYaw,
    carryLeg,
    done,
  }: {
    at: THREE.Vector3;
    fetchAt: { x: number; z: number };
    workAt: { x: number; z: number };
    fittings: THREE.Object3D;
    readyNow: typeof line2PackReady;
    length: number;
    colour: string;
    offcutYaw: number;
    carryLeg: number;
    done: () => void;
  }) {
    const offcut = new THREE.Mesh(keep(new THREE.BoxGeometry(0.16, 0.16, length)), flat(colour, 0.9));
    offcut.castShadow = true;
    offcut.visible = false;
    owner.add(offcut);
    const lie = () => {
      offcut.position.set(fetchAt.x, H(fetchAt.x, fetchAt.z) + 0.08, fetchAt.z);
      offcut.rotation.set(0, offcutYaw, 0);
    };

    let errand: Errand = 'done',
      leg = 0,
      total = 0,
      wait = 0,
      crewMine = false,
      carried = false,
      errands = 0,
      readyShown = readyNow(rd.world());
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
      fittings.visible = true;
      if (played) done();
    }
    function start() {
      errands++;
      fittings.visible = false;
      total = 0;
      if (reducedMotion) return finish(false);
      lie();
      offcut.visible = true;
      crewMine = !folk.crewState() && folk.crewStart(fetchAt.x, fetchAt.z, 1, false) > 0;
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
    function update(dt: number, ready: boolean, claimed: boolean, offered: boolean) {
      // A crossing counts once the view is the confirmed world (nothing of yours pending): never on prediction.
      if (rd.pending() === 0) {
        if (ready && !readyShown && !claimed) start();
        readyShown = ready;
      }
      if (!offered && errand !== 'done') {
        if (rd.pending() === 0) finish(false);
        return;
      }
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
      const arrived = here || leg > (errand === 'fetch' ? FORGE_REWARDS.fetchLeg : carryLeg);
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
    }
    return {
      update,
      restore() {
        readyShown = readyNow(rd.world());
        finish(false);
      },
      endCrew,
      inspect: () => ({ errand, errands, crew: crewMine ? folk.crewState() : null }),
    };
  }
  // The offcut: one timber left over from the frame, lying at the frame's foot on the pack's side.
  const toPack = new THREE.Vector2(at.x - LINE2_FORGE.x / 100, at.z - LINE2_FORGE.z / 100).normalize();
  // At the frame's foot on the pack's side, kept east of the bill board (1.8 m west, 2.4 m south of the frame).
  const fetchAt = { x: LINE2_FORGE.x / 100 + 0.8, z: LINE2_FORGE.z / 100 - 2.8 };
  const workAt = { x: at.x - toPack.x * 1.2, z: at.z - toPack.y * 1.2 };

  const packErrand = makeErrand({
    at,
    fetchAt,
    workAt,
    fittings: strapped,
    readyNow: line2PackReady,
    length: OFFCUT,
    colour: '#a07444',
    offcutYaw: Math.atan2(toPack.y, -toPack.x),
    carryLeg: FORGE_REWARDS.leg,
    done() {
      thump(at.x, at.z);
      dustRing(at.x, at.y + 0.1, at.z, 8, 1.1, 0.2);
    },
  });
  const rackX = LINE2_FORGE.rackX / 100,
    rackZ = LINE2_FORGE.rackZ / 100;
  const out = new THREE.Vector2(base.x - rackX, base.z - rackZ).normalize();
  const yokeErrand = makeErrand({
    at: base,
    fetchAt: { x: rackX + out.x * 1.3, z: rackZ + out.y * 1.3 },
    // Hammer from Q1's side of the block, where the timber cannot hide the maker.
    workAt: { x: base.x + out.y * 1.25, z: base.z - out.x * 1.25 },
    fittings: hooks,
    readyNow: line2YokeReady,
    length: 1,
    colour: '#48525a',
    offcutYaw: PROPS.yoke.yaw,
    carryLeg: FORGE_REWARDS.fetchLeg,
    done() {
      clank(base.x, base.z);
      sparksAt(target, 8);
    },
  });
  /** `crossing`: line two's restore as the machine crosses, a few seconds after the lighting: an arrival under way
   * (waiting for its cut or its fallback, or cooling) keeps going, clank and sparks included. Any other restore (a
   * reload, a late join, a resync) finds the axe cool. */
  function restore(crossing = false) {
    packErrand.restore();
    yokeErrand.restore();
    if (crossing && heat !== 'cool') return;
    heat = 'cool';
    glow(0);
  }
  restore();
  owner.cleanup(() => {
    packErrand.endCrew();
    yokeErrand.endCrew();
    for (const g of geometries) g.dispose();
    material.dispose();
    glimmer.mat.dispose();
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
    yokeTargets: yoke.targets,
    packAt: () => at,
    packTarget: () => head,
    update(dt: number) {
      const w = rd.world();
      axe.visible = forge(w).lit >= 0 && !rail(w).axe;
      if (axe.visible) {
        const lean = axeLeans(w);
        if (lean !== leaning) poseAxe(axe, (leaning = lean));
      }
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
      const yokeReady = line2YokeReady(w);
      yoke.setEnabled(yokeReady && !rail(w).yoke);
      if (pack.visible || yoke.root.visible) glimmer.strength.value = 0.4 + 0.06 * Math.sin(performance.now() * 0.0025);
      packErrand.update(dt, ready, claimed, pack.visible);
      yokeErrand.update(dt, yokeReady, rail(w).yoke, yoke.root.visible);
      iron.position.y = 0.7 - 2 * (hooks.visible ? bounds.min.y : bareBottom);
    },
    inspect: () => ({
      axe: { shown: axe.visible, leaning: !!leaning, heat, arrivals },
      pack: { x: at.x, y: at.y, z: at.z, shown: pack.visible, strapped: strapped.visible },
      yoke: { shown: yoke.root.visible, hooked: hooks.visible, ...yokeErrand.inspect() },
      ...packErrand.inspect(),
    }),
  };
}
