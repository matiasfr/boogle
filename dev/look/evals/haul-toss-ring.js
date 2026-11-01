// Side-on: hold the use button 8 m from the first work site's Track ring and the logs on your back go in by handfuls
// (dev/look/evals/haul-pilot.ts):
// BOOGLE_QUERY='proto=haul&v=toss' npm run look -- --eval dev/look/evals/haul-toss-ring.js --cam 15,5.5,9 --look 8.5,3,8 --warm 0.2 --seconds 5 --frames 12
const H = await import('/dev/look/evals/haul-pilot.ts');
await H.fill(24);
H.stand(8.4, 14, 0);
H.overlay(() => `logs on your back ${H.myCount()}`);
// the first half with the mouse's use action, the second with the touch Grab button's own calls
setTimeout(async () => {
  await H.holdUse(8.6, 6, 1600);
  await H.holdTouch(8.6, 6, 1600);
}, 300);
