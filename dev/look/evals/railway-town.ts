// The live game's town (src/entities/town/): stand Buddy at a door, facing in, with the debug camera behind, then
// optionally act. Seed later stages with --rail-seed; no shared state is written here.
//   townat=house|shop|museum  1 m inside that door, facing in (a plot not yet built: in front of its stake board)
//   townat=street             on the lane between the three plots, looking at the house and the boards
//   townat=sleeves            on the path at Sleeves, the shore greeter, looking toward the house door
//   townact=walkout           after a moment indoors, walk 8 m out of the door, so the follow camera clears the shell
//                             too; with towndefer=1 it waits for an --action body `await window.__townAct(); export {};`
//   townact=try|take          (townat=shop) step up to the first stand, the paper hat, and press Try on; take presses
//                             again for Take it: $0, which shows the "You got" card. The debug camera looks at Buddy and the stand.
//   townact=try,walkout       acts run in order: try on, then walk out wearing it (it's yours anyway).
//   townact=enter             start 3 m outside the door, walk in and wait for whoever's inside to bark
//   townact=talk              walk up to a resident (townwho=pip|button|nell|moss|wren, default pip) and talk, towntalks=N
//                             times (default 1), closing the card between; the camera frames you both. Prints each first
//                             line as `said`, and what the residents remember (memory.ts) as it's stored.
//   townat=shelf              in front of the curio shelf, looking at it (C1)
//   townat=crates             above the line-2 station boxes waiting for you; townbox=Q3 picks one, standing 4 m off it
//   townact=open              (townat=crates) walk into that box: it opens and its card shows
//   townown=beanie,glasses    grant this capture's player those first, so the shelf has something uncovered
//   townact=open,reload       reload the page for real after opening; with --until (see the act) the eval runs again
//                             in the new document, frames the same spot and prints `TOWN reloaded <json>`
// Prints `TOWN <json>` with the town's inspection after the setup and again after the act.
const { inspectTown } = (await import(
  '/src/entities/town/state.ts' as string
)) as typeof import('../../../src/entities/town/state.ts');
const { railwayWorldRead, inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactDown, interactUp, interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { remotes } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { partnerWearing, wardrobe } = (await import(
  '/src/entities/wardrobe/state.ts' as string
)) as typeof import('../../../src/entities/wardrobe/state.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const talk = (await import('/src/place/talk.ts' as string)) as typeof import('../../../src/place/talk.ts');
const layout = (await import(
  '/src/place/layout.ts' as string
)) as typeof import('../../../src/place/layout.ts');
const land = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const shore = (await import(
  '/src/place/shore-layout.ts' as string
)) as typeof import('../../../src/place/shore-layout.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 20000;
while ((!inspectTown() || !railwayWorldRead()?.ready() || !me.body) && performance.now() < deadline) await wait(50);
if (!inspectTown() || !railwayWorldRead()?.ready() || !me.body)
  throw new Error('railway-town needs the live town and railway');
const body = me.body;
const query = new URLSearchParams(location.search);
const at = query.get('townat') ?? 'house';
// After townact=reload, look's --until re-imports this file in the new document: set up the same view, act no more.
const RELOAD_KEY = 'look.railway-town';
const reloaded = sessionStorage.getItem(RELOAD_KEY);
sessionStorage.removeItem(RELOAD_KEY);
// townactor=1: with --players 2, only that player acts (the other stays put, for "does a partner see my box go?").
const actor = query.get('townactor');
const act = reloaded || (actor && query.get('player') !== actor) ? null : query.get('townact');
// townown=beanie,glasses: give this player those (a capture's personal wardrobe only, for the shelf's still).
for (const id of (reloaded ? '' : (query.get('townown') ?? '')).split(',').filter(Boolean))
  wardrobe()?.grant(id, { wear: false });
type V = { x: number; y: number; z: number };
const ground = (x: number, z: number): V => ({ x, y: land.H(x, z), z });
/** A room's door in world space, and the way in. */
function door(id: 'house' | 'shop' | 'museum') {
  const p = layout.ROOM_PLOTS[id];
  const x = layout.toWorld(p.x),
    s = Math.sin(p.yaw),
    c = Math.cos(p.yaw);
  return { x: x + (p.d / 2) * s, z: p.z + (p.d / 2) * c, inX: -s, inZ: -c, d: p.d, cx: x, cz: p.z };
}
let stand: V, look: V, eye: V;
let crate: { station: string; x: number; y: number; z: number } | null = null;
if (at === 'house' || at === 'shop' || at === 'museum') {
  const d = door(at);
  const up = inspectTown()!.rooms[at].up;
  // Built: 1 m inside. A plot: 3.5 m in front of its board (the board stands 2 m out from the door line).
  // townact=enter starts 3 m outside the door instead, to walk in.
  const out = up ? (act === 'enter' ? 3 : -1) : 5.5;
  stand = ground(d.x - d.inX * out, d.z - d.inZ * out);
  look = { x: d.cx, y: stand.y + 1.2, z: d.cz };
  eye = { x: stand.x - d.inX * 4.5, y: stand.y + 3.2, z: stand.z - d.inZ * 4.5 };
} else if (at === 'street') {
  const h = door('house'),
    s = door('shop'),
    m = door('museum');
  const mid = { x: (h.x + s.x + m.x) / 3 + 7, z: (h.z + s.z + m.z) / 3 };
  stand = ground(mid.x, mid.z);
  look = { x: (h.cx + s.cx + m.cx) / 3, y: stand.y + 1.5, z: (h.cz + s.cz + m.cz) / 3 };
  eye = { x: stand.x + 9, y: stand.y + 7, z: stand.z + 2 };
} else if (at === 'sleeves') {
  const g = ground(layout.toWorld(shore.SHORE_WORKER.x), shore.SHORE_WORKER.z);
  const h = door('house');
  // On the path a step from Sleeves, toward the village: what a newcomer sees of the house from there.
  const toX = h.x - g.x,
    toZ = h.z - g.z,
    len = Math.hypot(toX, toZ);
  stand = ground(g.x + (toX / len) * 1.5, g.z + (toZ / len) * 1.5);
  look = { x: h.x, y: land.H(h.x, h.z) + 1.5, z: h.z };
  eye = { x: stand.x - (toX / len) * 5, y: stand.y + 3, z: stand.z - (toZ / len) * 5 };
} else if (at === 'shelf') {
  const s = inspectTown()!.shelf;
  if (!s) throw new Error('townat=shelf needs the wardrobe');
  // The shelf faces +z in its own space.
  const fx = Math.sin(s.yaw),
    fz = Math.cos(s.yaw);
  stand = ground(s.x + fx * 2.6, s.z + fz * 2.6);
  look = { x: s.x, y: s.y + 1.8, z: s.z };
  eye = { x: s.x + fx * 6.5 + fz * 1.5, y: s.y + 3.4, z: s.z + fz * 6.5 - fx * 1.5 };
} else if (at === 'crates') {
  // After a reload the box you opened is gone: frame the same spot.
  const boxes = (inspectRailway()?.reward.stationBoxes.boxes ?? []).filter((b) => b.visible || reloaded);
  const want = query.get('townbox');
  const box = want ? boxes.find((b) => b.station === want) : boxes[0];
  if (!box) throw new Error(`townat=crates: no waiting box${want ? ` at ${want}` : ''}`);
  // 4 m off the chosen box, on the side away from the rest, looking at it; the camera takes in the others too.
  const others = boxes.filter((b) => b !== box);
  const cx = others.length ? others.reduce((n, b) => n + b.x, 0) / others.length : box.x + 1,
    cz = others.length ? others.reduce((n, b) => n + b.z, 0) / others.length : box.z;
  const len = Math.hypot(box.x - cx, box.z - cz) || 1,
    ux = (box.x - cx) / len,
    uz = (box.z - cz) / len;
  stand = ground(box.x + ux * 4, box.z + uz * 4);
  look = { x: box.x, y: box.y + 0.8, z: box.z };
  eye = { x: box.x + ux * 9 - uz * 3, y: box.y + 5, z: box.z + uz * 9 + ux * 3 };
  crate = box;
} else throw new Error('Choose townat=house|shop|museum|street|sleeves|shelf|crates');
/** A point in the shop's room space (rooms.ts: floor at y = 0, door on +z), in the world. */
function shopLocal(lx: number, ly: number, lz: number): V {
  const p = layout.ROOM_PLOTS.shop,
    c = Math.cos(p.yaw),
    s = Math.sin(p.yaw);
  const x = layout.toWorld(p.x) + lx * c + lz * s,
    z = p.z - lx * s + lz * c;
  return { x, y: land.H(x, z) + ly, z };
}
const shopping = /^(try|take)(,|$)/.test(act ?? '');
if (shopping) {
  if (at !== 'shop' || !inspectTown()!.rooms.shop.ready) throw new Error('townact=try|take needs townat=shop, open');
  // Facing the first stand (3.8, -1.9 in room space) from 1.3 m in front of it, with the camera over the rug.
  stand = shopLocal(2.5, 0, -1.9);
  look = shopLocal(3.4, 1.3, -1.9);
  eye = shopLocal(-0.6, 2.6, 1.4);
}
teleport(body, stand.x, stand.y + 0.9, stand.z);
body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-(look.x - stand.x), -(look.z - stand.z));
cam.pitch = -0.15;
const free = query.get('towncam') === 'follow';
const setCam = () => {
  if (!free) window.__debugCam?.set([eye.x, eye.y, eye.z], [look.x, look.y, look.z], 60);
};
setCam();
setTimeout(setCam, 100);
// `look` frames its own --view after the eval: hold this one through the warm-up unless --cam was given.
if (query.get('townhold') !== '0') {
  const hold = setInterval(setCam, 200);
  setTimeout(() => clearInterval(hold), 6000);
}
await wait(600);
console.log(
  `TOWN ${reloaded ? 'reloaded ' : ''}${JSON.stringify({ at, stand, ...inspectTown(), boxes: inspectRailway()?.reward.stationBoxes ?? null, target: interactTarget()?.id ?? null })}`,
);
if (reloaded) (window as unknown as { __townReloaded?: boolean }).__townReloaded = true;

async function runAct() {
  // Deferred (towndefer=1), the capture's own camera has been placed since: frame the door again.
  setCam();
  for (const one of (act ?? '').split(',').filter(Boolean)) await actOnce(one);
}
async function actOnce(act: string) {
  if (act === 'walkout') {
    if (at !== 'house' && at !== 'shop' && at !== 'museum') throw new Error('townact=walkout needs a room');
    const d = door(at);
    // After shopping at a stand, from 1 m inside the door, so the way out is clear.
    if (shopping) teleport(body, d.x + d.inX, land.H(d.x, d.z) + 0.9, d.z + d.inZ);
    // Hold forward until 8 m past the door line: the walls come back only once the camera is clear too.
    cam.yaw = me.yaw = Math.atan2(d.inX, d.inZ);
    const end = performance.now() + 8000;
    input.keys.add('KeyW');
    try {
      while (performance.now() < end) {
        const p = body.position;
        if ((p.x - d.x) * -d.inX + (p.z - d.z) * -d.inZ >= 8) break;
        await wait(30);
      }
    } finally {
      input.keys.delete('KeyW');
    }
    await wait(800);
  } else if (act === 'enter') {
    if (at !== 'house' && at !== 'shop' && at !== 'museum') throw new Error('townact=enter needs a room');
    const d = door(at);
    // Walk in until over the threshold, then give whoever's inside a moment to look up (their hello or notice bark).
    cam.yaw = me.yaw = Math.atan2(-d.inX, -d.inZ);
    const end = performance.now() + 6000;
    input.keys.add('KeyW');
    try {
      while (inspectTown()!.indoors.inside !== at && performance.now() < end) await wait(30);
      await wait(250);
    } finally {
      input.keys.delete('KeyW');
    }
    await wait(1300);
  } else if (act === 'talk') {
    const who = (query.get('townwho') ?? 'pip') as keyof NonNullable<ReturnType<typeof inspectTown>>['residents'];
    const times = Math.max(1, Number(query.get('towntalks') ?? 1));
    const id = `place-talk-${who}`;
    const g = inspectTown()!.residents[who];
    if (!g?.on) throw new Error(`townact=talk: ${who} isn't standing here (is the room up and near?)`);
    // Walk up to them until their Talk is offered.
    const end = performance.now() + 8000;
    try {
      while (interactTarget()?.id !== id && performance.now() < end) {
        const p = body.position;
        cam.yaw = me.yaw = Math.atan2(-(g.x - p.x), -(g.z - p.z));
        input.keys.add('KeyW');
        await wait(30);
      }
    } finally {
      input.keys.delete('KeyW');
    }
    await wait(300);
    const said: string[] = [];
    const sayEl = () => document.querySelector<HTMLElement>('.place-talk-say');
    const optsUp = () => !document.querySelector<HTMLElement>('.place-talk-opts')?.hidden;
    for (let n = 0; n < times; n++) {
      if (n) {
        talk.endTalk();
        await wait(600);
      }
      const until = performance.now() + 4000;
      while (interactTarget()?.id !== id && performance.now() < until) await wait(50);
      interactDown();
      interactUp();
      const typed = performance.now() + 8000;
      while (!(talk.talking() && optsUp()) && performance.now() < typed) await wait(50);
      said.push(sayEl()?.textContent ?? '');
    }
    // Frame Buddy and the resident: from behind and above Buddy, looking between you.
    const p = body.position,
      dx = p.x - g.x,
      dz = p.z - g.z,
      len = Math.hypot(dx, dz) || 1;
    eye = { x: p.x + (dx / len) * 3.2 - (dz / len) * 1.2, y: p.y + 1.6, z: p.z + (dz / len) * 3.2 + (dx / len) * 1.2 };
    look = { x: (p.x + g.x) / 2, y: p.y + 0.4, z: (p.z + g.z) / 2 };
    setCam();
    await wait(400);
    dispatchEvent(new Event('pagehide'));
    const stored = Object.keys(localStorage).find((k) => k.startsWith('boogle.railway-town.v0:'));
    console.log(
      `TOWN ${JSON.stringify({ at, act, who, said, stored: stored ? JSON.parse(localStorage.getItem(stored)!) : null })}`,
    );
  } else if (act === 'reload') {
    // A real page reload (mid-reveal, if a box was just opened). Pair it with
    // --until "window.__townReloaded ?? (import('/dev/look/evals/railway-town.ts'), false)".
    console.log(`TOWN reloading ${JSON.stringify(inspectTown()?.wardrobe ?? null)}`);
    sessionStorage.setItem(RELOAD_KEY, '1');
    // After this eval returns, so look's evaluation isn't torn down under it.
    setTimeout(() => location.reload(), 300);
    return;
  } else if (act === 'open') {
    if (!crate) throw new Error('townact=open needs townat=crates');
    // Walk straight into it: the 1.25 m bump opens it, as in Place.
    const c = crate;
    cam.yaw = me.yaw = Math.atan2(-(c.x - body.position.x), -(c.z - body.position.z));
    const end = performance.now() + 6000;
    input.keys.add('KeyW');
    try {
      while (performance.now() < end && !inspectRailway()?.reward.stationBoxes.showing) await wait(30);
    } finally {
      input.keys.delete('KeyW');
    }
    console.log(`TOWN opened ${JSON.stringify(inspectRailway()?.reward.stationBoxes ?? null)}`);
    await wait(Number(query.get('townwait') ?? 900));
  } else if (act) {
    // Press Interact once the matching target is offered.
    const want: Record<string, RegExp> = {
      try: /^place-stock-paperhat$/,
      take: /^place-stock-paperhat$/,
    };
    const re = want[act];
    if (!re) throw new Error(`townact=${act} is not available yet`);
    for (let n = act === 'take' ? 2 : 1; n > 0; n--) {
      const end = performance.now() + 8000;
      while (!re.test(interactTarget()?.id ?? '') && performance.now() < end) await wait(50);
      // Press only what was asked for: a neighbour's stand (two players at one spot) is not the act.
      if (!re.test(interactTarget()?.id ?? '')) {
        console.log(`TOWN no ${act} target; offered ${interactTarget()?.id ?? 'nothing'}`);
        break;
      }
      interactDown();
      interactUp();
      await wait(800);
    }
  }
  // What each partner is seen wearing (their `wardrobe` presence), for two-player captures.
  const partners = [...remotes.keys()].map((peer) => partnerWearing(peer));
  console.log(`TOWN ${JSON.stringify({ at, act, player: { ...body.position }, ...inspectTown(), partners })}`);
}
// With towndefer=1 the act waits for an --action file to call window.__townAct() after warm-up (for --video).
(window as unknown as { __townAct?: () => Promise<void> }).__townAct = runAct;
if (act && query.get('towndefer') !== '1') await runAct();
export {};
