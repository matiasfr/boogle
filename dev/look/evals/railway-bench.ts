// A rider on the passenger car's knifeboard, side on (owner, 10 November: "slightly forward on them so their head
// doesn't clip the backrests"): from `--rail-seed trains-on`, waits for line `&benchLine=` (default 1) to stand, drops
// Buddy on its passenger car by the +x bench's back seat, sits by sitDown, and frames his profile against the backrest.
// Logs BENCH with the head's and hips' distance out from the backrest's middle, in the car's frame.
// npm run look -- --rail-seed trains-on --query shot=play --eval dev/look/evals/railway-bench.ts \
//   --until window.__placeDone --name bench --question "..."
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { sitDown, seatState, lowStoolAnchor } = (await import(
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Car = { x: number; y: number; z: number; id: string };
type Train = { phase: number; cars: Car[] };
const q = new URLSearchParams(location.search);
const line = Number(q.get('benchLine') ?? 1);
const w = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const train = () => (inspectRailway()!.line2View as unknown as { trains: Train[] }).trains[line]!;
background(
  (async () => {
    while (!inspectRailway()?.line2View || !me.body) await wait(100);
    while (!(train().phase === 0 && train().cars[1]!.y > -30)) await wait(50);
    const [e, c] = train().cars as [Car, Car];
    const l = Math.hypot(e.x - c.x, e.z - c.z),
      fx = (e.x - c.x) / l,
      fz = (e.z - c.z) / l;
    // A point in the car's frame (x across, z toward the engine) in the world.
    const at = (x: number, z: number) => [c.x + fz * x + fx * z, c.z - fx * x + fz * z] as const;
    const [sx, sz] = at(0.75, -0.85);
    teleport(me.body!, sx, c.y + 1.2, sz);
    while (carry.on?.id !== c.id) await wait(50);
    await wait(300);
    sitDown();
    while (!seatState().sitting) await wait(50);
    const confirmBy = performance.now() + 10000;
    while (seatState().occupants[seatState().sitting!] !== inspectRailway()?.pid) {
      if (performance.now() > confirmBy) throw new Error('bench: server never confirmed the chair');
      await wait(50);
    }
    await wait(800);
    const p = me.body!.position;
    // Side on from behind the car, over its end rail: `&benchCam=<m back>,<m up>,<fov>`.
    const [back, up, fov] = (q.get('benchCam') ?? '4,1.4,24').split(',').map(Number) as [number, number, number];
    const [cx, cz] = [p.x - fx * back, p.z - fz * back];
    window.__debugCam?.set([cx, p.y + up, cz], [p.x, p.y + 0.25, p.z], fov);
    await wait(500);
    const out = (o: import('three/webgpu').Object3D) => {
      o.updateWorldMatrix(true, false);
      const m = o.matrixWorld.elements;
      return +((m[12]! - c.x) * fz - (m[14]! - c.z) * fx).toFixed(3);
    };
    const bones: Record<string, number> = {};
    me.avatar!.traverse((o) => {
      if (/^(head|hips|neck|spine)/i.test(o.name) && !(o.name in bones)) bones[o.name] = out(o);
    });
    // The drawn body's skinned vertices against the backrest (assets/src/passenger-car.py: the spine +-0.04 m up to
    // 0.82 m over the deck, its cap rail +-0.07 m to 0.88 m): the nearest any part comes to the bench's middle, by height
    // over the deck, and how far into the backrest the deepest one goes (0 is clear).
    const deck = p.y - lowStoolAnchor;
    const bands = { seat: [0.3, 0.82, 0.04], cap: [0.82, 0.88, 0.07], above: [0.88, 9, 0] } as const;
    const nearest: Record<string, number> = { seat: 9, cap: 9, above: 9 };
    let into = 0,
      headLow = 9;
    // The game's own three (a second copy would warn): the avatar's position is one of its vectors.
    const v = me.avatar!.position.clone();
    me.avatar!.traverse((o) => {
      const m = o as import('three/webgpu').SkinnedMesh;
      if (!m.isSkinnedMesh || !m.visible) return;
      const n = m.geometry.getAttribute('position').count;
      for (let i = 0; i < n; i++) {
        m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
        const x = Math.abs((v.x - c.x) * fz - (v.z - c.z) * fx),
          h = v.y - deck;
        for (const [k, [lo, hi, half]] of Object.entries(bands))
          if (h >= lo && h < hi) {
            nearest[k] = Math.min(nearest[k]!, x);
            into = Math.max(into, half - x);
          }
      }
    });
    me.avatar!.traverse((o) => {
      if (/^head$/i.test(o.name)) headLow = +(o.getWorldPosition(v).y - deck).toFixed(3);
    });
    const r3 = (n: number) => +n.toFixed(3);
    console.log(
      `BENCH ${JSON.stringify({ seat: seatState().sitting, bones, nearest: Object.fromEntries(Object.entries(nearest).map(([k, n]) => [k, r3(n)])), into: r3(into), headBone: headLow })}`,
    );
    w.__placeDone = true;
  })(),
  'bench shot setup',
);
export {};
