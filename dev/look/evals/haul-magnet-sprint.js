// Sprint past a ground pile in the magnet variant: it notices you from 3 m (or `&reach=`), and the pieces lift and
// home on your back one by one (src/proto/haul/magnet.ts). The camera placed by the eval itself:
// BOOGLE_QUERY='proto=haul&v=magnet' npm run look -- --eval dev/look/evals/haul-magnet-sprint.js --cam 0,0,0 --warm 0.2 --seconds 2 --frames 12
const H = await import('/dev/look/evals/haul-pilot.ts');
const { submitEdit } = await import('/src/world/sync.ts');
const { cellOf, cellX, cellZ, groundHeight } = await import('/src/adapters/terrain.ts');
await H.fill(12);
await new Promise((r) => setTimeout(r, 2500)); // the Take spills land first
const [i, j] = cellOf(6, 2);
const px = cellX(i),
  pz = cellZ(j),
  gy = groundHeight(px, pz);
H.stand(px - 9, pz - 2, -Math.PI / 2); // out of reach while the pile goes down
const before = H.myCount();
submitEdit({ op: 'pile.drop', i, j, n: 12 });
for (let k = 0; k < 40 && H.myCount() === before; k++) await new Promise((r) => setTimeout(r, 100));
// a run along x, passing the pile 2 m to its side (clear of the first work site's rings: standing in one pours)
H.overlay(() => `logs: chip ${window.__magnet?.shown?.() ?? '?'} / host ${H.myCount()}`);
setTimeout(() => window.__debugCam.set([px + 1.5, gy + 3.2, pz - 10.5], [px + 1.5, gy + 0.8, pz - 1]), 150);
setTimeout(
  () =>
    H.walk(
      [
        [px + 2, pz - 2],
        [px + 12, pz - 2],
      ],
      { sprint: true, seconds: 3 },
    ),
  300,
);
