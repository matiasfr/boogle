// The wagon's look (?proto=wagon, ./index.ts): greybox boxes and cylinders, all in this one function so an art pass
// replaces it without touching the mechanic. Each car is drawn in its own frame: origin on the ground between the
// rails under the car's centre, +z the way the line runs out (away from the first site), y up. The loco always sits
// at the outbound end of the train (push-pull: it pulls running out and pushes coming back).
// It moves itself too (procedural-animation research, rec 5): the wheels turn with the distance each car covers, the
// loco's side rods, connecting rods and pistons follow its wheel angle, and the cars shuffle on a little buffer slack
// when the train speeds up or slows down. All of it is derived from where ./index.ts put the cars this frame, which is
// a function of the shared tick, so every tab draws the same. Local, cosmetic.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { reducedMotion } from '../../constants.ts';
import { clamp } from '../../math.ts';
import { damp, springStep, stiffnessOf, dampingOf, type Spring } from '../../render/motion.ts';

/** A car's physical size, shared with the platforms: deck half sizes and the deck top's height over the ground. */
export type CarSpec = { hx: number; hz: number; top: number };

export const LOCO: CarSpec = { hx: 0.8, hz: 1.5, top: 1.75 }; // the boiler top: rideable, after a jump
export const TRAILER: CarSpec = { hx: 1.1, hz: 1.6, top: 0.7 }; // a flatbed: a hop up from the ground

/** The freight on the last flatbed: centre x, z on the deck, size, yaw, and how high its bottom sits over the deck. */
export const CRATES = [
  { x: -0.45, z: -0.7, sz: 0.7, yaw: 0.1, base: 0 },
  { x: 0.4, z: -0.75, sz: 0.6, yaw: -0.2, base: 0 },
  { x: 0, z: 0.55, sz: 0.8, yaw: 0.05, base: 0 },
  { x: -0.4, z: -0.7, sz: 0.5, yaw: 0.4, base: 0.7 }, // stacked on the first
];

export type WagonLook = { cars: THREE.Object3D[]; chimneyTop: THREE.Object3D };

