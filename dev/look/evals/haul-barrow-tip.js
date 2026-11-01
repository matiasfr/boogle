// Sprint a loaded barrow down the slope west of the court until it wobbles and goes over (dev/look/evals/haul-pilot.ts):
// BOOGLE_QUERY='proto=haul&v=barrow' npm run look -- --eval dev/look/evals/haul-barrow-tip.js --cam 16,7,-11 --look 6,4.5,-4 --warm 0.3 --seconds 4 --frames 12
const H = await import('/dev/look/evals/haul-pilot.ts');
const B = await H.barrow();
await H.fill(40);
const [bx, bz] = [1.5, -5];
const h = Math.atan2(-(13 - bx), -(-3 - bz));
B.place(bx, bz, h);
H.stand(bx + Math.sin(h) * 1.4, bz + Math.cos(h) * 1.4, h);
B.grab();
H.overlay(() => H.barrowLine(B));
H.walk([[13, -3]], { sprint: true, seconds: 3 });
