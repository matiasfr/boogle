// npm run look -- --question "..." --eval dev/look/evals/turnouts.ts --rail-seed trains-on --query 'at=spur'
// The turnouts' proof framings (docs/plans/turnouts.md), each a fixed camera in a junction's own frame (metres from
// its toe along the through road, and to its right: src/place/junctions.ts) with Buddy stood beside it for scale:
//   at=spur        J1 from a player's eye, standing in road 2 behind the toe and looking along the turnout to the frog
//   at=spur-top    J1 from straight above, the toe at the left
//   at=spur-frog   J1's frog from a player's eye, close, from the spur's side
//   at=throat-top  Home's throat from high above: J2 and J6 on road 2, J4 and J3 on line 1
//   at=throat      Home's throat from a player's eye, on the island's end looking out along both lines
//   at=top&id=J4   any junction from straight above at 13 m, as spur-top
//   at=toe&id=J4   any junction's blades, tie bar and rod from straight above at 5 m (step 6)
//   at=toe-eye&id=J4  a crouching eye beside a junction's blade tips (step 6)
//   at=ramp        J4 from a player's eye on Home's island end ramp, narrowed onto its toe (step 6's clip; with
//                  --until "window.__homewardNearJ4?.()" the warm-up ends as a homeward line 1 train comes)
//   at=eye&id=J4   any junction from a player's eye behind its toe, as spur
//   at=back&id=J6  any junction from a player's eye between its roads past the frog, looking back at the toe
//                  (top, eye and back mirror to the side the junction's diverging road leaves on)
//   at=farhead     Far Head's crossover (J8 near, J7 beyond) from a player's eye on the platform's end, looking back
//   at=table       the Roundhouse table close (step 5): from outside the rim between the open stall (190) and 170,
//                  over the open stall's join and the deck
//   at=table-top   the table from straight above: the rim, its kerb and every road's join
//   at=table-join&b=190  one road's join (b: its bearing) at a crouching player's eye, beside it outside the rim
//   at=railhead    the railhead's crossover (J10, step 7) from a player's eye on the railhead platform's back end,
//                  looking back along the deck at J10b near and J10a beyond (wherever the head stands now)
//   at=cross-top&id=J12.1a  a sea crossover (J10, J11, J12.1 to J12.4) from straight above its middle, both toes in view
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const land = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { junctions } = (await import(
  '/src/place/junctions.ts' as string
)) as typeof import('../../../src/place/junctions.ts');
const { turnout } = (await import('/src/place/turnout.ts' as string)) as typeof import('../../../src/place/turnout.ts');
const { garageRow, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { TABLE_RAIL } = (await import(
  '/src/entities/railway/works-shape.ts' as string
)) as typeof import('../../../src/entities/railway/works-shape.ts');

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
    d += moved(id);
    const a = j.through(d - 0.05),
      b = j.through(d + 0.05),
      p = j.through(d),
      len = Math.hypot(b.x - a.x, b.z - a.z);
    const t = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
    return { x: p.x - t.z * lat, y: p.y + up, z: p.z + t.x * lat };
  };
/** J10 is listed at the railhead's first head and moves with it (railhead-view.ts): how far it has come. */
const rh = (await import(
  '/src/entities/railway/railhead-state.ts' as string
)) as typeof import('../../../src/entities/railway/railhead-state.ts');
const shape = (await import(
  '/src/entities/railway/railhead-shape.ts' as string
)) as typeof import('../../../src/entities/railway/railhead-shape.ts');
const moved = (id: string) => {
  const j = pick(id);
  return j.view === 'railhead' && rh.railheadDrawn.live ? j.dir * (rh.railheadEnd() - shape.headU(0)) : 0;
};
const j1 = by('J1');
const id = query.get('id') ?? 'J4';
/** Junction `id`'s frame mirrored so its diverging road leaves to the left, as J4's does: the framings below are
 * J4's. */
const hand = (({ through, diverging, lever }) => turnout(through, diverging, lever).hand)(pick(id));
const mirrored = (d: number, lat: number, up = 0) => by(id)(d, -hand * lat, up);

