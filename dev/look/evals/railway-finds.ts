// The production railway's finds (place-retirement K1): stand by a crystal, walk into it, and see its stub light on the
// curio shelf. Use with the production railway (no ?proto=):
//   findk=0..6               which crystal (default 0, the lookout)
//   findgold=<id>            a gold find instead (F1; Place's ids: 0-2, 10-12, 50-52), by the same acts
//   findsfrom=90             the side you stand on, in degrees round the crystal (default 0: +x); findsoff=7 how far (m)
//   findsact=walk            walk straight into it: it comes to you with its magnet and chime
//   findsact=walk,shelf      then go to the curio shelf and frame its bottom row
//   findsact=walk,board      then frame the whole shelf with the finds board beside it
//   findsact=walk,reload     then reload the page for real; with
//                            --until "window.__findsReloaded ?? (import('/dev/look/evals/railway-finds.ts'), false)"
//                            the eval runs again in the new document, frames the shelf and prints `FINDS reloaded <json>`
//   findsdefer=1             wait for an --action body `await window.__findsAct(); export {};` (for --video)
//   findsactor=1             with --players 2, only that player acts (the other stands a quarter turn round the same
//                            crystal, out of its reach)
// Prints `FINDS <json>` (the finds' inspection) after the setup and after each act.
const { inspectFinds } = (await import(
  '/src/entities/finds/state.ts' as string
)) as typeof import('../../../src/entities/finds/state.ts');
const { inspectTown } = (await import(
  '/src/entities/town/state.ts' as string
)) as typeof import('../../../src/entities/town/state.ts');
const { railwayRead } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const land = (await import('/src/proto/place/land.ts' as string)) as typeof import('../../../src/proto/place/land.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 20000;
const ready = () => !!inspectFinds()?.spots && !!inspectTown()?.shelf && !!railwayRead()?.ready && !!me.body;
while (!ready() && performance.now() < deadline) await wait(50);
if (!ready()) throw new Error('railway-finds needs the live finds, town shelf and railway');
const body = me.body!;
const query = new URLSearchParams(location.search);
const RELOAD_KEY = 'look.railway-finds';
const reloaded = sessionStorage.getItem(RELOAD_KEY);
sessionStorage.removeItem(RELOAD_KEY);
const actor = query.get('findsactor');
const acts = reloaded || (actor && query.get('player') !== actor) ? [] : (query.get('findsact') ?? '').split(',');
const k = Number(query.get('findk') ?? 0);
const goldId = query.get('findgold');
const goldK = goldId === null ? -1 : inspectFinds()!.gold!.findIndex((f) => f.id === Number(goldId));
if (goldId !== null && goldK < 0) throw new Error(`findgold=${goldId}: no such gold find`);
const spot = goldK >= 0 ? inspectFinds()!.gold![goldK] : inspectFinds()!.spots![k];
if (!spot) throw new Error(`findk=${k}: no such crystal`);
/** Still waiting where it stands: not flying, not found. */
const waiting = () => (goldK >= 0 ? !inspectFinds()!.gold![goldK]!.found : inspectFinds()!.spots![k]!.state === 0);
type V = { x: number; y: number; z: number };
const ground = (x: number, z: number): V => ({ x, y: land.H(x, z), z });
let stand: V, look: V, eye: V;

function frameSpot() {
  // Two players stand a quarter turn apart, so neither shoves the other into the crystal's magnet.
  const a = ((Number(query.get('findsfrom') ?? 0) + (query.get('player') === '2' ? 90 : 0)) * Math.PI) / 180,
    off = Number(query.get('findsoff') ?? 7);
  const ux = Math.cos(a),
    uz = Math.sin(a);
  stand = ground(spot!.x + ux * off, spot!.z + uz * off);
  look = { x: (spot!.x + stand.x) / 2, y: spot!.y, z: (spot!.z + stand.z) / 2 };
  // From the side, a little back: the player on one edge, the crystal on the other.
  eye = { x: look.x - uz * 7 + ux * 1.5, y: Math.max(stand.y, spot!.y) + 2.6, z: look.z + ux * 7 + uz * 1.5 };
}
function frameShelf(board = false) {
  const s = inspectTown()!.shelf!;
  // The shelf faces +z in its own space; the crystals' row is on its bottom board. The finds board is 3.6 m along its +x.
  const fx = Math.sin(s.yaw),
    fz = Math.cos(s.yaw);
  const cx = s.x + (board ? fz * 0.9 : 0),
    cz = s.z - (board ? fx * 0.9 : 0),
    back = board ? 7.4 : 4.6;
  stand = ground(cx + fx * 2.6 - fz * 3.6, cz + fz * 2.6 + fx * 3.6);
  if (!board) stand = ground(s.x + fx * 2.6 + fz * 1.2, s.z + fz * 2.6 - fx * 1.2);
  look = { x: cx, y: s.y + (board ? 1.6 : 1.1), z: cz };
  eye = { x: cx + fx * back - fz * 0.8, y: s.y + 2, z: cz + fz * back + fx * 0.8 };
}
const free = query.get('findscam') === 'follow';
const setCam = () => {
  if (!free) window.__debugCam?.set([eye.x, eye.y, eye.z], [look.x, look.y, look.z], 55);
};
function goTo() {
  teleport(body, stand.x, stand.y + 0.9, stand.z);
  body.velocity.set(0, 0, 0);
  const to = acts[0] === 'walk' ? spot! : look;
  cam.yaw = me.yaw = Math.atan2(-(to.x - stand.x), -(to.z - stand.z));
  cam.pitch = -0.15;
  setCam();
  setTimeout(setCam, 100);
}
if (reloaded) frameShelf(query.get('findsact')?.includes('board'));
else frameSpot();
goTo();
if (query.get('findshold') !== '0') {
  const hold = setInterval(setCam, 200);
  setTimeout(() => clearInterval(hold), 6000);
}
await wait(600);
const stored = () => {
  const key = Object.keys(localStorage).find((x) => x.startsWith('boogle.railway-finds.v0:'));
  return key ? JSON.parse(localStorage.getItem(key)!) : null;
};
console.log(`FINDS ${reloaded ? 'reloaded ' : ''}${JSON.stringify({ k, ...inspectFinds(), stored: stored() })}`);
if (reloaded) (window as unknown as { __findsReloaded?: boolean }).__findsReloaded = true;

async function runAct() {
  setCam();
  for (const act of acts.filter(Boolean)) {
    if (act === 'walk') {
      const end = performance.now() + 6000;
      input.keys.add('KeyW');
      try {
        while (performance.now() < end && waiting()) {
          cam.yaw = me.yaw = Math.atan2(-(spot!.x - body.position.x), -(spot!.z - body.position.z));
          await wait(30);
        }
      } finally {
        input.keys.delete('KeyW');
      }
      await wait(Number(query.get('findswait') ?? 1200));
    } else if (act === 'shelf' || act === 'board') {
      frameShelf(act === 'board');
      goTo();
      await wait(800);
    } else if (act === 'reload') {
      sessionStorage.setItem(RELOAD_KEY, '1');
      console.log(`FINDS reloading ${JSON.stringify(stored())}`);
      setTimeout(() => location.reload(), 300);
      return;
    } else throw new Error(`findsact=${act}: choose walk, shelf, board or reload`);
    console.log(
      `FINDS ${JSON.stringify({ k, act, player: { ...body.position }, ...inspectFinds(), stored: stored() })}`,
    );
  }
}
(window as unknown as { __findsAct?: () => Promise<void> }).__findsAct = runAct;
if (acts.length && query.get('findsdefer') !== '1') await runAct();
export {};
