// The soapbox cart in greybox, built as an RC car: a plank tray on springs over four big coconut wheels. Readability
// over truth (docs/proposals/vehicles.md, rule 3): big wheels, a visible gap and struts between them and the body, so
// the suspension reads from the chase camera (research/vehicle-feel.md, RC cars 8).
//
// Two layers: the root is the unsprung frame (on the ground under the physics sphere, facing -z, origin at the static
// axle height), the wheels hang off it at their own heights; `body` is the sprung chassis (heave, pitch, roll) and
// carries the planks and the rider's seat.
import * as THREE from 'three/webgpu';

export const WHEEL_R = 0.5;
export const TRACK = 0.86; // half the distance between left and right wheels
export const AXLE_Z = 0.86; // front axle at -AXLE_Z, rear at +AXLE_Z
export const MOUNT_Y = 0.32; // the struts' tops above the static axle line, chassis frame
export const SEAT = { y: 0.58, z: 0.25 }; // where the rider's feet-sphere centre sits, chassis frame (legs in the tub)
/** The four wheels' mounts in order: front left, front right, rear left, rear right (x, z). */
export const WHEELS: [number, number][] = [
  [-TRACK, -AXLE_Z],
  [TRACK, -AXLE_Z],
  [-TRACK, AXLE_Z],
  [TRACK, AXLE_Z],
];

const plank = new THREE.MeshStandardMaterial({ color: '#d9a35b', roughness: 0.8 });
const trim = new THREE.MeshStandardMaterial({ color: '#c0503a', roughness: 0.7 });
const shell = new THREE.MeshStandardMaterial({ color: '#6b4527', roughness: 0.95 });
const husk = new THREE.MeshStandardMaterial({ color: '#a77b4f', roughness: 1 });
const spring = new THREE.MeshStandardMaterial({ color: '#e8e2d0', roughness: 0.4, metalness: 0.3 });

const trayGeo = new THREE.BoxGeometry(1.2, 0.12, 2.3);
const sideGeo = new THREE.BoxGeometry(0.08, 0.34, 2.1);
const backGeo = new THREE.BoxGeometry(1.2, 0.62, 0.1);
const noseGeo = new THREE.BoxGeometry(1.2, 0.5, 0.5);
const armGeo = new THREE.BoxGeometry(0.34, 0.08, 0.14); // the chassis' outrigger each strut hangs from
const wheelGeo = new THREE.SphereGeometry(WHEEL_R, 16, 12);
const capGeo = new THREE.CircleGeometry(WHEEL_R * 0.42, 10);
const strutGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 8); // scaled to the strut's length each frame
strutGeo.translate(0, -0.5, 0); // hangs down from its top

/** A cart and the parts that move: the sprung body, the wheels (front ones steer), the struts. */
export type Cart = THREE.Group & {
  userData: { body: THREE.Group; wheels: THREE.Group[]; spins: THREE.Group[]; struts: THREE.Mesh[]; spin: number };
};
/** The chassis' offset from rest in the cart frame: heave (m, up), pitch (rad, nose up), roll (rad, right side up). */
export type Ride = { heave: number; pitch: number; roll: number };

function wheel(x: number) {
  const steer = new THREE.Group(); // turns about y (front ones); holds the spinning part
  const spin = new THREE.Group();
  const nut = new THREE.Mesh(wheelGeo, shell);
  nut.scale.set(0.66, 1, 1); // a coconut on its side
  nut.castShadow = true;
  const cap = new THREE.Mesh(capGeo, husk); // the pale husk end, so you can see it spin
  cap.position.x = Math.sign(x) * WHEEL_R * 0.67;
  cap.position.y = WHEEL_R * 0.25;
  cap.rotation.y = (Math.sign(x) * Math.PI) / 2;
  spin.add(nut, cap);
  steer.add(spin);
  return { steer, spin };
}

export function makeCart(): Cart {
  const cart = new THREE.Group() as Cart;
  const body = new THREE.Group();
  const tray = new THREE.Mesh(trayGeo, plank);
  tray.position.y = 0.28;
  const sides = [-1, 1].map((s) => {
    const side = new THREE.Mesh(sideGeo, plank);
    side.position.set(s * 0.56, 0.5, 0.05);
    return side;
  });
  const back = new THREE.Mesh(backGeo, trim);
  back.position.set(0, 0.63, 1.1);
  back.rotation.x = -0.25;
  const nose = new THREE.Mesh(noseGeo, trim); // a wedge-ish bonnet, so the front reads from behind
  nose.position.set(0, 0.5, -0.95);
  nose.rotation.x = 0.35;
  const arms = WHEELS.map(([x, z]) => {
    const arm = new THREE.Mesh(armGeo, trim);
    arm.position.set(x * 0.82, MOUNT_Y, z);
    return arm;
  });
  for (const m of [tray, ...sides, back, nose, ...arms]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  body.add(tray, ...sides, back, nose, ...arms);
  cart.add(body);
  const wheels: THREE.Group[] = [];
  const spins: THREE.Group[] = [];
  const struts: THREE.Mesh[] = [];
  for (const [x, z] of WHEELS) {
    const w = wheel(x);
    w.steer.position.set(x, 0, z);
    cart.add(w.steer);
    wheels.push(w.steer);
    spins.push(w.spin);
    const s = new THREE.Mesh(strutGeo, spring);
    s.castShadow = true;
    cart.add(s);
    struts.push(s);
  }
  cart.userData = { body, wheels, spins, struts, spin: 0 };
  return cart;
}

const REST: Ride = { heave: 0, pitch: 0, roll: 0 };
const top = new THREE.Vector3();
const UPV = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();

const euler = new THREE.Euler();
/** Where a chassis point (x, y, z) is in the cart frame, for `ride`. */
export function chassisPoint(out: THREE.Vector3, ride: Ride, x: number, y: number, z: number) {
  out.set(x, y, z).applyEuler(euler.set(ride.pitch, 0, ride.roll, 'YXZ'));
  out.y += ride.heave;
  return out;
}

/**
 * Pose the cart: the front wheels' angle (radians, + is left), roll the wheels by `dist` metres, the chassis' `ride`
 * and each wheel's height in the cart frame (`drops`, 0 at rest; omitted: all at rest).
 */
export function poseCart(cart: Cart, steer: number, dist: number, ride: Ride = REST, drops?: number[]) {
  const u = cart.userData;
  u.spin -= dist / WHEEL_R;
  u.body.position.set(0, ride.heave, 0);
  u.body.rotation.set(ride.pitch, 0, ride.roll, 'YXZ');
  for (let i = 0; i < 4; i++) {
    const w = u.wheels[i];
    w.position.y = drops ? drops[i] : 0;
    w.rotation.y = i < 2 ? steer : 0;
    u.spins[i].rotation.x = u.spin;
    // the strut: from the chassis' outrigger down to the wheel's hub, inboard of the tyre
    const [x, z] = WHEELS[i];
    chassisPoint(top, ride, x * 0.82, MOUNT_Y, z);
    const s = u.struts[i];
    s.position.copy(top);
    dir.set(x * 0.82, w.position.y, z).sub(top);
    const len = Math.max(0.05, dir.length());
    s.scale.set(1, len, 1);
    s.quaternion.setFromUnitVectors(UPV, dir.multiplyScalar(-1 / len));
  }
}
