// Request levers by the lever rule, and a footing's prompt where a lever used to compete (docs/plans/running-side.md,
// steps 1 and 2; owner, 14 November). One spot a run, `--query spot=<spot>`, with `--hud` for the prompt:
//   npm run look -- --hud --rail-seed trains-on --query 'debugcam=1&spot=camp' --eval dev/look/evals/lever-places.ts --until window.__leverPlace
//   spot=pier (--rail-seed q6-done), spot=pier-jib (--rail-seed crossing-finishing), spot=railhead and
//   spot=railhead-jib (--rail-seed deck-laid)
// The lever spots stand you behind the lever, facing the rails, and wait for "Request stop: to <end>". The jib spots
// shoulder a footing at the rack, stand you where the lever stood before it moved, and wait for the jib's prompt; they
// print how far the nearest lever's knob is. Staging teleports only. Prints `LEVERPLACE ...`.
export {};
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { haltFrame } = (await import(
  '/src/prefab/halt-deck.ts' as string
)) as typeof import('../../../src/prefab/halt-deck.ts');
const ring = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const works = (await import(
  '/src/sim/railway-works-layout.ts' as string
)) as typeof import('../../../src/sim/railway-works-layout.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
type Knob = { label: string; on: boolean; x: number; y: number; z: number };
type Halts = {
  halts?: { name: string; y: number; up: boolean; lever: Knob[] }[];
  ringLevers?: (Knob & { halt: number; platform: string; u: number; goal: number })[];
};
const spot = new URLSearchParams(location.search).get('spot') ?? 'camp';
const bot = makeBot();
if (!(await railReady())) throw new Error('lever-places: the railway never became ready');
const view = () => (inspectRailway()?.line2View ?? null) as Halts | null;
const say = (o: object) => console.log(`LEVERPLACE ${JSON.stringify({ spot, ...o })}`);
const f2 = (n: number) => +n.toFixed(2);
let shot: { camera: [number, number, number]; target: [number, number, number]; fov: number } | null = null;
setInterval(() => shot && window.__debugCam?.set(shot.camera, shot.target, shot.fov), 100);
function stand(x: number, y: number, z: number, face: { x: number; z: number }) {
  teleport(me.body!, x, y + 0.85, z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(-(face.x - x), -(face.z - z));
}
async function offered(verb: RegExp) {
  for (let k = 0; k < 100; k++) {
    if (verb.test(interactTarget()?.verb ?? '')) return interactTarget()!.verb;
    await bot.wait(100);
  }
  throw new Error(`lever-places ${spot}: not offered ${verb}; offered ${interactTarget()?.verb ?? 'nothing'}`);
}
const knobs = () => [...(view()?.halts?.flatMap((h) => h.lever) ?? []), ...(view()?.ringLevers ?? [])];
const nearestKnob = () => {
  const p = me.body!.position;
  return f2(Math.min(...knobs().map((k) => Math.hypot(k.x - p.x, k.z - p.z))));
};
/** Behind a lever (platform side), a little along, facing it; the camera further back, on the plaque. */
async function atLever(knob: Knob, deck: number, back: { x: number; z: number }, along: { x: number; z: number }) {
  stand(knob.x + back.x * 0.9 + along.x * 0.9, deck, knob.z + back.z * 0.9 + along.z * 0.9, knob);
  shot = {
    camera: [knob.x + back.x * 3.4 - along.x * 0.6, knob.y + 0.5, knob.z + back.z * 3.4 - along.z * 0.6],
    target: [knob.x, knob.y - 0.5, knob.z],
    fov: 50,
  };
  say({ prompt: await offered(/^Request stop: to /), plaque: knob.label, knob: [f2(knob.x), f2(knob.y), f2(knob.z)] });
}
/** With a footing from `rack` on your back, at `old` (where the lever stood), facing the jib's foot. */
async function atJib(
  rack: { x: number; z: number; y: number },
  from: { x: number; z: number },
  old: { x: number; z: number },
  jib: { x: number; z: number; y: number },
  verb: RegExp,
) {
  stand(from.x, rack.y / 100 + 0.8, from.z, { x: rack.x / 100, z: rack.z / 100 });
  await bot.wait(600);
  if (!(await bot.use(rack.x / 100, rack.z / 100, 'shoulder a footing', /Shoulder a footing/)))
    throw new Error(`lever-places ${spot}: no footing at the rack`);
  await bot.wait(800);
  const j = { x: jib.x / 100, z: jib.z / 100 };
  stand(old.x, jib.y / 100 + 0.8, old.z, j);
  const d = Math.hypot(j.x - old.x, j.z - old.z),
    bx = (old.x - j.x) / d,
    bz = (old.z - j.z) / d;
  shot = {
    camera: [old.x + bx * 4.5 + bz * 1.5, jib.y / 100 + 3.4, old.z + bz * 4.5 - bx * 1.5],
    target: [j.x, jib.y / 100 + 1.2, j.z],
    fov: 60,
  };
  say({ prompt: await offered(verb), nearestLeverKnob: nearestKnob(), stoodAt: [f2(old.x), f2(old.z)] });
}
if (spot === 'camp' || spot === 'pier') {
  const row = spot === 'camp' ? 1 : 5,
    name = spot === 'camp' ? 'Camp' : 'Pier';
  const end = performance.now() + 30000;
  while (!view()?.halts?.find((h) => h.name === name)?.up && performance.now() < end) await bot.wait(100);
  await bot.wait(2500);
  const h = view()!.halts!.find((x) => x.name === name)!;
  const { yaw, h: src } = haltFrame(row, false),
    sign = Math.sign(src.lat);
  await atLever(
    h.lever[0]!,
    h.y,
    { x: -sign * Math.cos(yaw), z: sign * Math.sin(yaw) },
    { x: Math.sin(yaw), z: Math.cos(yaw) },
  );
} else if (spot === 'pier-jib') {
  const c = { x: 1405.49, z: -358.59 }; // PIER_EAST's middle, on the platform by the rack
  // Where the Pier's lever stood: 1.4 m in from the platform's seaward end.
  await atJib(works.PIER_RACK, c, { x: 1404.61, z: -368.16 }, works.PIER_FRAME, /^Set the footing$/);
} else {
  const lever = () => view()?.ringLevers?.find((l) => l.halt === 4 && l.platform === 'down');
  const end = performance.now() + 30000;
  while (!lever()?.on && performance.now() < end) await bot.wait(100);
  const k = ring.RING_HEAD.findIndex((h) => Math.abs((h.u - 2500 + 140) / 100 - lever()!.goal) < 0.01),
    head = ring.RING_HEAD[k]!;
  const at = (du: number, lat: number) => {
    const p = ring.ringAt(head.u + du, lat);
    return { x: p.x / 100, z: p.z / 100 };
  };
  if (spot === 'railhead') {
    const a = at(-2400, 260),
      b = at(-2300, 260),
      along = { x: b.x - a.x, z: b.z - a.z };
    // East of the lever is the platform: the rails lie west, at lat 0.
    const e = at(-2360, 360),
      w = at(-2360, 260),
      back = { x: e.x - w.x, z: e.z - w.z };
    await atLever(lever()!, head.platform.y / 100, back, along);
    say({ head: k });
  } else {
    // The railhead's rack is empty until a wagon comes: the footing is shouldered at the Works rack.
    const r = works.WORKS_RACK,
      from = { x: r.x / 100 - 2.5, z: r.z / 100 };
    await atJib(r, from, at(-600, 245), head.jib, /^(Set the footing|Hang the weight)$/);
  }
}
(window as unknown as { __leverPlace: boolean }).__leverPlace = true;
