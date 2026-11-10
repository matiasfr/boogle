// The forge's finished look (docs/plans/works-late-game.md, step 6; owner, 10 November: free at the twelfth pier
// footing). When the crossing is accepted (`works.crossing`), line 1's next village arrival brings eight roof beams on
// its last car; they hop off beside the track, two little guys carry them to the forge in pairs and lift each pair on as
// a truss, the roof's boards follow, the scaffold poles come down, the chimney gets its cap and the walk-in workshop
// opens (Place's T6b, ./workshop.ts). Place's freight crates and doubled pour are not ported.
// Local presentation over accepted state: the show plays on the live edge; a reload or a late joiner after the crossing
// sees it finished. No op, presence or shared state.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { trainAlong } from '../../sim/railway-train.ts';

/** The scaffold poles, read by opening-view.ts each frame: 0 standing, 1 gone. Local. */
export const forgePoles = { down: 0 };

const BEAMS = 8,
  LENGTH = 5,
  /** The beams ride line 1's last car (TRAIN_OFFSETS[2]), a little behind its centre so they clear the car ahead. */
  CAR = -3.7 - 0.5,
  LIFT_S = 0.8,
  HOP_S = 0.45,
  POLES_S = 1.4,
  LEG_S = 12;
type Beam = {
  at: 'car' | 'ground' | 'guy' | 'fly' | 'roof';
  guy: number;
  t: number;
  from: THREE.Matrix4;
};
type DropSet = import('../../proto/place/pieces.ts').DropSet;
type Plan = import('../../proto/place/building-plans.ts').Plan;
type Stage = 'idle' | 'ride' | 'unload' | 'fetch' | 'carry' | 'finish' | 'done';

