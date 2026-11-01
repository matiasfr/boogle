// Take logs from a palm's bundle in the magnet variant: the logs spill out in a fan, bounce, rest, then fly to your
// back one by one (src/proto/haul/magnet.ts). Side-on, the camera placed by the eval itself:
// BOOGLE_QUERY='proto=haul&v=magnet' npm run look -- --eval dev/look/evals/haul-magnet-spill.js --cam 0,0,0 --warm 0.2 --seconds 1.6 --frames 12
const H = await import('/dev/look/evals/haul-pilot.ts');
const { rules } = await import('/src/world/game-world.ts');
const { submitEdit } = await import('/src/world/sync.ts');
const { identity } = await import('/src/player/identity.ts');
const { cellX, cellZ, groundHeight } = await import('/src/adapters/terrain.ts');
for (let k = 0; k < 100 && !identity.pid; k++) await new Promise((r) => setTimeout(r, 100));
const list = rules.sources.list();
let id = -1,
  best = 1e9;
list.forEach((p, k) => {
  const d = Math.hypot(cellX(p.i) + 0.9 - 4, cellZ(p.j) + 0.4 - 10);
  if (rules.sources.charges(k) > 0 && d < best) ((best = d), (id = k));
});
const p = list[id];
const bx = cellX(p.i) + 0.9,
  bz = cellZ(p.j) + 0.4,
  gy = groundHeight(bx, bz);
H.stand(bx + 2, bz, Math.PI / 2); // facing the bundle (-x)
H.overlay(() => `logs: chip ${window.__magnet?.shown?.() ?? '?'} / host ${H.myCount()}`);
setTimeout(() => window.__debugCam.set([bx + 1.4, gy + 1.8, bz + 3.6], [bx + 1.2, gy + 0.8, bz]), 150);
setTimeout(() => submitEdit({ op: 'src.take', i: p.i, j: p.j, id }), 450);
