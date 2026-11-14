// npm run look -- --rail-seed stack-laid-1 --eval dev/look/evals/ring-cutting-walk.ts --until window.__cutWalk \
//   --wall 900 --cam 1411,10.6,-852 --look 1380,7,-902 --name cutting-walk
// Ring Island's stack-line cutting, walked by the body on real colliders (owner, 14 November: drawn hillside stood
// across the laid track with nothing solid in it). From the platforms' north end (s 1215) to the sea deck (s 1590) by
// real input at walk speed, no jump, along the deck's east edge clear of the trains. Every 10 m it reads the body's
// height against the rails and casts a ray down from 80 m up: what is drawn over the walker's head must be nothing
// (`over`: the first drawn surface's height over the body, and its mesh). The staging teleport is the only one.
// Prints `CUTWALK ...` lines and sets `window.__cutWalk`.
import type * as Three from 'three/webgpu';
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { scene, camera } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { ROW_SHIFT, rowPoint } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
// The game's own three.js module (a page eval cannot name a bare specifier): the URL Vite gave scene.ts's import.
const threeUrl = /from\s+"([^"]*three_webgpu[^"]*)"/.exec(await (await fetch('/src/render/scene.ts')).text())?.[1];
if (!threeUrl) throw new Error('three/webgpu URL not found in scene.ts');
const THREE = (await import(threeUrl)) as typeof Three;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const f1 = (n: number) => +n.toFixed(1);
const b = me.body!;
/** The deck's east edge at s metres: 1.9 m east of the down track (the slab runs to 2.3 m), and the rails' height. */
function edge(s: number) {
  const p = rowPoint('ring', s * 100 + ROW_SHIFT.ring),
    q = rowPoint('ring', s * 100 + ROW_SHIFT.ring + 100),
    len = Math.hypot(q.x - p.x, q.z - p.z);
  return {
    s,
    x: p.x / 100 - ((q.z - p.z) / len) * 1.9,
    z: p.z / 100 + ((q.x - p.x) / len) * 1.9,
    y: p.y / 100,
  };
}
const ray = new THREE.Raycaster();
ray.camera = camera; // sprites ask for one
/** The first drawn surface under a point 80 m over the body, the body's own meshes left out. */
function overhead() {
  ray.set(new THREE.Vector3(b.position.x, b.position.y + 80, b.position.z), new THREE.Vector3(0, -1, 0));
  for (const hit of ray.intersectObjects(scene.children, true)) {
    let skip = false;
    for (let o: Three.Object3D | null = hit.object; o; o = o.parent) if (o === me.avatar || !o.visible) skip = true;
    if (skip) continue;
    const mesh = hit.object as Three.Mesh;
    return { over: f1(hit.point.y - b.position.y), mesh: hit.object.name || mesh.geometry?.type || hit.object.type };
  }
  return { over: 0, mesh: 'none' };
}

async function run() {
  const from = 1215,
    to = 1590;
  const start = edge(from);
  input.keys.clear();
  teleport(b, start.x, start.y + 1.5, start.z);
  b.velocity.set(0, 0, 0);
  await wait(1500);
  const rows: { s: number; body: number; rails: number; over: number; mesh: string }[] = [];
  const t0 = performance.now();
  let reached = from;
  input.keys.add('KeyW');
  try {
    for (let s = from + 5; s <= to; s += 5) {
      const p = edge(s);
      for (;;) {
        const dx = p.x - b.position.x,
          dz = p.z - b.position.z;
        if (Math.hypot(dx, dz) < 1) break;
        if (performance.now() - t0 > 240000) throw new Error('timeout');
        cam.yaw = me.yaw = Math.atan2(-dx, -dz);
        await wait(16);
      }
      reached = s;
      if (s % 10 === 0) {
        const row = { s, body: f1(b.position.y), rails: f1(p.y), ...overhead() };
        rows.push(row);
        console.log(`CUTWALK ${JSON.stringify(row)}`);
      }
    }
  } catch (err) {
    // Reported below: it stopped short.
    console.log(`CUTWALK stopped: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    input.keys.delete('KeyW');
  }
  // On the deck the whole way (the body's middle stands about a metre over the rails' level), under open sky.
  const off = rows.filter((r) => Math.abs(r.body - r.rails) > 2.2),
    covered = rows.filter((r) => r.over > 2.5);
  const out = {
    ok: reached === to && off.length === 0 && covered.length === 0,
    reached: `s ${reached} of ${to}`,
    seconds: f1((performance.now() - t0) / 1000),
    offDeck: off.map((r) => r.s),
    drawnOverhead: covered.map((r) => `s ${r.s}: ${r.over} m, ${r.mesh}`),
  };
  console.log(`CUTWALK done ${JSON.stringify(out)}`);
  (window as unknown as { __cutWalk?: unknown }).__cutWalk = out;
}
void run();
export {};
