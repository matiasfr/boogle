// The ghost (src/proto/soapbox/ghost.ts): a first run on the racing line sets a fresh ghost; the second races it on a
// line 1.2 m to the right, so the see-through cart runs beside yours. The sheet is the second run, ending on the split
// under the time (dev/look/evals/soapbox-pilot.ts; the first run takes about 12 s before the sheet starts):
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-ghost.js --hud --warm 0.2 --seconds 12 --frames 16
const { drive } = await import('/dev/look/evals/soapbox-pilot.ts');
const box = window.__soapbox;
localStorage.removeItem('boogle.soapbox.ghost');
await drive({});
for (let k = 0; k < 200 && box.run.state !== 'done'; k++) await new Promise((r) => setTimeout(r, 100));
await new Promise((r) => setTimeout(r, 1500)); // the cart brakes to a stop past the finish
const left = box.LINE.slice(1).map(([x, z], k, l) => {
  const [ax, az] = l[Math.max(0, k - 1)],
    [bx, bz] = l[Math.min(l.length - 1, k + 1)];
  const len = Math.hypot(bx - ax, bz - az) || 1;
  return [x - ((bz - az) / len) * 1.2, z + ((bx - ax) / len) * 1.2];
});
await drive({ path: left });
console.log('[soapbox-ghost] first run', box.ghost.time);
