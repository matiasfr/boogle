// The production railway's finds (place-retirement K1): stand by a crystal, walk into it, and see its stub light on the
// curio shelf. Use with the production railway (no ?proto=):
//   findk=0..6               which crystal (default 0, the lookout)
//   findsecret=<id>          a secret's box in the world instead (F2; tech-layout.ts SECRETS ids: yard, bell, ...);
//                            findsecretbay=1 its second box at the finders' bay (once it's there)
//   findsact=…,open          step up to the box and press Interact (a bay box opens only so)
//   findsact=…,dismiss       put the reward card away (Interact)
//   findsact=…,bay           frame the finders' bay with the boxes waiting in front of it
//   findsact=…,spot          frame the first spot again (after a bay box, its world box: to see it gone)
//   findsfrom=90             the side you stand on, in degrees round the crystal (default 0: +x); findsoff=7 how far (m)
//   findsact=walk            walk straight into it: it comes to you with its magnet and chime
//   findsact=walk,shelf      then go to the curio shelf and frame its bottom row
//   findsact=wholeshelf      frame the whole shelf, a little back
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
const { railwayWorldRead } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const land = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 20000;
const ready = () => !!inspectFinds()?.spots && !!inspectTown()?.shelf && !!railwayWorldRead()?.ready() && !!me.body;
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
const secretId = query.get('findsecret'),
  secretAtBay = query.get('findsecretbay') === '1';
await wait(200); // a frame for the bay's boxes to find their places
const secretBox = () => {
  const box = inspectFinds()!.boxes!.find((b) => b.id === secretId);
  if (!box) throw new Error(`findsecret=${secretId}: no such secret`);
  const at = secretAtBay ? box.bay : box.world;
  if (!at) throw new Error(`findsecret=${secretId}: it has no box in the world (findsecretbay=1)`);
  return at;
};
const spot = secretId ? { ...secretBox() } : inspectFinds()!.spots![k];
if (!spot) throw new Error(`findk=${k}: no such crystal`);
/** Still waiting where it stands: not flying, not found. */
const waiting = () => (secretId ? secretBox().waiting : inspectFinds()!.spots![k]!.state === 0);
type V = { x: number; y: number; z: number };
const ground = (x: number, z: number): V => ({ x, y: land.H(x, z), z });
let stand: V, look: V, eye: V;

function frameSpot(from = Number(query.get('findsfrom') ?? 0), off = Number(query.get('findsoff') ?? 7)) {
  // Two players stand a quarter turn apart, so neither shoves the other into the crystal's magnet.
  const a = ((from + (query.get('player') === '2' ? 90 : 0)) * Math.PI) / 180;
  const ux = Math.cos(a),
    uz = Math.sin(a);
  stand = ground(spot!.x + ux * off, spot!.z + uz * off);
  look = { x: (spot!.x + stand.x) / 2, y: spot!.y, z: (spot!.z + stand.z) / 2 };
  // From the side, a little back: the player on one edge, the crystal on the other.
  eye = { x: look.x - uz * 7 + ux * 1.5, y: Math.max(stand.y, spot!.y) + 2.6, z: look.z + ux * 7 + uz * 1.5 };
}
function frameShelf(whole = false) {
  const s = inspectTown()!.shelf!;
  // The shelf faces +z in its own space; the crystals' row is on its bottom board. `whole` frames all of it.
  const fx = Math.sin(s.yaw),
    fz = Math.cos(s.yaw);
  const back = whole ? 7.4 : 4.6;
  stand = ground(s.x + fx * 2.6 + fz * 1.2, s.z + fz * 2.6 - fx * 1.2);
  if (whole) stand = ground(s.x + fx * 2.6 - fz * 3.6, s.z + fz * 2.6 + fx * 3.6);
  look = { x: s.x, y: s.y + (whole ? 1.6 : 1.1), z: s.z };
  eye = { x: s.x + fx * back - fz * 0.8, y: s.y + 2, z: s.z + fz * back + fx * 0.8 };
}
function frameBay() {
  const s = inspectTown()!.shelf!.bay;
  // The bay faces +z in its own space; missed boxes wait 1.5–3.7 m in front of it, three by three, and the trophy
  // plinth 5.3 m out on its centreline (home-station.ts, bayBoxPoint). All of this framing is in the bay's frame.
  const fx = Math.sin(s.yaw),
    fz = Math.cos(s.yaw);
  stand = ground(s.x + fx * 4.2 + fz * 4.6, s.z + fz * 4.2 - fx * 4.6);
  look = { x: s.x + fx * 2.6, y: s.y + 1.0, z: s.z + fz * 2.6 };
  eye = { x: s.x + fx * 10.5 - fz * 2.4, y: s.y + 4.2, z: s.z + fz * 10.5 + fx * 2.4 };
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
if (reloaded && query.get('findsact')?.includes('bay')) frameBay();
else if (reloaded) frameShelf(query.get('findsact')?.includes('wholeshelf'));
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
    } else if (act === 'shelf' || act === 'wholeshelf') {
      frameShelf(act === 'wholeshelf');
      goTo();
      await wait(800);
    } else if (act === 'bay' || act === 'spot') {
      if (act === 'bay') frameBay();
      else {
        // After a bay box, frame its box in the world, from `findsworldfrom` (default 0), 6 m off.
        if (secretId && secretAtBay) {
          Object.assign(spot!, inspectFinds()!.boxes!.find((b) => b.id === secretId)!.world);
          frameSpot(Number(query.get('findsworldfrom') ?? 0), 6);
        } else frameSpot();
      }
      goTo();
      await wait(800);
    } else if (act === 'open') {
      // Step up to it (1.3 m short, on the side you stand) and press Interact until it opens.
      const dx = body.position.x - spot!.x,
        dz = body.position.z - spot!.z,
        far = Math.hypot(dx, dz) || 1;
      const at = ground(spot!.x + (dx / far) * 1.3, spot!.z + (dz / far) * 1.3);
      teleport(body, at.x, at.y + 0.9, at.z);
      body.velocity.set(0, 0, 0);
      cam.yaw = me.yaw = Math.atan2(dx, dz);
      const end = performance.now() + 4000;
      while (performance.now() < end && waiting()) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
        await wait(60);
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
        await wait(240);
      }
      await wait(Number(query.get('findswait') ?? 1200));
    } else if (act === 'dismiss') {
      // The card takes 1.5 s to become dismissable; press Interact until it's gone.
      const end = performance.now() + 6000;
      while (performance.now() < end && document.body.classList.contains('place-getting')) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
        await wait(60);
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
        await wait(240);
      }
      await wait(400);
    } else if (act === 'reload') {
      sessionStorage.setItem(RELOAD_KEY, '1');
      console.log(`FINDS reloading ${JSON.stringify(stored())}`);
      setTimeout(() => location.reload(), 300);
      return;
    } else throw new Error(`findsact=${act}: choose walk, open, shelf, wholeshelf, bay, spot, dismiss or reload`);
    console.log(
      `FINDS ${JSON.stringify({ k, act, player: { ...body.position }, ...inspectFinds(), stored: stored() })}`,
    );
  }
}
(window as unknown as { __findsAct?: () => Promise<void> }).__findsAct = runAct;
if (acts.length && query.get('findsdefer') !== '1') await runAct();
export {};
