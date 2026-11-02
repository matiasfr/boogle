// Push a loaded barrow from the palm by the court down to the first work site, then tip it into the Track ring
// (dev/look/evals/haul-pilot.ts):
// BOOGLE_QUERY='proto=haul&v=barrow' npm run look -- --eval dev/look/evals/haul-barrow-push.ts --cam 13,4.5,-1 --look 7.5,3,3 --warm 0.3 --seconds 6 --frames 12
const H = (await import('/dev/look/evals/haul-pilot.ts' as string)) as typeof import('./haul-pilot.ts');
const B = await H.barrow();
await H.fill(40);
const [bx, bz] = [5.6, -2];
const h = Math.atan2(-(8.4 - bx), -(4.2 - bz));
B.place(bx, bz, h);
H.stand(bx + Math.sin(h) * 1.4, bz + Math.cos(h) * 1.4, h);
B.grab();
H.overlay(() => H.barrowLine(B));
H.walk(
  [
    [7.4, 1.8],
    [8.3, 3.7],
  ],
  { seconds: 6 },
).then(() => setTimeout(() => B.startPour(), 300));

export {}; // a module for the type checker; look.ts strips this line (an eval body, not imported)
