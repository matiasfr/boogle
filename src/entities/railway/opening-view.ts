// The authored opening scenery and local cast, with no legacy run, job or save owner.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { townPopulation, townRead } from '../../sim/town-facts.ts';
import { createTownGreeter, type GreeterRead } from './greeter.ts';
import { forgePoles } from './forge-finish.ts';

type OpeningEnv = {
  machine: () => { mesh: THREE.Object3D; top: number };
  traffic: readonly { mesh: THREE.Object3D; spec: { hx: number; hz: number }; hy: number }[];
  station: () => { x: number; y: number; z: number } | null;
  busy: () => boolean;
  chairTaken: (seat: number) => boolean;
  awake: () => boolean;
  hush: () => boolean;
  pathOpen: () => boolean;
  /** The railway as the views see it (the read facade's world and ready, view.ts's phase this frame). */
  progress: GreeterRead;
  /** The engines' driving stools (train-view.ts), for the little guy at the controls. */
  driver: (
    line: number,
    k: number,
  ) => { mesh: THREE.Object3D; top: number; up: number; x: number; z: number; yaw: number } | null;
};

export async function createRailwayOpening(owner: OwnedView, env: OpeningEnv) {
  const [plans, models, layout, land, sites, pieces, boxes, look, signs, folk, rail] = await Promise.all([
    import('../../place/opening-plans.ts'),
    import('../../place/opening-models.ts'),
    import('../../place/layout.ts'),
    import('../../place/land.ts'),
    import('../../place/sites.ts'),
    import('../../place/pieces.ts'),
    import('../../render/boxes.ts'),
    import('../../place/look.ts'),
    import('../../place/signs.ts'),
    import('../../place/folk.ts'),
    import('./rail-kit.ts'),
  ]);
  if (!owner.alive) return { update: () => {}, numbers: () => {}, targets: () => [] };
  const footprints = new Set<(typeof sites.feet)[number]>();
  const foot = (x: number, z: number, yaw: number, hw: number, hd: number) => {
    sites.addFoot(x, z, yaw, hw, hd);
    footprints.add(sites.feet[sites.feet.length - 1]!);
  };
  owner.cleanup(() => {
    for (let k = sites.feet.length - 1; k >= 0; k--) if (footprints.has(sites.feet[k]!)) sites.feet.splice(k, 1);
  });
  const buildings = plans.openingBuildings();
  const townBoxes = buildings.flatMap(({ boxes }) => boxes);
  const town = pieces.dropSet(townBoxes, () => {}, owner);
  look.paintSite(town.mesh, townBoxes);
  townBoxes.forEach((_, k) => town.snap(k, true));
  for (const { plan } of buildings) {
    sites.hullBodies(plan, plan.hulls, owner);
    foot(plan.x, plan.z, plan.yaw, plan.hw, plan.hd);
  }
  const forge = plans.forgePlan();
  const scaffold = pieces.dropSet(forge.scaffold, () => {}, owner);
  look.paintSite(scaffold.mesh, forge.scaffold);
  if (look.LOOK.mats)
    owner.cleanup(() => {
      (town.mesh.material as THREE.Material).dispose();
      (scaffold.mesh.material as THREE.Material).dispose();
    });
  forge.scaffold.forEach((_, k) => scaffold.snap(k, true));
  // The poles come down once the forge is roofed (forge-finish.ts); piece 0 is the foundation and stays.
  let polesShown = 0;
  const lowerPoles = (down: number) => {
    polesShown = down;
    for (let k = 1; k < forge.scaffold.length; k++)
      if (down >= 1) scaffold.snap(k, false);
      else if (down <= 0) scaffold.snap(k, true);
      else scaffold.lift(k, -down * down * (plans.HIGH + 3));
  };
  foot(forge.x, forge.z, 0, forge.hw, forge.hd);
  land.addStatic(
    { kind: 'box', hx: (plans.W + 1.6) / 2, hy: 0.25, hz: (plans.D + 1.6) / 2 },
    { x: forge.x, y: forge.y + 0.25, z: forge.z },
    undefined,
    undefined,
    owner,
  );
  const crane = models.craneModel();
  owner.add(crane.crane, crane.rope, crane.hook, crane.crateMesh);
  crane.jib.rotation.y = Math.PI / 2;
  const top = crane.CY + crane.MAST - 0.25,
    hookY = crane.CY + 8;
  crane.rope.position.set(crane.CX + 3, (top + hookY) / 2, crane.CZ);
  crane.rope.scale.y = Math.max(0.2, top - hookY);
  crane.hook.position.set(crane.CX + 3, hookY, crane.CZ);
  land.addStatic(
    { kind: 'box', hx: 0.35, hy: crane.MAST / 2, hz: 0.35 },
    { x: crane.CX, y: crane.CY + crane.MAST / 2, z: crane.CZ },
    undefined,
    undefined,
    owner,
  );
  foot(crane.CX, crane.CZ, 0, 0.6, 0.6);
  const rack = models.rackModel();
  owner.add(rack.rackPosts);
  land.addStatic(
    { kind: 'box', hx: 1.35, hy: 0.45, hz: 1.3 },
    { x: rack.RX, y: rack.RY + 0.45, z: rack.RZ },
    new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rack.yaw),
    undefined,
    owner,
  );
  foot(rack.RX, rack.RZ, 0, 1.5, 1.5);
  const rows = plans.openingStops();
  const stopBoxes = rows.flatMap((row) => {
    const result = boxes.blockBoxes(row, []);
    for (const box of result) box.y = land.H(row.x, row.z);
    return result;
  });
  const stops = pieces.dropSet(stopBoxes, () => {}, owner);
  stopBoxes.forEach((_, k) => stops.snap(k, true));
  for (const row of rows) {
    const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, row.yaw);
    land.addStatic(
      { kind: 'box', hx: row.w / 2, hy: row.h / 2, hz: row.d / 2 },
      { x: row.x, y: land.H(row.x, row.z) + row.y + row.h / 2, z: row.z },
      q,
      undefined,
      owner,
    );
    foot(row.x, row.z, row.yaw, row.w / 2 + 0.2, row.d / 2 + 0.2);
  }
  signs.mountNumbers(owner);
  const line = layout.LINKS[0]!.line;
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  layout.lineAt(line, 19, p);
  const platform = rail.besideLine(line, 19, -2.9),
    gather = rail.besideLine(line, 6, -4.6);
  folk.mountFolk(owner, {
    station: () => (env.awake() ? env.station() : null),
    machineBusy: env.busy,
    chairTaken: env.chairTaken,
    machine: env.machine,
    traffic: env.traffic,
    trainCar: () => null,
    driver: env.driver,
    gather: { x: gather.x, z: gather.z, ux: p.ux, uz: p.uz, lx: p.uz, lz: -p.ux, len: 28 },
    platform: { x: platform.x, y: layout.railY(line, 19) + 0.72, z: platform.z, ux: p.ux, uz: p.uz, up: () => false },
    // The scaffold's two little guys climb down once the poles do (forge-finish.ts); until then the forge is roofless.
    forgeLit: () => forgePoles.down >= 1,
    path: (u, lat) => {
      if (!env.pathOpen()) return null;
      const s = 30 + u * (layout.STUB.camp - 30);
      const at = rail.besideLine(line, s, lat);
      const tangent = layout.lineAt(line, s, { x: 0, z: 0, ux: 0, uz: 1 });
      // Facing the far end, the way `u` grows (until 14 November this faced the village, so every commuter walked
      // backwards; owner playtest).
      return { x: at.x, y: layout.railY(line, s) + 0.2, z: at.z, yaw: Math.atan2(tangent.ux, tangent.uz) };
    },
    cart: () => null,
    hush: env.hush,
  });
  folk.setPopulation(layout.TUNE.people);
  const greeter = await createTownGreeter(owner, env.progress);
  let pathOpen = false;
  let population = -1;
  const people = () => townPopulation(townRead(env.progress.world()));
  return {
    targets: greeter.targets,
    numbers(score: { money: number; logs: number; metres: number }, snapshot = false) {
      signs.setNumbers(score, people(), snapshot);
    },
    update(dt: number) {
      if (forgePoles.down !== polesShown) lowerPoles(forgePoles.down);
      if (population !== people()) folk.setPopulation((population = people()));
      if (pathOpen !== env.pathOpen()) {
        pathOpen = env.pathOpen();
        folk.setCommuters(pathOpen, 14);
      }
      folk.setCamp(0, env.awake());
      greeter.update(dt);
      folk.updateFolk(dt);
    },
  };
}
