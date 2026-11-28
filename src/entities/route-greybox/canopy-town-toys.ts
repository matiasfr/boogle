import * as THREE from 'three/webgpu';
import { me } from '../../player/state.ts';
import type { OwnedView } from '../../render/owned-view.ts';

export function createCanopyToys(
  owner: OwnedView,
  point: (u: number, l: number, y: number) => THREE.Vector3,
  yaw: number,
) {
  const net = new THREE.Group(),
    chime = new THREE.Group(),
    rings = new THREE.Group();
  for (const root of [net, chime, rings]) {
    root.position.copy(point(0, 0, 0));
    root.rotation.y = yaw;
  }
  const materials = [0x795039, 0xedd097, 0x299588, 0xe5b344, 0xe27847].map(
    (color) => new THREE.MeshStandardMaterial({ color }),
  );
  const [wood, fibre, teal, brass, orange] = materials;
  function piece(
    root: THREE.Group,
    geometry: THREE.BufferGeometry,
    material: THREE.Material | undefined,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  }
  // Two crossing sets of twine and a timber perimeter on the open porch.
  for (const side of [-1, 1]) {
    piece(net, new THREE.BoxGeometry(2.4, 0.14, 0.11), wood, 0, 0.21, 3.18 + side * 0.67);
    piece(net, new THREE.BoxGeometry(0.11, 0.14, 1.45), wood, side * 1.15, 0.21, 3.18);
  }
  for (let i = -5; i <= 5; i++) piece(net, new THREE.BoxGeometry(0.045, 0.06, 1.32), fibre, i * 0.21, 0.22, 3.18);
  for (let i = -3; i <= 3; i++) piece(net, new THREE.BoxGeometry(2.25, 0.05, 0.045), teal, 0, 0.24, 3.18 + i * 0.19);
  for (let i = 0; i < 3; i++) {
    const hoop = new THREE.Group();
    hoop.position.set(6 + i * 6, 8 - i * 2, 3);
    hoop.rotation.y = Math.PI / 2;
    rings.add(hoop);
    piece(hoop, new THREE.TorusGeometry(1.55, 0.09, 8, 40), fibre, 0, 0, 0);
    for (let flag = 0; flag < 12; flag++) {
      const a = (flag * Math.PI) / 6;
      const pennant = piece(
        hoop,
        new THREE.ConeGeometry(0.23, 0.58, 3),
        flag % 2 ? teal : orange,
        1.82 * Math.sin(a),
        1.82 * Math.cos(a),
        0,
      );
      pennant.rotation.z = -a;
    }
  }
  for (const side of [-1, 1]) piece(chime, new THREE.CylinderGeometry(0.15, 0.19, 3.5, 8), wood, side * 1.65, 4.7, 0);
  piece(chime, new THREE.BoxGeometry(3.8, 0.22, 0.3), wood, 0, 6.4, 0);
  const pipes = new THREE.Group();
  pipes.position.y = 6.3;
  chime.add(pipes);
  for (let i = 0; i < 5; i++) {
    const h = 1.25 + i * 0.22,
      x = (i - 2) * 0.61;
    piece(pipes, new THREE.CylinderGeometry(0.025, 0.025, 0.45, 5), fibre, x, -0.225, 0);
    piece(pipes, new THREE.CylinderGeometry(0.16, 0.16, h, 12), i % 2 ? brass : fibre, x, -0.45 - h / 2, 0);
  }
  piece(chime, new THREE.CylinderGeometry(0.035, 0.035, 2.15, 8), fibre, 0, 1.86, 0);
  piece(chime, new THREE.SphereGeometry(0.17, 12, 8), brass, 0, 0.82, 0);
  const motes = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const leaf = piece(motes, new THREE.OctahedronGeometry(0.19), i % 2 ? brass : teal, Math.cos(a), 0, Math.sin(a));
    leaf.scale.set(0.6, 1.6, 0.5);
  }
  chime.add(motes);
  owner.add(net, chime, rings);
  owner.cleanup(() => materials.forEach((m) => m.dispose()));
  const pad = point(0, 3.18, 0.08);
  return {
    update(active: number, preview: number, ageMs: number) {
      net.visible = rings.visible = active === 10 || preview === 10;
      chime.visible = active === 11 || preview === 11;
      const body = me.body;
      if (active === 10 && body && body.velocity.y <= 0 && body.position.y >= pad.y && body.position.y < pad.y + 0.75) {
        const dx = body.position.x - pad.x,
          dz = body.position.z - pad.z;
        if (
          Math.abs(dx * Math.cos(yaw) - dz * Math.sin(yaw)) < 1.1 &&
          Math.abs(dx * Math.sin(yaw) + dz * Math.cos(yaw)) < 0.65
        ) {
          body.velocity.y = 20;
          me.coyote = 0;
        }
      }
      motes.visible = active === 11 && ageMs < 3000;
      if (motes.visible) {
        const t = ageMs / 1000;
        motes.position.set(-t * 2, 5 + t * 4, 0);
        motes.scale.setScalar(1 + t);
        motes.rotation.y = t;
      }
      pipes.rotation.z = ageMs < 3000 ? 0.18 * Math.sin(ageMs / 125) * Math.exp(-ageMs / 800) : 0;
    },
  };
}
