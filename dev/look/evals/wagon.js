// The ?proto=wagon wagon (src/proto/wagon/index.ts): seeks its timetable to a moment, then films it. Query (BOOGLE_QUERY):
//   proto=wagon&wt=<mode>&ph=<timetable phase to seek to, ticks>[&laid=N | &lay=1][&v=calm|lively|fast]
//   laid=N fakes N laid sections in this tab; lay=1 lays the whole route for real (open.lay: needs --room proto-wagon,
//   as does v=fast, whose pace the panel sets for the room on load).
// Modes:
//   run, stop   a fixed camera beside the line at cx,cz (ch high, cs to the west; negative cs: to the east)
//   stand       you on the middle flatbed, the game's follow camera
//   jump        you on the middle flatbed, jumping off sideways after jt ms, a fixed camera ahead (js to the east)
// window.__wagonLog: a trace every 100 ms (see the end of this file).
// e.g. BOOGLE_QUERY='proto=wagon&lay=1&v=fast&wt=jump&ph=180&jt=1200' \
//        npm run look -- --room proto-wagon --eval dev/look/evals/wagon.js --warm 0.5 --seconds 4 --cam 0,10,0 --look 10,0,-3
const q = new URLSearchParams(location.search);
const test = q.get('wt') || 'run';
const ph = Number(q.get('ph') || 60);
const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 10000) => {
  for (const t0 = performance.now(); !fn() && performance.now() - t0 < ms;) await sleep(50);
  return fn();
};
if (!(await until(() => window.__wagon, 5000))) throw new Error('no wagon: add proto=wagon');
const W = window.__wagon;
const { me, cam } = await import('/src/player/player.ts');
const { input } = await import('/src/player/input.ts');
const { carry } = await import('/src/physics/platforms.ts');
const { teleport } = await import('/src/physics/physics.ts');
const { groundHeight } = await import('/src/adapters/terrain.ts');
const { submitEdit } = await import('/src/world/sync.ts');
if (q.get('v') === 'fast' && !(await until(() => W.pace.cruise > 30)))
  throw new Error('v=fast did not set the pace: needs --room proto-wagon');
if (q.get('lay') === '1') {
  submitEdit({ op: 'open.lay', i: 0, j: 0 });
  if (!(await until(() => W.timeline().length))) throw new Error('open.lay did not lay: needs --room proto-wagon');
}
await sleep(300);
W.seekPhase(ph);
await sleep(200);
const c = W.cars[1];
if (test === 'run' || test === 'stop') {
  const x = num('cx', 10),
    z = num('cz', -12),
    y = groundHeight(x, z);
  setTimeout(() => window.__debugCam.set([x - num('cs', 11), y + num('ch', 4), z + 3], [x, y + 0.8, z]), 400);
} else {
  const p = c.body.position,
    yaw = Math.atan2(2 * c.body.quaternion.w * c.body.quaternion.y, 1 - 2 * c.body.quaternion.y ** 2);
  teleport(me.body, p.x - 0.5 * Math.cos(yaw), p.y + c.hy + 0.5, p.z + 0.5 * Math.sin(yaw));
  me.body.velocity.set(c.body.velocity.x, 0, c.body.velocity.z);
  carry.x = c.body.velocity.x;
  carry.z = c.body.velocity.z;
  me.yaw = yaw + Math.PI;
  cam.yaw = yaw + Math.PI + 0.9;
  cam.pitch = -0.3;
  if (test === 'jump') {
    const s = W.state;
    const ax = p.x + s.dx * num('ahead', 5),
      az = p.z + s.dz * num('ahead', 5),
      ay = groundHeight(ax, az);
    setTimeout(() => window.__debugCam.set([ax + num('js', 9), ay + 3, az + 3], [ax, ay + 1, az]), 400);
    // Jump off towards the camera's side (east, +x): hold whichever move key points most that way.
    const { camForward } = await import('/src/player/player.ts');
    let key = 'KeyA';
    setTimeout(
      () => {
        const f = camForward();
        const dirs = { KeyW: f.x, KeyS: -f.x, KeyD: -f.z, KeyA: f.z }; // right of forward (fx, fz) is (-fz, fx)
        key = Object.entries(dirs).sort((a, b) => b[1] - a[1])[0][0];
        input.keys.add(key);
        me.jumpQueued = 0.15;
        me.jumpHeld = true;
      },
      num('jt', 2600),
    );
    setTimeout(
      () => {
        input.keys.delete(key);
        me.jumpHeld = false;
      },
      num('jt', 2600) + 500,
    );
  } else setTimeout(() => window.__debugCam.clear(), 400);
}
// A trace: [ms, wagon dist cm, speed m/s, stop, your height over the flatbed's centre, your distance from it, on a deck,
// tumbles so far], every 100 ms.
const log = [];
const t0 = performance.now();
const iv = setInterval(() => {
  const s = W.state;
  log.push([
    Math.round(performance.now() - t0),
    s ? Math.round(s.dist) : null,
    s ? +s.speed.toFixed(2) : null,
    s ? s.stop : null,
    +(me.body.position.y - c.body.position.y).toFixed(2),
    +Math.hypot(me.body.position.x - c.body.position.x, me.body.position.z - c.body.position.z).toFixed(2),
    !!carry.on,
    carry.tumbles,
  ]);
  if (log.length >= 150) clearInterval(iv);
}, 100);
window.__wagonLog = log;
