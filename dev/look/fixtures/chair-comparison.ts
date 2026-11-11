// Authored fixture in the real renderer. The baseline is seatMesh from 1b19093f's four-box recipe;
// the candidate calls the production factory. Frozen shots switch visibility, not simulation time.
import * as THREE from 'three/webgpu';
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { seatMesh } = (await import(
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');
const { flat } = (await import('/src/render/flat.ts' as string)) as typeof import('../../../src/render/flat.ts');
const { bind } = (await import(
  '/src/render/water/live.ts' as string
)) as typeof import('../../../src/render/water/live.ts');
// Hide world meshes only for this authored close-up; retain the real lights, sky and output pipeline.
for (const child of scene.children) if (!(child instanceof THREE.Light)) child.visible = false;
const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 10), flat('#bdb8ac'));
const origin = me.body!.position;
floor.position.copy(origin);
floor.position.y -= 0.05;
floor.receiveShadow = true;
scene.add(floor);
const before = new THREE.Group();
for (const [x, y, z, w, h, d, color] of [
  [0, 0.49, 0, 0.8, 0.12, 0.65, '#bd8a50'],
  [0, 0.95, -0.3, 0.8, 0.8, 0.12, '#56847b'],
  [-0.3, 0.23, 0, 0.12, 0.46, 0.55, '#bd8a50'],
  [0.3, 0.23, 0, 0.12, 0.46, 0.55, '#bd8a50'],
] as const) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  before.add(mesh);
}
const after = seatMesh();
before.position.copy(origin);
after.position.copy(origin);
scene.add(before, after);
let choice = 0;
bind(
  'comparison.chair',
  () => choice,
  (value) => {
    choice = value as number;
    before.visible = choice === 0;
    after.visible = choice === 1;
  },
);
after.visible = false;
export {};
