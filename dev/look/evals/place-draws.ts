// command: unknown, needs a saved beat and pose: an --action at a posed beat (docs/research/perf-pass-2026-11-05.md ran it with --cam/--look after five seconds; dev/look/evals/place-kit-draws.ts imports it per pose)
// Count actual backend draws for one completed game frame. No timing verdict or extra render.
// Use as broker --action at a saved beat; positions and scene paths identify unnamed prototype meshes.
import type { Object3D, Material, BufferGeometry } from 'three';

const { renderer, camera } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
type Draw = { object: Object3D; material: Material; geometry: BufferGeometry; camera: Object3D };
const backend = renderer.backend as unknown as { draw(object: Draw, info: unknown): void };
const original = backend.draw;
let frame = -1;
const rows = new Map<
  string,
  { path: string; geometry: string; material: string; color: string; at: number[]; draws: number; shadow: boolean }
>();
const point = camera.position.clone();
backend.draw = function (draw, info) {
  if (frame !== renderer.info.frame) {
    frame = renderer.info.frame;
    rows.clear();
  }
  const path: string[] = [];
  let node: Object3D | null = draw.object;
  while (node) {
    path.unshift(node.name || `${node.type}[${node.parent?.children.indexOf(node) ?? 0}]`);
    node = node.parent;
  }
  // r187 ShadowBaseNode names its override; its type is still NodeMaterial.
  const shadow = draw.material.name === 'ShadowMaterial';
  const key = `${draw.object.id}:${draw.material.id}:${shadow}`;
  const before = renderer.info.render.drawCalls;
  original.call(backend, draw, info);
  const calls = renderer.info.render.drawCalls - before;
  const row = rows.get(key) ?? {
    path: path.join('/'),
    geometry: draw.geometry.type,
    material: draw.material.name || draw.material.type,
    color: (draw.material as Material & { color?: { getHexString(): string } }).color?.getHexString() ?? '',
    at: draw.object
      .getWorldPosition(point)
      .toArray()
      .map((v) => Math.round(v * 100) / 100),
    draws: 0,
    shadow,
  };
  row.draws += calls;
  rows.set(key, row);
};
try {
  const start = window.boogle!.prof.last.frames;
  const deadline = performance.now() + 30000;
  while (window.boogle!.prof.last.frames < start + 2) {
    if (performance.now() > deadline) throw new Error('No completed frames for draw attribution');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  console.log(
    'PLACE DRAWS ' +
      JSON.stringify({
        render: { ...renderer.info.render },
        camera: camera.position.toArray(),
        rows: [...rows.values()].filter((row) => row.draws > 0),
      }),
  );
} finally {
  backend.draw = original;
}
export {};
