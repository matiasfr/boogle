// The room's current works, seen from across the railway. Local, with no collider or sound.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { material } from '../../render/materials.ts';
import { GOLD_ROPE } from '../../render/gold-rope.ts';
import { H } from '../../place/terrain.ts';
import { reducedMotion } from '../../constants.ts';
import type { RoomWorks } from '../../sim/railway-queries-room.ts';
import { PLUME, STEAM } from './forge-call.ts';

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

export function createWorksSignal(owner: OwnedView) {
  const flag = createPennant(owner);
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
  function draw(at: THREE.Vector3, scale: number) {
    for (let i = 0; i < PLUME.thick; i++) {
      const u = (clock / PLUME.rise + i / PLUME.thick) % 1;
      const up = 1 - (1 - u) ** 2;
      const r = scale * (1.2 + u * 6) * Math.min(1, u * 8, (1 - u) * 3.5);
      puff.position.set(
        at.x + up * PLUME.lean + Math.sin(i * 2.1 + clock * 0.7) * u * 0.5,
        at.y + 2 + up * PLUME.height,
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
    if (site !== work.site || restore) {
      previous.copy(flag.position);
      fading = plume && !restore;
      elapsed = restore || site === null ? 2 : 0;
      site = work.site;
    }
    flag.position.set(x / 100, y ? y / 100 : H(x / 100, z / 100), z / 100);
    flag.visible = !work.done;
    plume = flag.visible && !forgeCalling;
    elapsed = Math.min(2, elapsed + dt);
    clock += dt * (reducedMotion ? 0.3 : 1);
    mesh.count = 0;
    if (fading && elapsed < 2 && flag.visible) draw(previous, 1 - elapsed / 2);
    if (plume) draw(flag.position, elapsed / 2);
    mesh.instanceMatrix.needsUpdate = true;
  };
}
