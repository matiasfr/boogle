// npm run look -- --rail-seed boiler-long --eval dev/look/evals/home-coach-train.ts --query 'coachAfter=1&coachCamera=island' --until window.__placeDone
// Inspection-only clones of production meshes; never writes the published world or physics poses.
import type * as Three from 'three/webgpu';
const threeUrl = /from\s+"([^"]*three_webgpu[^"]*)"/.exec(await (await fetch('/src/render/scene.ts')).text())?.[1];
if (!threeUrl) throw new Error('three module URL missing');
const THREE = (await import(threeUrl)) as typeof Three;
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { inspectRailway, rw, train } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const home = (await import(
  '/src/place/home-station.ts' as string
)) as typeof import('../../../src/place/home-station.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const { trainPlaces, deckAt, ENGINE_BUFFERS, CAR_BUFFERS } = (await import(
  '/src/entities/railway/car-spacing.ts' as string
)) as typeof import('../../../src/entities/railway/car-spacing.ts');
const { ENGINE } = (await import(
  '/src/entities/railway/engine.ts' as string
)) as typeof import('../../../src/entities/railway/engine.ts');
const { TRAIN_OFFSETS } = (await import(
  '/src/entities/railway/cars.ts' as string
)) as typeof import('../../../src/entities/railway/cars.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
await wait(2000);
const view = inspectRailway()!.line2View;
const slot = view.trains.findIndex((t) => t.line === 1 && t.wagon && t.longBoiler);
if (slot < 0) throw new Error('No actual wagon-bearing long-boiler train');
const source = view.trains[slot]!;
if (!train(rw(), slot).wagon || source.cars.length !== 5) throw new Error('Longest consist not present');
const q = new URLSearchParams(location.search),
  after = q.has('coachAfter');
const stop = after ? 21.65 : 18.25;
const offsets = after ? [TRAIN_OFFSETS[0]!, 0, -3.55, -7.1, -10.8, -14.5] : [TRAIN_OFFSETS[0]!, 0, -3.7, -7.4, -11.1];
const at = (s: number, out: { x: number; z: number }) =>
  Object.assign(out, layout.lineSmoothAt(layout.LINES.east, s, { x: 0, z: 0, ux: 0, uz: 1 }));
const vehicles = offsets.map((d, i) => ({
  d,
  hx: i === 0 ? ENGINE.hx : after && i === 2 ? 0.8 : 1.1,
  back: i === 0 ? ENGINE.hz : after && i === 2 ? 1.45 : 1.6,
  front: i === 0 ? ENGINE.hz : after && i === 2 ? 1.45 : 1.6,
  buffers: i === 0 ? ENGINE_BUFFERS : CAR_BUFFERS,
}));
const places = trainPlaces(at, stop, vehicles, [], false);
scene.updateMatrixWorld(true);
const hidden: Three.Object3D[] = [],
  batches: { mesh: Three.InstancedMesh; index: number }[] = [];
const stage = new THREE.Group();
stage.name = 'home-coach-inspection';
const position = new THREE.Vector3(),
  matrix = new THREE.Matrix4();
for (let i = 0; i < source.cars.length; i++) {
  const car = source.cars[i]!;
  const targetIndex = after && i >= 2 ? i + 1 : i;
  const posed = deckAt(at, places[targetIndex]!, vehicles[targetIndex]!, {
    x: 0,
    z: 0,
    yaw: 0,
    hx: 0,
    back: 0,
    front: 0,
  });
  let root: Three.Object3D | undefined;
  let nearest = Infinity;
  scene.traverse((o) => {
    if (o.type !== 'Group' || !o.children.some((c) => c.position.y < -0.4 && c.position.y > -2)) return;
    o.getWorldPosition(position);
    const distance = Math.hypot(position.x - car.x, position.y - car.y, position.z - car.z);
    if (distance < nearest && distance < 2) {
      nearest = distance;
      root = o;
    }
  });
  if (!root) throw new Error(`No real car mesh: ${car.id}`);
  const original = root;
  const inverse = original.matrixWorld.clone().invert();
  const copy = original.clone(true);
  copy.visible = true;
  copy.position.set(
    layout.toWorld(posed.x),
    layout.railY(layout.LINES.east, places[targetIndex]!) +
      0.4 +
      ((i === 0 ? ENGINE.top : i === 3 ? 0.5 : 0.7) - 0.4) / 2,
    posed.z,
  );
  copy.rotation.set(0, posed.yaw, 0);
  copy.scale.setScalar(1);
  hidden.push(original);
  stage.add(copy);
  // Production steel/footing/coupling batches live outside the car root. Preserve their actual geometry and materials.
  scene.traverse((o) => {
    if (!(o instanceof THREE.InstancedMesh) || o.frustumCulled) return;
    for (let k = 0; k < o.count; k++) {
      o.getMatrixAt(k, matrix);
      const world = o.matrixWorld.clone().multiply(matrix);
      position.setFromMatrixPosition(world).applyMatrix4(inverse);
      if (Math.abs(position.x) > 1.25 || Math.abs(position.z) > 1.85 || position.y < -1 || position.y > 3) continue;
      const material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      if (o.instanceColor) {
        const color = new THREE.Color();
        o.getColorAt(k, color);
        for (const m of Array.isArray(material) ? material : [material])
          if ('color' in m && m.color instanceof THREE.Color) m.color.multiply(color);
      }
      const part = new THREE.Mesh(o.geometry, material);
      part.matrixAutoUpdate = false;
      part.matrix.copy(inverse.clone().multiply(world));
      copy.add(part);
      batches.push({ mesh: o, index: k });
    }
  });
}
if (after) {
  const p = deckAt(at, places[2]!, vehicles[2]!, { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 });
  const coach = new THREE.Group();
  coach.position.set(layout.toWorld(p.x), layout.railY(layout.LINES.east, places[2]!), p.z);
  coach.rotation.y = p.yaw;
  for (const [y, h, color] of [
    [0.35, 0.7, '#333538'],
    [1.375, 1.35, '#b9864d'],
  ] as const) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, h, 2.9), new THREE.MeshBasicMaterial({ color }));
    box.position.y = y;
    coach.add(box);
  }
  stage.add(coach);
}
scene.add(stage);
const axis = (s: number, c: number, y: number) => {
  const p = home.axisPoint(s - home.ROAD2_S, c);
  return [layout.toWorld(p.x), y, p.z] as [number, number, number];
};
const railY = layout.railY(layout.LINES.east, 20),
  eyeY = railY + home.ISLAND.lift + 1.6;