export async function createForgeFinish(
  adapter: RailwayAdapter,
  owner: OwnedView,
  o: {
    plan: Plan;
    /** The forge's pieces (line2-view.ts's drop set): the roof is WALLS..ROOFED of them. */
    building: DropSet;
    /** The forge's walls stop being one sealed box (the workshop's hollow walls take over). */
    unseal: () => void;
  },
) {
  const [layout, folk, { makeWorkshop }, { H }] = await Promise.all([
    import('../../proto/place/layout.ts'),
    import('../../proto/place/folk.ts'),
    import('../../proto/place/workshop.ts'),
    import('../../proto/place/land.ts'),
  ]);
  const { plan, building } = o;
  const roof = [...plan.pieces.keys()].filter((k) => k >= plan.WALLS && k < plan.ROOFED);
  const X = plan.x,
    Z = plan.z,
    W = plan.hw * 2 - 1.6,
    D = plan.hd * 2 - 1.6;
  const HIGH = 4.6,
    RISE = 2.1,
    EAVE = D / 2 + 0.5;
  const base = plan.y + HIGH + 0.36 + RISE / 2 - 0.2,
    tilt = Math.atan2(RISE, EAVE);
  let stage: Stage = 'idle',
    wait = 0,
    clock = -1,
    wasHome = false,
    trips = 0,
    /** Seconds since the crew was last sent: a walk that takes longer than LEG_S counts as arrived. */
    leg = 0;
  const beams: Beam[] = Array.from({ length: BEAMS }, () => ({
    at: 'car',
    guy: -1,
    t: 0,
    from: new THREE.Matrix4(),
  }));
  const material = new THREE.MeshStandardNodeMaterial({ color: '#8a6236', roughness: 0.8 });
  const geometry = new THREE.BoxGeometry(0.22, 0.3, LENGTH);
  const mesh = new THREE.InstancedMesh(geometry, material, BEAMS);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  owner.add(mesh);
  const capGeometry = new THREE.BoxGeometry(1.15, 0.22, 1.15);
  const cap = new THREE.Mesh(capGeometry, new THREE.MeshStandardNodeMaterial({ color: '#3c3f3e', roughness: 0.7 }));
  cap.castShadow = true;
  const capAt = new THREE.Vector3(plan.smoke!.x, plan.smoke!.y + 0.12, plan.smoke!.z);
  cap.position.copy(capAt);
  owner.add(cap);
  let capDrop = -1; // seconds into the cap's drop, or -1
  const workshop = makeWorkshop(plan, building, () => stage === 'done' && !building.busy());
  owner.cleanup(() => {
    workshop.dispose();
    geometry.dispose();
    capGeometry.dispose();
    material.dispose();
    (cap.material as THREE.Material).dispose();
    folk.crewEnd();
    forgePoles.down = 0;
  });

  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(0, 0, 0, 'YXZ'),
    p = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1),
    a = { x: 0, z: 0, ux: 0, uz: 0 },
    b = { x: 0, z: 0, ux: 0, uz: 0 };
  const line1 = layout.LINKS[0]!.line;
  const ground = { x: 0, y: 0, z: 0, yaw: 0 };
  /** The last car's beam stack pose: centre on the deck and heading. */
  function carPose(out: { x: number; y: number; z: number; yaw: number }) {
    const s = adapter.inspect();
    const along = trainAlong(s.line2.train[0]!, 0, clock) / 100 + CAR;
    layout.lineAt(line1, along + 1.1, a);
    layout.lineAt(line1, along - 1.1, b);
    out.x = (a.x + b.x) / 2 + layout.ORIGIN.x;
    out.z = (a.z + b.z) / 2 + layout.ORIGIN.z;
    out.y = (layout.railY(line1, along + 1.1) + layout.railY(line1, along - 1.1)) / 2 + 0.75;
    out.yaw = Math.atan2(a.x - b.x, a.z - b.z);
    return out;
  }
  const car = { x: 0, y: 0, z: 0, yaw: 0 };
  /** Beam k lying in a stack (two across, four high) at `at`, along its yaw. */
  function stacked(k: number, at: { x: number; y: number; z: number; yaw: number }, out: THREE.Matrix4) {
    const side = k % 2 ? 0.16 : -0.16,
      layer = Math.floor(k / 2);
    p.set(at.x + Math.cos(at.yaw) * side, at.y + 0.15 + layer * 0.3, at.z - Math.sin(at.yaw) * side);
    return out.compose(p, q.setFromEuler(e.set(0, at.yaw, 0)), one);
  }
  /** Beam k as a rafter of truss k >> 1, from the ridge down to one eave. */
  function rafter(k: number, out: THREE.Matrix4) {
    const truss = k >> 1,
      side = k % 2 ? 1 : -1;
    p.set(X + (-0.36 + truss * 0.24) * W, base, Z + (side * EAVE) / 2);
    return out.compose(p, q.setFromEuler(e.set(side * tilt, 0, 0)), one);
  }
  /** Beam k on a little guy's shoulders, along the way he faces. */
  function carried(k: number, guy: { x: number; y: number; z: number }, yaw: number, out: THREE.Matrix4) {
    const side = k % 2 ? 0.14 : -0.14;
    p.set(guy.x + Math.cos(yaw) * side, guy.y + 0.95, guy.z - Math.sin(yaw) * side);
    return out.compose(p, q.setFromEuler(e.set(0, yaw, 0)), one);
  }
  const guyYaw = [0, 0];
  const lastGuy = [
    { x: 0, z: 0 },
    { x: 0, z: 0 },
  ];
  const lerp = new THREE.Matrix4(),
    pa = new THREE.Vector3(),
    pb = new THREE.Vector3(),
    qa = new THREE.Quaternion(),
    qb = new THREE.Quaternion(),
    sc = new THREE.Vector3();
  /** A flight's pose: from `from` to `to`, arcing up `apex` m. */
  function flight(from: THREE.Matrix4, to: THREE.Matrix4, u: number, apex: number, out: THREE.Matrix4) {
    from.decompose(pa, qa, sc);
    to.decompose(pb, qb, sc);
    const s = u * u * (3 - 2 * u);
    pa.lerp(pb, s);
    pa.y += Math.sin(u * Math.PI) * apex;
    qa.slerp(qb, s);
    return out.compose(pa, qa, one);
  }
  /** Where the crew stands: either side of the ground stack, or at the forge's two side walls. */
  const atStack = () => [
    { x: ground.x + Math.cos(ground.yaw) * 1.1, z: ground.z - Math.sin(ground.yaw) * 1.1 },
    { x: ground.x - Math.cos(ground.yaw) * 1.1, z: ground.z + Math.sin(ground.yaw) * 1.1 },
  ];
  const atForge = () => [
    { x: X - W / 2 - 1.1, z: Z + (trips % 2 ? 1.2 : -1.2) },
    { x: X + W / 2 + 1.1, z: Z + (trips % 2 ? -1.2 : 1.2) },
  ];
  const send = (at: { x: number; z: number }[], carrying: boolean, face: { x: number; z: number }) => {
    leg = 0;
    folk.crewSend(at, carrying, face);
  };
  const nextOnGround = () => beams.findIndex((beam) => beam.at === 'ground');

  function snapDone() {
    stage = 'done';
    folk.crewEnd();
    for (const k of roof) building.snap(k, true);
    beams.forEach((beam) => {
      beam.at = 'roof';
    });
    forgePoles.down = 1;
    capDrop = -1;
    cap.position.copy(capAt);
    cap.visible = true;
    o.unseal();
    workshop.snap();
  }
  function reset() {
    stage = 'idle';
    folk.crewEnd();
    beams.forEach((beam) => {
      beam.at = 'car';
      beam.guy = -1;
    });
    forgePoles.down = 0;
    cap.visible = false;
    capDrop = -1;
  }
  /** Roof boards for truss `truss` (0..3) of 4: a quarter of the roof, dropped in order. */
  function dropBoards(truss: number) {
    const from = Math.round((truss / 4) * roof.length),
      to = Math.round(((truss + 1) / 4) * roof.length);
    for (let n = from; n < to; n++) building.drop(roof[n]!, 2.4, 0.15 + (n - from) * 0.06);
  }
  function restore() {
    const s = adapter.inspect();
    clock = adapter.tickNow();
    wasHome = home();
    if (s.works.crossing >= 0) snapDone();
    else reset();
  }
  /** Line 1's train stands at the village halt. */
  function home() {
    const s = adapter.inspect(),
      row = s.line2.train[0];
    return !!s.line2.trains && !!row && row.phase === 0 && row.at === 0;
  }
  restore();

  function draw(dt: number) {
    if (stage === 'ride') carPose(car);
    const crew = folk.crewState();
    crew?.forEach((g, k) => {
      if (k > 1) return;
      const moved = Math.hypot(g.x - lastGuy[k]!.x, g.z - lastGuy[k]!.z);
      if (moved > 0.01) guyYaw[k] = Math.atan2(g.x - lastGuy[k]!.x, g.z - lastGuy[k]!.z);
      lastGuy[k] = { x: g.x, z: g.z };
    });
    beams.forEach((beam, k) => {
      if (beam.at === 'car') {
        if (stage === 'idle') m.makeScale(0, 0, 0);
        else stacked(k, car, m);
      } else if (beam.at === 'ground') stacked(k, ground, m);
      else if (beam.at === 'guy') {
        const g = crew?.[beam.guy];
        if (g) carried(k, g, guyYaw[beam.guy]!, m);
        else stacked(k, ground, m);
      } else if (beam.at === 'fly') {
        beam.t += dt;
        const roofing = beam.guy >= 0;
        const u = Math.min(1, beam.t / (roofing ? LIFT_S : HOP_S));
        if (roofing) rafter(k, lerp);
        else stacked(k, ground, lerp);
        flight(beam.from, lerp, u, roofing ? 1.2 : 0.6, m);
        if (u >= 1) {
          beam.at = roofing ? 'roof' : 'ground';
          lerp.decompose(pa, qa, sc);
          thump(pa.x, pa.z);
          if (roofing) {
            clank(pa.x, pa.z);
            if (k % 2) dropBoards(k >> 1);
          } else dustRing(pa.x, ground.y, pa.z, 4, 0.8, 0.15);
        }
      } else rafter(k, m);
      mesh.setMatrixAt(k, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (capDrop >= 0) {
      capDrop += dt;
      const u = Math.min(1, capDrop / 0.5);
      cap.position.set(capAt.x, capAt.y + (1 - u * u) * 3, capAt.z);
      if (u >= 1) {
        capDrop = -1;
        clank(capAt.x, capAt.z);
        dustRing(capAt.x, capAt.y, capAt.z, 6, 0.8, 0.15);
      }
    }
  }

  return {
    restore,
    /** The workshop is open: the sealed walls stay off. */
    open: () => stage === 'done',
    update(dt: number) {
      const s = adapter.inspect(),
        target = adapter.tickNow();
      if (clock < 0 || Math.abs(target - clock) > 3) clock = target;
      else clock += dt * 10 + Math.max(-0.02, Math.min(0.02, (target - clock) * 0.05));
      const atHome = home();
      const arrived = atHome && !wasHome;
      wasHome = atHome;
      if (s.works.crossing < 0 && stage !== 'idle') reset();
      if (stage === 'idle' && s.works.crossing >= 0) stage = 'ride';
      wait = Math.max(0, wait - dt);
      leg += dt;
      const arrivedAll = (c: { here: boolean }[]) => c.every((g) => g.here) || leg > LEG_S;
      const crew = folk.crewState();
      switch (stage) {
        case 'ride':
          if (!arrived) break;
          // Off the car onto a stack past the platform, on the forge's side, so the train can go on its way.
          carPose(car);
          {
            const side = (X - car.x) * Math.cos(car.yaw) - (Z - car.z) * Math.sin(car.yaw) > 0 ? 1 : -1;
            ground.x = car.x + Math.cos(car.yaw) * side * 5.5;
            ground.z = car.z - Math.sin(car.yaw) * side * 5.5;
            ground.y = H(ground.x, ground.z) + 0.02;
            ground.yaw = car.yaw;
          }
          beams.forEach((beam, k) => {
            beam.at = 'fly';
            beam.guy = -1;
            beam.t = -k * 0.12;
            stacked(k, car, beam.from);
          });
          trips = 0;
          if (folk.crewStart(ground.x, ground.z) > 0) send(atStack(), false, ground);
          stage = 'unload';
          wait = 1.6;
          break;
        case 'unload':
          if (wait > 0 || beams.some((beam) => beam.at === 'fly')) break;
          stage = 'fetch';
          break;
        case 'fetch': {
          const k = nextOnGround();
          if (k < 0) {
            stage = 'finish';
            break;
          }
          if (!crew) {
            // Nobody about to carry: the pairs lift themselves on, one after another.
            if (wait > 0) break;
            for (const j of [k, k + 1]) {
              stacked(j, ground, beams[j]!.from);
              Object.assign(beams[j]!, { at: 'fly', guy: 0, t: j === k ? 0 : 0.1 });
            }
            wait = 1.4;
            break;
          }
          if (!arrivedAll(crew)) break;
          // Each guy shoulders the next pair and walks it round to his side of the forge.
          crew.forEach((_, g) => {
            const j = nextOnGround();
            if (j < 0) return;
            beams[j]!.at = beams[j + 1]!.at = 'guy';
            beams[j]!.guy = beams[j + 1]!.guy = g;
          });
          send(atForge(), true, { x: X, z: Z });
          stage = 'carry';
          break;
        }
        case 'carry':
          if (crew && !arrivedAll(crew)) break;
          // Up onto the walls as a truss: both rafters of each pair, then that quarter of the boards.
          beams.forEach((beam, k) => {
            if (beam.at !== 'guy') return;
            const g = crew?.[beam.guy];
            if (g) carried(k, g, guyYaw[beam.guy]!, beam.from);
            beam.at = 'fly';
            beam.t = k % 2 ? 0.12 : 0;
          });
          trips++;
          stage = 'fetch';
          if (nextOnGround() >= 0) send(atStack(), false, ground);
          else {
            // The last pair is up: they hammer it home where they stand while the boards go on.
            if (crew) send(atForge(), false, { x: X, z: Z });
            stage = 'finish';
            wait = LIFT_S + 0.4;
          }
          break;
        case 'finish':
          if (wait > 0 || beams.some((beam) => beam.at === 'fly') || building.busy()) break;
          if (forgePoles.down === 0) {
            // The poles come down and the chimney gets its cap; the crew cheers.
            whistle(X, Z);
            dustRing(X, plan.y + 0.4, Z, 16, 3.2, 0.5);
            capDrop = 0;
            cap.visible = true;
            forgePoles.down = 0.001;
            folk.crewEnd();
            folk.cheerAround(X, Z, 14, 4);
          }
          break;
      }
      if (forgePoles.down > 0 && forgePoles.down < 1) {
        forgePoles.down = Math.min(1, forgePoles.down + dt / POLES_S);
        if (forgePoles.down >= 1) {
          thump(X, Z);
          stage = 'done';
          o.unseal();
          workshop.snap();
        }
      }
      draw(dt);
      workshop.update(dt);
    },
    inspect: () => ({
      stage,
      beams: beams.map((beam) => beam.at),
      poles: forgePoles.down,
      cap: cap.visible,
      crew: folk.crewState(),
      roofShown: roof.length,
    }),
  };
}