let stand: V, eye: V, look: V;
let fov = 60;
/** Stand Buddy at `stand`'s own height (a deck over the sea), not on the ground under it. */
let onDeck = false;
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
  const f = mirrored;
  stand = f(0, 3.2);
  eye = f(5.49, -1.2, 13);
  look = f(5.5, -1.2, 0);
  fov = 50;
} else if (at === 'toe') {
  // Step 6: the blades, tie bar and rod from straight above at 5 m, the toe a little below the middle.
  const f = mirrored;
  stand = f(-2, 3.2);
  eye = f(1.39, -0.3, 5);
  look = f(1.4, -0.3, 0);
  fov = 50;
} else if (at === 'toe-eye') {
  // Step 6: a crouching eye beside the tips on the lever's side, looking along the blades to their heels.
  const f = mirrored;
  stand = f(-3, 3);
  eye = f(-1.6, 1.4, 0.7);
  look = f(2.2, -0.4, 0.1);
  fov = 55;
} else if (at === 'eye') {
  const f = mirrored;
  stand = f(0, 2.6);
  eye = f(-4, 0.3, 1.6);
  look = f(6.5, -0.8, 0);
} else if (at === 'back') {
  // From a player's eye between the two roads past the frog, looking back at the toe: where a standing train hides
  // the view from behind the toe.
  const f = mirrored;
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
} else if (at === 'ramp') {
  // Step 6's clip: on the island's end ramp at Home, looking out along line 1 at J4 (its points throw for a homeward
  // train; `window.__homewardNearJ4`, below, ends the warm-up as one comes).
  const home = (await import(
    '/src/place/home-station.ts' as string
  )) as typeof import('../../../src/place/home-station.ts');
  const { ORIGIN } = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
  const onAxis = (a: number, up: number): V => {
    const p = home.axisPoint(a, home.ISLAND_C),
      x = p.x + ORIGIN.x;
    return { x, y: land.H(x, p.z) + up, z: p.z };
  };
  const ramp = (home.ISLAND_A.deck1 + home.ISLAND_A.foot) / 2;
  // Buddy stands behind the camera, on the ramp's upper end; the eye is a standing player's at its foot, narrowed onto
  // the toe so the blades read at 13 m.
  stand = onAxis(ramp - 3.5, 0);
  eye = onAxis(ramp + 1, 1.9);
  look = by('J4')(1.6, 0, 0);
  fov = 30;
} else if (at === 'farhead') {
  // On Far Head's platform (s 513 to 535, 2.9 m right of line 2) by its end ramp, 2 m past J8's toe, looking back
  // along the crossover: J8's points near, the up track's J7 beyond. J8's through road runs against the line, so
  // the platform is to its left.
  const f = by('J8');
  stand = f(-7, -3.4);
  eye = f(-3, -2.6, 2.3);
  look = f(13, 1.6, 0);
  fov = 58;
} else if (at === 'railhead') {
  // The railhead platform (lat +1.8 to +6.3, 25 m back from the deck's end, 0.9 m up) begins 5 m past J10b's toe
  // toward the end; J10b's through road (the down track) runs home, so the platform is to its left.
  const f = by('J10b');
  stand = f(-7.5, -4.6, 0.9);
  eye = f(-5.5, -3.4, 0.9 + 1.6);
  look = f(10, 2, 0);
  fov = 58;
  onDeck = true;
} else if (at === 'cross-top') {
  const name = id.replace(/[ab]$/, ''),
    a = by(name + 'a'),
    b = by(name + 'b');
  const p = a(0, 2),
    q = b(0, 2),
    mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 };
  stand = b(-3, 2, 0);
  eye = { x: mid.x + 0.01, y: mid.y + 26, z: mid.z };
  look = mid;
  fov = 52;
  onDeck = true;
} else if (at.startsWith('table')) {
  // The table's frame: a point on bearing `b` (degrees clockwise from north, as the rotunda's) `r` m from its centre,
  // `up` over the table's rail height.
  const { table } = garageRow();
  const polar = (bearing: number, r: number, up = 0): V => ({ ...polarAt(table, { bearing, r }), y: TABLE_RAIL + up });
  if (at === 'table') {
    stand = polar(166, 9.4);
    eye = polar(180, 12.6, 2.4);
    look = polar(196, 4.5, -0.3);
    fov = 58;
  } else if (at === 'table-top') {
    stand = polar(280, 10);
    eye = polar(0, 0.01, 26);
    look = polar(0, 0);
    fov = 50;
  } else if (at === 'table-join') {
    const b = Number(query.get('b') ?? 190);
    stand = polar(b + 14, 9.6);
    eye = polar(b + 9, 9.4, 0.75);
    look = polar(b, 8, 0.1);
    fov = 55;
  } else throw new Error('Choose at=table|table-top|table-join');
} else
  throw new Error(
    'Choose at=spur|spur-top|spur-frog|throat-top|throat|top|eye|back|farhead|railhead|cross-top|table|table-top|table-join',
  );

// Step 6: true while a line 1 train coming home is 62 to 90 m short of J4's zone, for --until (any framing).
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { pointsTrains } = (await import(
  '/src/entities/railway/turnout-route.ts' as string
)) as typeof import('../../../src/entities/railway/turnout-route.ts');
(window as Window & { __homewardNearJ4?: () => boolean }).__homewardNearJ4 = () => {
  if (!R.railRead()?.ready()) return false;
  return pointsTrains(R.rw(), R.railAt()).some(
    (t) => t.line === 0 && t.dir < 0 && t.s > 47 + 13 + 62 && t.s < 47 + 13 + 90,
  );
};
const body = me.body;
if (!body) throw new Error('turnouts look: no player body');
await wait(500);
teleport(body, stand.x, (onDeck ? stand.y : land.H(stand.x, stand.z)) + 0.9, stand.z);
cam.yaw = me.yaw = Math.atan2(-(look.x - stand.x), -(look.z - stand.z));
const setCam = () => window.__debugCam?.set([eye.x, eye.y, eye.z], [look.x, look.y, look.z], fov);
setCam();
setTimeout(setCam, 100);
const hold = setInterval(setCam, 200);
setTimeout(() => clearInterval(hold), 120_000);
console.log(`TURNOUTS ${at} ${id} ${JSON.stringify({ stand, eye, look })}`);
export {};