const cameras: Record<string, { eye: [number, number, number]; look: [number, number, number]; fov: number }> = {
  square: {
    eye: axis(-14, home.ISLAND_C + 1.3, home.HALL.floor + 1.6),
    look: axis(22, home.ROAD_GAP, eyeY - 0.4),
    fov: 65,
  },
  island: { eye: axis(16, home.ISLAND_C + 0.6, eyeY), look: axis(28, home.ROAD_GAP, railY + 1.3), fov: 72 },
  table: { eye: axis(33, home.ROAD_GAP + 9, railY + 1.6), look: axis(24, home.ROAD_GAP, railY + 0.8), fov: 65 },
  top: { eye: axis(22.5, home.ROAD_GAP, railY + 49), look: axis(22.5, home.ROAD_GAP, railY), fov: 58 },
  player: { eye: axis(19.9, home.ISLAND_C - 0.8, eyeY), look: axis(20, home.ROAD_GAP, railY + 1), fov: 78 },
  coach: { eye: axis(18.1, home.ISLAND_C - 0.8, eyeY), look: axis(18.1, home.ROAD_GAP, railY + 1), fov: 78 },
};
let camera = cameras[q.get('coachCamera') ?? 'island']!;
(window as Window & { __homeCoachCamera?: (name: string) => void }).__homeCoachCamera = (name) => {
  camera = cameras[name]!;
};
const zero = new THREE.Matrix4().makeScale(0, 0, 0);
const hold = () => {
  hidden.forEach((o) => (o.visible = false));
  for (const b of batches) {
    b.mesh.setMatrixAt(b.index, zero);
    b.mesh.instanceMatrix.needsUpdate = true;
  }
  window.__debugCam?.set(camera.eye, camera.look, camera.fov);
};
scene.onBeforeRender = hold;
hold();
console.log(
  `HOME COACH ${JSON.stringify({ seed: 'boiler-long', slot, after, stop, places, source, camera, batchParts: batches.length })}`,
);
(window as Window & { __placeDone?: boolean }).__placeDone = true;
export {};
