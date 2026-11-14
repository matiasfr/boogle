// Existing forge scenery, without cargo, jobs, saves or module-time scene ownership.
import * as THREE from 'three/webgpu';
import { flat } from '../render/flat.ts';
import { H } from './land.ts';
import { CRANE, ORIGIN, RACK } from './layout.ts';
import { WOOD2 } from './opening-plans.ts';
export function craneModel() {
  const MAST = 13;
  const CX = CRANE.x + ORIGIN.x,
    CZ = CRANE.z + ORIGIN.z,
    CY = H(CX, CZ);
  const crane = new THREE.Group();
  crane.position.set(CX, CY, CZ);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.7, MAST, 0.7), flat('#d9a03a'));
  pole.name = 'crane/support-pole';
  pole.position.y = MAST / 2;
  pole.castShadow = true;
  const jib = new THREE.Group();
  jib.position.y = MAST;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 19), flat('#e0b04a'));
  arm.position.z = 7.5;
  arm.castShadow = true;
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.6), flat('#3a302c'));
  counter.position.set(0, -0.3, -2);
  jib.add(arm, counter);
  crane.add(pole, jib);
  const rope = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), flat('#2a2a2e'));
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.34), flat('#2a2a2e'));
  const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.82, 0.82), flat('#a8703a', 0.85));
  crateMesh.castShadow = true;
  crateMesh.visible = false;

  return { MAST, CX, CY, CZ, crane, jib, rope, hook, crateMesh };
}
export function rackModel() {
  const RX = RACK.x + ORIGIN.x,
    RZ = RACK.z + ORIGIN.z,
    RY = H(RX, RZ);
  const rackPosts = new THREE.Group();
  rackPosts.position.set(RX, RY, RZ);
  rackPosts.rotation.y = RACK.yaw;
  for (const dz of [-1.2, 1.2])
    for (const dx of [-1.25, 1.25]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.2), flat(WOOD2));
      m.name = 'rack/support-post';
      m.position.set(dx, 0.9, dz);
      m.castShadow = true;
      rackPosts.add(m);
    }
  for (const dz of [-1.2, 1.2]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.14, 0.2), flat(WOOD2));
    m.position.set(0, 0.32, dz);
    rackPosts.add(m);
  }
  return { RX, RY, RZ, yaw: RACK.yaw, rackPosts };
}