/** Builds one loco and `trailers` flatbeds, in train order from the outbound end. */
export function wagonLook(trailers: number): WagonLook {
  const mat = (color: string, metal = 0) =>
    new THREE.MeshStandardNodeMaterial({ color, roughness: metal ? 0.45 : 0.85, metalness: metal });
  const brass = mat('#c9a24a', 0.6),
    iron = mat('#33343a', 0.5),
    red = mat('#c8452f'),
    wood = mat('#9a7b55'),
    crate = mat('#c08a4a'),
    black = mat('#1e1e22', 0.3);
  const part = (g: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const box = (
    g: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => part(g, new THREE.BoxGeometry(w, h, d), m, x, y, z);
  // Each wheel gets a spoke bar across its face, so you can see it turn.
  const spoke = new THREE.BoxGeometry(0.02, 1, 0.08);
  const wheels = (g: THREE.Object3D, hz: number, r = 0.32) => {
    const geo = new THREE.CylinderGeometry(r, r, 0.12, 14).rotateZ(Math.PI / 2);
    const list: THREE.Mesh[] = [];
    for (const sx of [-0.5, 0.5])
      for (const sz of [-1, 1]) {
        const w = part(g, geo, iron, sx, r + 0.15, sz * (hz - 0.5)); // on the rail heads
        const bar = new THREE.Mesh(spoke, brass);
        bar.scale.y = r * 1.7;
        bar.position.x = sx * 0.13;
        w.add(bar);
        list.push(w);
      }
    return list;
  };

  // The loco: a frame, a brass boiler lying along the line, a cab at the back, a tall chimney up front, a cowcatcher.
  const loco = new THREE.Group();
  const locoWheels = wheels(loco, LOCO.hz, 0.36);
  box(loco, LOCO.hx * 2, 0.2, LOCO.hz * 2, black, 0, 0.7, 0);
  const boiler = part(loco, new THREE.CylinderGeometry(0.55, 0.55, 2, 16).rotateX(Math.PI / 2), brass, 0, 1.2, 0.35);
  boiler.castShadow = true;
  box(loco, 1.5, 1.2, 0.9, red, 0, 1.35, -1.05); // cab
  box(loco, 1.7, 0.1, 1.1, black, 0, 2.0, -1.05); // cab roof
  part(loco, new THREE.CylinderGeometry(0.2, 0.15, 0.8, 12), black, 0, 1.95, 1.05); // chimney
  part(loco, new THREE.CylinderGeometry(0.3, 0.2, 0.15, 12), black, 0, 2.38, 1.05); // its flared lip
  box(loco, 1.4, 0.35, 0.25, red, 0, 0.5, LOCO.hz + 0.05); // buffer beam
  const chimneyTop = new THREE.Object3D();
  chimneyTop.position.set(0, 2.5, 1.05);
  loco.add(chimneyTop);
  // The motion work, on each side: a cylinder ahead of the front wheel, a piston rod and crosshead sliding out of it, a
  // connecting rod from the crosshead to the front wheel's crank pin, and a side rod joining the two wheels' pins.
  const gear = [-1, 1].map((side) => {
    const x = side * (0.5 + 0.06);
    part(loco, new THREE.CylinderGeometry(0.1, 0.1, 0.3, 10).rotateX(Math.PI / 2), black, x + side * 0.18, AXLE, 1.56);
    return {
      side,
      siderod: box(loco, 0.04, 0.07, ROD.wheelbase + 0.14, red, x + side * 0.04, AXLE, 0),
      conrod: box(loco, 0.04, 0.06, ROD.con, brass, x + side * 0.1, AXLE, 0),
      crosshead: box(loco, 0.06, 0.1, 0.1, brass, x + side * 0.18, AXLE, 0),
      piston: box(loco, 0.03, 0.03, 0.28, brass, x + side * 0.18, AXLE, 0),
    };
  });

  // A flatbed: a plank deck on a dark frame, low side rails at the ends so you can tell it's a deck.
  const trailerWheels: THREE.Mesh[][] = [];
  const flatbed = (_: unknown, k: number) => {
    const g = new THREE.Group();
    trailerWheels.push(wheels(g, TRAILER.hz, 0.22));
    box(g, TRAILER.hx * 2, 0.18, TRAILER.hz * 2, wood, 0, TRAILER.top - 0.09, 0);
    box(g, TRAILER.hx * 1.6, 0.3, TRAILER.hz * 1.9, black, 0, TRAILER.top - 0.33, 0);
    for (const sz of [-1, 1]) box(g, TRAILER.hx * 2, 0.25, 0.08, wood, 0, TRAILER.top + 0.12, sz * (TRAILER.hz - 0.04));
    // The last flatbed carries freight for the work sites (solid: ./index.ts gives each crate a collider); the others
    // stay clear to ride.
    if (k === trailers - 1)
      for (const { x, z, sz, yaw, base } of CRATES) {
        const c = box(g, sz, sz, sz, crate, x, TRAILER.top + base + sz / 2, z);
        c.rotation.y = yaw;
      }
    return g;
  };
  const bodies = [loco, ...Array.from({ length: trailers }, flatbed)];
  // Each car's parts sit in an inner group the buffer slack slides; ./index.ts poses the outer one.
  const cars = bodies.map((inner) => {
    const outer = new THREE.Group();
    outer.add(inner);
    return outer;
  });
  animate(cars, bodies, [locoWheels, ...trailerWheels], gear);
  return { cars, chimneyTop };
}

// ---------------------------------------------------------------- motion
const AXLE = 0.36 + 0.15; // the loco's axle height over the ground
const ROD = {
  crank: 0.12, // m from a wheel's centre to its crank pin
  con: 0.32, // m, the connecting rod
  wheelbase: 2 * (LOCO.hz - 0.5), // between the loco's two axles
};
const SLACK = {
  perAccel: 0.15, // m a coupling stretches per m/s² of the train's speeding up
  max: 0.3,
  hz: 1.8, // how fast the cars shuffle back
  zeta: 0.3,
};
type Gear = { side: number; siderod: THREE.Mesh; conrod: THREE.Mesh; crosshead: THREE.Mesh; piston: THREE.Mesh };

function animate(cars: THREE.Object3D[], bodies: THREE.Object3D[], wheelSets: THREE.Mesh[][], gear: Gear[]): void {
  const radius = wheelSets.map((ws) => (ws[0].geometry as THREE.CylinderGeometry).parameters.radiusTop);
  const angle = cars.map(() => 0);
  const last = cars.map(() => new THREE.Vector3(NaN, 0, 0));
  const slack: Spring[] = cars.map(() => ({ x: 0, v: 0 }));
  let speed = 0,
    accel = 0;
  const k = stiffnessOf(SLACK.hz),
    d = dampingOf(SLACK.hz, SLACK.zeta);
  onFrame(
    ({ dt }) => {
      if (dt <= 0) return;
      cars.forEach((car, n) => {
        const at = car.parent?.position;
        if (!at || !car.parent!.visible) return void last[n].set(NaN, 0, 0);
        const yaw = car.parent!.rotation.y;
        // the distance covered along the car's own +z (a jump of metres is a reset: don't spin)
        const dx = at.x - last[n].x,
          dz = at.z - last[n].z;
        const ds = Math.abs(dx) + Math.abs(dz) < 2 ? dx * Math.sin(yaw) + dz * Math.cos(yaw) : 0;
        last[n].copy(at);
        angle[n] += ds / radius[n];
        for (const w of wheelSets[n]) w.rotation.x = angle[n];
        if (n === 0) {
          const v = damp(speed, ds / dt, 0.05, dt);
          accel = damp(accel, (v - speed) / dt, 0.08, dt);
          speed = v;
        }
      });
      // The loco's rods: crank pins on the right side lead the left by a quarter turn.
      for (const g of gear) {
        const th = angle[0] + (g.side > 0 ? Math.PI / 2 : 0);
        const py = AXLE + ROD.crank * Math.cos(th),
          pz = ROD.crank * Math.sin(th); // a pin's offset from its wheel's centre (rotation about +x)
        const front = ROD.wheelbase / 2;
        g.siderod.position.set(g.siderod.position.x, py, pz);
        // the crosshead stays on the axle line; the connecting rod spans pin to crosshead
        const dy = AXLE - py,
          cz = front + pz + Math.sqrt(ROD.con * ROD.con - dy * dy);
        g.crosshead.position.z = cz;
        g.piston.position.z = cz + 0.14;
        g.conrod.position.set(g.conrod.position.x, (py + AXLE) / 2, (front + pz + cz) / 2);
        g.conrod.rotation.x = Math.atan2(-dy, cz - front - pz);
      }
      // Buffer slack: each coupling stretches with the train's acceleration, on a bouncy spring, so a start or a stop
      // ripples down the train. The loco leads; car n trails by n couplings.
      bodies.forEach((b, n) => {
        if (!n) return;
        const goal = reducedMotion ? 0 : clamp(-accel * SLACK.perAccel * n, -SLACK.max, SLACK.max);
        springStep(slack[n], goal, k, d, dt);
        b.position.z = slack[n].x;
      });
    },
    { phase: 'update', order: 8 }, // after ./index.ts places the cars (order 6)
  );
}
