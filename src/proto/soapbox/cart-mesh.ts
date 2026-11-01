// The soapbox cart in greybox: a plank tray, a seat back, a nose board and four coconut wheels. Readability over truth
// (docs/proposals/vehicles.md, rule 3): big wheels, bright plank. Origin at the axle line's centre, facing -z.
import * as THREE from 'three/webgpu';

export const WHEEL_R = 0.42;
export const TRACK = 0.8; // half the distance between left and right wheels
export const AXLE_Z = 0.86; // front axle at -AXLE_Z, rear at +AXLE_Z
export const SEAT = { y: 0.5, z: 0.25 }; // where the rider's feet-sphere centre sits, cart frame (legs in the tub)

const plank = new THREE.MeshStandardMaterial({ color: '#d9a35b', roughness: 0.8 });
const trim = new THREE.MeshStandardMaterial({ color: '#c0503a', roughness: 0.7 });
const shell = new THREE.MeshStandardMaterial({ color: '#6b4527', roughness: 0.95 });
const husk = new THREE.MeshStandardMaterial({ color: '#a77b4f', roughness: 1 });

const trayGeo = new THREE.BoxGeometry(1.2, 0.12, 2.3);
const sideGeo = new THREE.BoxGeometry(0.08, 0.34, 2.1);
const backGeo = new THREE.BoxGeometry(1.2, 0.62, 0.1);
const noseGeo = new THREE.BoxGeometry(1.2, 0.5, 0.5);
const axleGeo = new THREE.CylinderGeometry(0.04, 0.04, TRACK * 2 + 0.1, 6);
const wheelGeo = new THREE.SphereGeometry(WHEEL_R, 14, 10);
const capGeo = new THREE.CircleGeometry(WHEEL_R * 0.42, 10);

/** A cart and the parts that move: the front axle steers, wheels spin. */
export type Cart = THREE.Group & {
  userData: { front: THREE.Group; wheels: THREE.Group[]; spin: number };
};

function wheel(x: number) {
  const g = new THREE.Group();
  const nut = new THREE.Mesh(wheelGeo, shell);
  nut.scale.set(0.62, 1, 1); // a coconut on its side
  nut.castShadow = true;
  const cap = new THREE.Mesh(capGeo, husk); // the pale husk end, so you can see it spin
  cap.position.x = Math.sign(x) * WHEEL_R * 0.63;
  cap.position.y = WHEEL_R * 0.25;
  cap.rotation.y = (Math.sign(x) * Math.PI) / 2;
  g.add(nut, cap);
  g.position.x = x;
  return g;
}

export function makeCart(): Cart {
  const cart = new THREE.Group() as Cart;
  const tray = new THREE.Mesh(trayGeo, plank);
  tray.position.y = 0.2;
  const sides = [-1, 1].map((s) => {
    const side = new THREE.Mesh(sideGeo, plank);
    side.position.set(s * 0.56, 0.42, 0.05);
    return side;
  });
  const back = new THREE.Mesh(backGeo, trim);
  back.position.set(0, 0.55, 1.1);
  back.rotation.x = -0.25;
  const nose = new THREE.Mesh(noseGeo, trim); // a wedge-ish bonnet, so the front reads from behind
  nose.position.set(0, 0.42, -0.95);
  nose.rotation.x = 0.35;
  for (const m of [tray, ...sides, back, nose]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  cart.add(tray, ...sides, back, nose);
  const wheels: THREE.Group[] = [];
  const front = new THREE.Group();
  front.position.z = -AXLE_Z;
  const rear = new THREE.Group();
  rear.position.z = AXLE_Z;
  for (const axle of [front, rear]) {
    const bar = new THREE.Mesh(axleGeo, shell);
    bar.rotation.z = Math.PI / 2;
    axle.add(bar);
    for (const x of [-TRACK, TRACK]) {
      const w = wheel(x);
      axle.add(w);
      wheels.push(w);
    }
    cart.add(axle);
  }
  cart.userData = { front, wheels, spin: 0 };
  return cart;
}

/** Steer the front axle (radians, + is left) and roll the wheels by `dist` metres. */
export function poseCart(cart: Cart, steer: number, dist: number) {
  const u = cart.userData;
  u.front.rotation.y = steer;
  u.spin -= dist / WHEEL_R;
  for (const w of u.wheels) w.rotation.x = u.spin;
}
