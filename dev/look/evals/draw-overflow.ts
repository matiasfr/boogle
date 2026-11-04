// Broker look --action: hold a real draw at capacity + 1 while orbiting its view.
// &drawTarget=rack|station|pieces|particles; &releaseDraw=1 repairs it after 4 s.
// No extra renderer, browser harness, frame loop or gameplay-state persistence.
const q = new URLSearchParams(location.search);
const target = q.get('drawTarget') ?? 'rack';
const { scene, camera } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { onFrame } = (await import('/src/loop.ts' as string)) as typeof import('../../../src/loop.ts');
const { watchPlayMarks } = (await import(
  '/src/proto/mark.ts' as string
)) as typeof import('../../../src/proto/mark.ts');
const { forge, HAND_LOGS, snapForge, rackFrom } = (await import(
  '/src/proto/place/forge.ts' as string
)) as typeof import('../../../src/proto/place/forge.ts');
const { forgeFrame } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { emit } = (await import(
  '/src/render/particles.ts' as string
)) as typeof import('../../../src/render/particles.ts');
const { pileMesh } = (await import(
  '/src/adapters/piles.ts' as string
)) as typeof import('../../../src/adapters/piles.ts');
const { commitPieces } = (await import(
  '/src/render/haul-pieces.ts' as string
)) as typeof import('../../../src/render/haul-pieces.ts');
const THREE = window.boogle.THREE;
watchPlayMarks((name, data) => {
  if (name === 'draw count bounded' || name === 'gpu error') console.log(`DRAW mark ${name} ${JSON.stringify(data)}`);
});
forge.logs = HAND_LOGS;
forge.rails = 24;
snapForge();
forgeFrame.drawStock({ logs: 57, rails: 0, stone: 0, beam: 0 });
const instances: import('three/webgpu').InstancedMesh[] = [];
const sprites: import('three/webgpu').Sprite[] = [];
scene.traverse((o) => {
  if ((o as import('three/webgpu').InstancedMesh).isInstancedMesh)
    instances.push(o as import('three/webgpu').InstancedMesh);
  if ((o as import('three/webgpu').Sprite).isSprite) sprites.push(o as import('three/webgpu').Sprite);
});
const rack = instances.find(
  (m) => m.instanceMatrix.count === 24 && Math.abs(m.instanceMatrix.array[12]! - (rackFrom.x - 1)) < 0.01,
);
const station = instances.find((m) => m.instanceMatrix.count === 56 && m.count === 56);
const particles = sprites.find((s) => s.count === 720);
const mesh = target === 'rack' ? rack : target === 'station' ? station : target === 'pieces' ? pileMesh : particles;
if (!mesh) throw new Error(`Missing draw target ${target}`);
const capacity = target === 'particles' ? 720 : (mesh as import('three/webgpu').InstancedMesh).instanceMatrix.count;
const focus = target === 'station' ? new THREE.Vector3(forgeFrame.x, forgeFrame.y + 1, forgeFrame.z) : rackFrom.clone();
if (target === 'pieces') {
  const matrix = new THREE.Matrix4().makeTranslation(focus.x, focus.y, focus.z);
  pileMesh.setMatrixAt(0, matrix);
  pileMesh.instanceMatrix.needsUpdate = true;
  commitPieces(pileMesh, capacity + 1);
} else mesh.count = capacity + 1;
if (q.has('expectBound') && mesh.count !== capacity) throw new Error(`Unbounded ${target}: ${mesh.count}/${capacity}`);
// Deliberately bypass the accessor only to inspect the remaining GPU error path.
if (q.has('bypassDraw'))
  Object.defineProperty(mesh, 'count', { value: capacity + 1, writable: true, configurable: true });
mesh.visible = true;
mesh.frustumCulled = false;
const start = performance.now();
let repaired = false;
const white = new THREE.Color('#ffffff');
window.__debugCam?.clear();
onFrame(
  ({ now }) => {
    const t = (now - start) / 1000;
    camera.position.set(focus.x + Math.sin(t * 0.7) * 7, focus.y + 5, focus.z + Math.cos(t * 0.7) * 7);
    camera.lookAt(focus);
    if (target === 'particles')
      emit({ x: focus.x, y: focus.y, z: focus.z, vx: 1, vy: 1, life: 2, size: 0.4, color: white });
    if (q.has('releaseDraw') && t > 4 && !repaired) {
      mesh.count = capacity;
      repaired = true;
      console.log(`DRAW repaired ${target} count=${mesh.count} at=${t.toFixed(2)}s`);
    }
  },
  { phase: 'late', order: 999, name: 'draw overflow capture orbit' },
);
console.log(`DRAW forced ${target}: requested=${capacity + 1} accepted=${mesh.count} capacity=${capacity}`);
export {};
