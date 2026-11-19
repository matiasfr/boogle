// npm run look -- --question "..." --eval dev/look/evals/turnouts.ts --rail-seed trains-on --query 'at=spur'
// The turnouts' proof framings (docs/plans/turnouts.md), each a fixed camera in a junction's own frame (metres from
// its toe along the through road, and to its right: src/place/junctions.ts) with Buddy stood beside it for scale:
//   at=spur        J1 from a player's eye, standing in road 2 behind the toe and looking along the turnout to the frog
//   at=spur-top    J1 from straight above, the toe at the left
//   at=spur-frog   J1's frog from a player's eye, close, from the spur's side
//   at=throat-top  Home's throat from high above: J2 and J6 on road 2, J4 and J3 on line 1
//   at=throat      Home's throat from a player's eye, on the island's end looking out along both lines
//   at=top&id=J4   any junction from straight above at 13 m, as spur-top
//   at=eye&id=J4   any junction from a player's eye behind its toe, as spur
//   at=back&id=J6  any junction from a player's eye between its roads past the frog, looking back at the toe
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const land = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { junctions } = (await import(
  '/src/place/junctions.ts' as string
)) as typeof import('../../../src/place/junctions.ts');

type V = { x: number; y: number; z: number };
const query = new URLSearchParams(location.search);
const at = query.get('at') ?? 'spur';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const all = junctions();
const pick = (id: string) => {
  const j = all.find((x) => x.id === id);
  if (!j) throw new Error(`turnouts look: no junction ${id}`);
  return j;
};
/** A world point `d` metres past junction `id`'s toe along its through road and `lat` to its right, `up` over the rails. */
const by =
  (id: string) =>
  (d: number, lat: number, up = 0): V => {
    const j = pick(id);
    const a = j.through(d - 0.05),
      b = j.through(d + 0.05),
      p = j.through(d),
      len = Math.hypot(b.x - a.x, b.z - a.z);
    const t = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
    return { x: p.x - t.z * lat, y: p.y + up, z: p.z + t.x * lat };
  };
const j1 = by('J1');
const id = query.get('id') ?? 'J4';

let stand: V, eye: V, look: V;
let fov = 60;
if (at === 'spur') {
  stand = j1(1.2, 2.6);
  eye = j1(-3.2, -0.2, 1.6);
  look = j1(5.5, 0.7, 0);
} else if (at === 'spur-top') {
  stand = j1(0, 3.2);
  eye = j1(3.79, 0.6, 13);
  look = j1(3.8, 0.6, 0);
  fov = 50;
} else if (at === 'spur-frog') {
  stand = j1(2.5, 3.4);
  eye = j1(8.6, 3.4, 1.6);
  look = j1(5.2, 0.6, 0);
  fov = 55;
} else if (at === 'top') {
  const f = by(id);
  stand = f(0, 3.2);
  eye = f(5.49, -1.2, 13);
  look = f(5.5, -1.2, 0);
  fov = 50;
} else if (at === 'eye') {
  const f = by(id);
  stand = f(0, 2.6);
  eye = f(-4, 0.3, 1.6);
  look = f(6.5, -0.8, 0);
} else if (at === 'back') {
  // From a player's eye between the two roads past the frog, looking back at the toe: where a standing train hides
  // the view from behind the toe.
  const f = by(id);
  stand = f(15, -1.9);
  eye = f(13, -1.9, 1.6);
  look = f(4.5, -0.2, 0);
} else if (at === 'throat-top') {
  // Over the middle of the four toes, the screen's up toward the east so line 1's run south lies across it.
  const toes = ['J2', 'J3', 'J4', 'J6'].map((j) => pick(j).through(5));
  const mid = {
    x: toes.reduce((n, p) => n + p.x, 0) / 4,
    y: toes.reduce((n, p) => n + p.y, 0) / 4,
    z: toes.reduce((n, p) => n + p.z, 0) / 4,
  };
  stand = by('J4')(-2, 3.5);
  eye = { x: mid.x - 0.01, y: mid.y + 34, z: mid.z };
  look = mid;
  fov = 50;
} else if (at === 'throat') {
  // Beside line 1 behind J4's toe, looking out along it through J4 and on to J3.
  stand = by('J4')(-3, 2.6);
  eye = by('J4')(-5, 1.6, 1.7);
  look = by('J4')(9, -0.6, 0);
  fov = 62;
} else throw new Error('Choose at=spur|spur-top|spur-frog|throat-top|throat|top|eye|back');

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
console.log(`TURNOUTS ${at} ${id} ${JSON.stringify({ stand, eye, look })}`);
export {};
