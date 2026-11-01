// The wagon's look (?proto=wagon, ./index.ts): greybox boxes and cylinders, all in this one function so an art pass
// replaces it without touching the mechanic. Each car is drawn in its own frame: origin on the ground between the
// rails under the car's centre, +z the way the line runs out (away from the first site), y up. The loco always sits
// at the outbound end of the train (push-pull: it pulls running out and pushes coming back).
import * as THREE from 'three/webgpu';

/** A car's physical size, shared with the platforms: deck half sizes and the deck top's height over the ground. */
export type CarSpec = { hx: number; hz: number; top: number };

export const LOCO: CarSpec = { hx: 0.8, hz: 1.5, top: 1.75 }; // the boiler top: rideable, after a jump
export const TRAILER: CarSpec = { hx: 1.1, hz: 1.6, top: 0.7 }; // a flatbed: a hop up from the ground

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
  const wheels = (g: THREE.Object3D, hz: number, r = 0.32) => {
    const geo = new THREE.CylinderGeometry(r, r, 0.12, 14).rotateZ(Math.PI / 2);
    for (const sx of [-0.5, 0.5]) for (const sz of [-1, 1]) part(g, geo, iron, sx, r + 0.15, sz * (hz - 0.5)); // on the rail heads
  };

  // The loco: a frame, a brass boiler lying along the line, a cab at the back, a tall chimney up front, a cowcatcher.
  const loco = new THREE.Group();
  wheels(loco, LOCO.hz, 0.36);
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

  // A flatbed: a plank deck on a dark frame, low side rails at the ends so you can tell it's a deck.
  const flatbed = (_: unknown, k: number) => {
    const g = new THREE.Group();
    wheels(g, TRAILER.hz, 0.22);
    box(g, TRAILER.hx * 2, 0.18, TRAILER.hz * 2, wood, 0, TRAILER.top - 0.09, 0);
    box(g, TRAILER.hx * 1.6, 0.3, TRAILER.hz * 1.9, black, 0, TRAILER.top - 0.33, 0);
    for (const sz of [-1, 1]) box(g, TRAILER.hx * 2, 0.25, 0.08, wood, 0, TRAILER.top + 0.12, sz * (TRAILER.hz - 0.04));
    // The last flatbed carries freight for the work sites (lashed down: drawn only, you walk through it); the others
    // stay clear to ride.
    if (k === trailers - 1)
      for (const [x, z, sz, yaw, base] of [
        [-0.45, -0.7, 0.7, 0.1, 0],
        [0.4, -0.75, 0.6, -0.2, 0],
        [0, 0.55, 0.8, 0.05, 0],
        [-0.4, -0.7, 0.5, 0.4, 0.7], // stacked on the first
      ]) {
        const c = box(g, sz, sz, sz, crate, x, TRAILER.top + base + sz / 2, z);
        c.rotation.y = yaw;
      }
    return g;
  };
  return { cars: [loco, ...Array.from({ length: trailers }, flatbed)], chimneyTop };
}
