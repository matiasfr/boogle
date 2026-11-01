// The telegraph from the beach: the swell rises on the horizon and comes on, the countdown chip runs, and it breaks
// over the sandbar (src/proto/haul/wave.ts):
// BOOGLE_QUERY='proto=haul&v=wave' npm run look -- --hud --eval dev/look/evals/haul-wave-warn.js --cam 4,4.5,30 --look 3,0.5,80 --warm 0.2 --seconds 12 --frames 12
const H = await import('/dev/look/evals/haul-pilot.ts');
H.stand(2, 38, Math.PI);
for (let k = 0; k < 50 && !window.__wave; k++) await new Promise((r) => setTimeout(r, 100));
setTimeout(() => window.__wave.next(10), 200);
