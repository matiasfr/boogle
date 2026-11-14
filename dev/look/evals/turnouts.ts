// npm run look -- --question "..." --eval dev/look/evals/turnouts.ts --rail-seed trains-on --query 'at=spur'
// The turnouts' proof framings (docs/plans/turnouts.md), each a fixed camera in a junction's own frame (metres from
// its toe along the through road, and to its right: src/place/junctions.ts) with Buddy stood beside it for scale:
//   at=spur       J1 from a player's eye, standing in road 2 behind the toe and looking along the turnout to the frog
//   at=spur-top   J1 from straight above, the toe at the left
//   at=spur-frog  J1's frog from a player's eye, close, from the spur's side
// Add `&id=J…` framings here as the other junctions are built.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const land = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { junctions } = (await import(
  '/src/place/junctions.ts' as string
)) as typeof import('../../../src/place/junctions.ts');

type V = { x: number; y: number; z: number };
const at = new URLSearchParams(location.search).get('at') ?? 'spur';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const j1 = junctions().find((j) => j.id === 'J1')!;
/** A world point `d` metres past the toe along the through road and `lat` to its right, `up` over the rails. */
const by = (d: number, lat: number, up = 0): V => {
  const a = j1.through(d - 0.05),
    b = j1.through(d + 0.05),
    p = j1.through(d),
    len = Math.hypot(b.x - a.x, b.z - a.z);
  const t = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
  return { x: p.x - t.z * lat, y: p.y + up, z: p.z + t.x * lat };
};

let stand: V, eye: V, look: V;
let fov = 60;
if (at === 'spur') {
  stand = by(1.2, 2.6);
  eye = by(-3.2, -0.2, 1.6);
  look = by(5.5, 0.7, 0);
} else if (at === 'spur-top') {
  stand = by(0, 3.2);
  eye = by(3.79, 0.6, 13);
  look = by(3.8, 0.6, 0);
  fov = 50;
} else if (at === 'spur-frog') {
  stand = by(2.5, 3.4);
  eye = by(8.6, 3.4, 1.6);
  look = by(5.2, 0.6, 0);
  fov = 55;
} else throw new Error('Choose at=spur|spur-top|spur-frog');

const body = me.body;
if (!body) throw new Error('turnouts look: no player body');
await wait(500);
teleport(body, stand.x, land.H(stand.x, stand.z) + 0.9, stand.z);
cam.yaw = me.yaw = Math.atan2(-(look.x - stand.x), -(look.z - stand.z));
const setCam = () => window.__debugCam?.set([eye.x, eye.y, eye.z], [look.x, look.y, look.z], fov);
setCam();
setTimeout(setCam, 100);
const hold = setInterval(setCam, 200);
setTimeout(() => clearInterval(hold), 120_000);
console.log(`TURNOUTS ${at} ${JSON.stringify({ stand, eye, look })}`);
export {};
