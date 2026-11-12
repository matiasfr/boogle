// Triangles and draws per completed frame (main pass and shadow pass) at fixed poses, by wrapping renderer.backend.draw
// (renderer.info.render reads 0 here; place-draws.ts is the per-row sibling). Counts only: frame time under load is no
// evidence. Pick the pose with ?tpose=green|head|ring and pass the same --cam/--look/--fov to look.ts for the still:
//   npm run look -- --real --fov 62 --query 'tpose=green&graphics=farGround:true' --cam 909,24.45,35 --look 903,19.15,20 \
//     --eval dev/look/evals/terrain-draws.ts --name terrain-green-on
// ring needs `--rail-seed ring-joined` (the island's near view mounts when the player stands on its side of the gap).
// Prints `TERRAIN DRAWS {...}`: totals per pass and the fifteen biggest rows of each, and the biggest eight object names with their draws and triangles.
import type { Object3D, Material, BufferGeometry, InstancedMesh } from 'three';

const { renderer } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');

type V = [number, number, number];
const POSES: Record<string, { cam: V; look: V; player: [number, number, number?]; fov: number }> = {
  green: { cam: [909, 24.45, 35], look: [903, 19.15, 20], player: [903, 20], fov: 62 },
  head: { cam: [1392, 28, -170], look: [1350, 15, -128], player: [1392, -170], fov: 62 },
};
const name = new URLSearchParams(location.search).get('tpose') ?? 'green';
let pose = POSES[name];
if (name === 'ring') {
  const ring = await import('/src/entities/ring-island/state.ts' as string);
  const layout = await import('/src/sim/railway-ring-layout.ts' as string);
  const at = (u: number, lat: number) => {
    const p = layout.ringAt(Math.round(u * 100), Math.round(lat * 100));
    return { x: p.x / 100, z: p.z / 100 };
  };
  const home = ring.ringUnstuckHome;
  teleport(me.body!, home.x, home.y + 1, home.z);
  const deadline = performance.now() + 60000;
  while (!ring.ringIslandNear.mounted && performance.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  const c = at(432, -8.6);
  pose = { cam: [c.x, 11.1, c.z], look: [1338, 70, -1120], player: [home.x, home.z], fov: 62 };
}
if (!pose) throw new Error('tpose: green, head or ring');
const [px, pz] = pose.player;
if (name !== 'ring') teleport(me.body!, px, H(px, pz) + 0.8, pz);
me.body!.velocity.set(0, 0, 0);
window.__debugCam!.set(pose.cam, pose.look, pose.fov);
await new Promise((r) => setTimeout(r, 6000));

type Draw = { object: Object3D; material: Material; geometry: BufferGeometry };
const backend = renderer.backend as unknown as { draw(object: Draw, info: unknown): void };
const original = backend.draw;
type Row = { id: number; path: string; tris: number; draws: number; shadow: boolean };
let rows = new Map<string, Row>();
let frame = -1;
backend.draw = function (draw, info) {
  if (frame !== renderer.info.frame) {
    frame = renderer.info.frame;
    rows = new Map();
  }
  const g = draw.geometry;
  const count = g.index ? g.index.count : (g.getAttribute('position')?.count ?? 0);
  const range = Math.min(count - g.drawRange.start, g.drawRange.count);
  const instances = (draw.object as InstancedMesh).isInstancedMesh ? (draw.object as InstancedMesh).count : 1;
  const shadow = draw.material.name === 'ShadowMaterial';
  const before = renderer.info.render.drawCalls;
  original.call(backend, draw, info);
  if (renderer.info.render.drawCalls === before) return; // not submitted
  let path = draw.object.name || draw.object.type;
  for (let n = draw.object.parent; n && path.length < 60; n = n.parent) path = (n.name || n.type) + '/' + path;
  const key = `${draw.object.id}:${shadow}`;
  const row = rows.get(key) ?? { id: draw.object.id, path, tris: 0, draws: 0, shadow };
  row.tris += Math.floor((range * instances) / 3);
  row.draws++;
  rows.set(key, row);
};
try {
  const start = window.boogle!.prof.last.frames;
  while (window.boogle!.prof.last.frames < start + 3) await new Promise((r) => setTimeout(r, 20));
  const all = [...rows.values()];
  // The same rows grouped by the object's own name (a view's chunks share one): draws and triangles per name, top 8.
  const byName = (part: Row[]) => {
    const names = new Map<string, { draws: number; tris: number }>();
    for (const row of part) {
      const key = row.path.slice(row.path.lastIndexOf('/') + 1);
      const sum = names.get(key) ?? { draws: 0, tris: 0 };
      sum.draws += row.draws;
      sum.tris += row.tris;
      names.set(key, sum);
    }
    return [...names]
      .sort((a, b) => b[1].tris - a[1].tris)
      .slice(0, 8)
      .map(([k, v]) => `${k} d${v.draws} t${v.tris}`);
  };
  const sum = (shadow: boolean) => {
    const part = all.filter((row) => row.shadow === shadow).sort((a, b) => b.tris - a.tris);
    return {
      draws: part.reduce((n, row) => n + row.draws, 0),
      tris: part.reduce((n, row) => n + row.tris, 0),
      top: part.slice(0, 15).map((row) => `${row.path} d${row.draws} t${row.tris}`),
      byName: byName(part),
      track: part
        .filter((row) => /place kit (rail|sleeper)/.test(row.path))
        .map((row) => `${row.path.split('/').pop()!.slice(10)} t${row.tris}`),
    };
  };
  const seen = new Set(all.filter((row) => !row.shadow).map((row) => row.id));
  const only = all.filter((row) => row.shadow && !seen.has(row.id));
  const shadowOnly = {
    draws: only.reduce((n, row) => n + row.draws, 0),
    tris: only.reduce((n, row) => n + row.tris, 0),
    paths: [...new Set(only.map((row) => row.path))].slice(0, 6),
  };
  console.log('TERRAIN DRAWS ' + JSON.stringify({ pose: name, main: sum(false), shadow: sum(true), shadowOnly }));
} finally {
  backend.draw = original;
}
export {};
