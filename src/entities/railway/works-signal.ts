// The room's current works, seen from across the railway. Local, with no collider or sound.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { material } from '../../render/materials.ts';
import { GOLD_ROPE } from '../../render/gold-rope.ts';
import { H } from '../../place/terrain.ts';
import type { IslandGround } from '../ring-island/ground.ts';
import { RING_HALT } from '../../sim/railway-ring-layout.ts';
import { reducedMotion } from '../../constants.ts';
import type { RoomWorks } from '../../sim/railway-queries-room.ts';
import { PLUME, STEAM } from './forge-call.ts';

// Use the dock landing and the halt's step-down platform. Heights below are eye elevations.
const eyes = [
  { x: 801, y: 4.6, z: 10 },
  {
    x: RING_HALT.down.x / 100,
    y: RING_HALT.down.y / 100 + 1.6,
    z: RING_HALT.down.z / 100,
  },
];
function columnHeight(at: THREE.Vector3, island: IslandGround) {
  let height: number = PLUME.height;
  for (const eye of eyes) {
    const dx = at.x + PLUME.lean - eye.x,
      dz = at.z - eye.z;
    const count = Math.ceil(Math.hypot(dx, dz) / 2);
    for (let i = 1; i < count; i++) {
      const t = i / count,
        x = eye.x + t * dx,
        z = eye.z + t * dz;
      const ground = Math.max(H(x, z), island.islandH(x, z));
      height = Math.max(height, eye.y + (ground - eye.y) / t + 20 - at.y - 2);
      if (height >= 200) return 200;
    }
  }
  return Math.ceil(height);
}

export function createPennant(owner: OwnedView) {
  const flag = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 6, 6), material('timber'));
  mast.position.y = 3;
  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute('position', new THREE.Float32BufferAttribute([0, 6, 0, 0, 4.65, 0, 2.65, 5.55, 0.28], 3));
  cloth.computeVertexNormals();
  flag.add(mast, new THREE.Mesh(cloth, material('paintedToy', { colour: GOLD_ROPE, sidedness: 'double' })));
  owner.add(flag);
  return flag;
}

export function createWorksSignal(owner: OwnedView, island: IslandGround) {
  const flag = createPennant(owner);
  flag.name = 'railway:works-pennant';
  flag.visible = false;
  const steam = material('stone', { colour: `#${STEAM.getHexString()}` }).clone();
  steam.fog = false;
  owner.cleanup(() => steam.dispose());
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), steam, PLUME.thick * 2);
  mesh.frustumCulled = false;
  mesh.count = 0;
  owner.add(mesh);
  const puff = new THREE.Object3D();
  const previous = new THREE.Vector3();
  let site: RoomWorks['site'] | null = null,
    elapsed = 2,
    clock = 0,
    plume = false,
    fading = false;
  let height = 0,
    oldHeight = 0;
  function draw(at: THREE.Vector3, scale: number, rise: number) {
    for (let i = 0; i < PLUME.thick; i++) {
      const u = (clock / PLUME.rise + i / PLUME.thick) % 1;
      const up = 1 - (1 - u) ** 2;
      const r = scale * (1.2 + u * 6) * Math.min(1, u * 8, (1 - u) * 3.5);
      puff.position.set(
        at.x + up * PLUME.lean + Math.sin(i * 2.1 + clock * 0.7) * u * 0.5,
        at.y + 2 + up * rise,
        at.z + Math.cos(i * 1.7 + clock * 0.5) * u * 0.5,
      );
      puff.rotation.y = i * 1.3;
      puff.scale.set(r, 0.85 * r, r);
      puff.updateMatrix();
      mesh.setMatrixAt(mesh.count++, puff.matrix);
    }
  }
  return (work: RoomWorks, forgeCalling: boolean, dt: number, restore = false) => {
    const { x, y, z } = work.at;
    const ground = y ? y / 100 : H(x / 100, z / 100);
    if (
      site !== work.site ||
      restore ||
      flag.position.x !== x / 100 ||
      flag.position.z !== z / 100 ||
      flag.position.y !== ground
    ) {
      previous.copy(flag.position);
      oldHeight = height;
      flag.position.set(x / 100, ground, z / 100);
      height = columnHeight(flag.position, island);
      fading = plume && !restore;
      elapsed = restore || site === null ? 2 : 0;
      site = work.site;
    }
    flag.visible = !work.done;
    plume = flag.visible && !forgeCalling;
    elapsed = Math.min(2, elapsed + dt);
    clock += dt * (reducedMotion ? 0.3 : 1);
    mesh.count = 0;
    if (fading && elapsed < 2 && flag.visible) draw(previous, 1 - elapsed / 2, oldHeight);
    if (plume) draw(flag.position, elapsed / 2, height * (elapsed / 2));
    mesh.instanceMatrix.needsUpdate = true;
  };
}
