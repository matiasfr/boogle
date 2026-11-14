// Right-hand running and the lever on its train's platform (docs/plans/running-side.md, step 4). One spot a run:
//   npm run look -- --hud --rail-seed q6-done --query 'debugcam=1&spot=quarry&way=out' \
//     --eval dev/look/evals/running-side.ts --until window.__runningSide --name running-quarry-out
//   spot: village | quarry | farhead (halts of line 2); way: out | home (the train asked for).
//   mode=arrive flags as the asked train runs in, 90 m out (for --video); mode=out (the Village) looks out along the
//   line as the train leaves for the double track; mode=leave (an end halt) looks back along the line as a train
//   leaves by the end's crossover, `far` metres from its stand; the default flags as it draws up, 25 m out.
// Stands you by the lever for that way (the one inspect() says calls it), pulls it, and frames the lever, its platform
// and both tracks from behind and above. Staging teleports only. Prints `RUNNINGSIDE ...`.
export {};
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { haltFrame } = (await import(
  '/src/prefab/halt-deck.ts' as string
)) as typeof import('../../../src/prefab/halt-deck.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');

type Knob = {
  dir: number;
  platform: 'up' | 'down';
  label: string;
  on: boolean;
  over: boolean;
  x: number;
  y: number;
  z: number;
};
type Halt = { name: string; line: number; stop: number; y: number; up: boolean; lever: Knob[] };
type Train = {
  line: number;
  phase: number;
  at: number;
  to: number;
  track: number;
  along: number;
  cars: { x: number; z: number }[];
};
type View = { halts?: Halt[]; trains?: Train[] };
const q = new URLSearchParams(location.search);
const spot = q.get('spot') ?? 'quarry',
  dir = q.get('way') === 'home' ? -1 : 1,
  mode = q.get('mode') ?? 'stand';
const NAME = { village: 'Village', quarry: 'Quarry', farhead: 'Far Head' }[spot];
if (!NAME) throw new Error(`running-side: no spot ${spot}`);
const bot = makeBot();
const view = () => (inspectRailway()?.line2View ?? null) as View | null;
const say = (o: object) => console.log(`RUNNINGSIDE ${JSON.stringify({ spot, dir, mode, ...o })}`);
const f1 = (n: number) => +n.toFixed(1);
if (!(await railReady())) throw new Error('running-side: the railway never became ready');
const row = () => view()?.halts?.findIndex((h) => h.line === 1 && h.name.startsWith(NAME)) ?? -1;
const knob = () => view()?.halts?.[row()]?.lever.find((k) => k.dir === dir && k.on);
if (!(await bot.until(() => knob(), 60000, 'the lever stands')))
  throw new Error(
    `running-side: ${NAME} has no lever for way ${dir}: ${JSON.stringify(view()?.halts?.[row()]?.lever)}`,
  );
const k = knob()!,
  halt = view()!.halts![row()]!;
// The platform's frame: +s along the line, and across toward the rails. A platform at lateral `lat` stands
// (-uz, ux) * lat off the line, so the rails are the other way.
const upRow = layout.UP_HALTS.findIndex((u) => u.pair === row());
const second = k.platform === 'up';
const frame = haltFrame(second ? upRow : row(), second);
const along = { x: Math.sin(frame.yaw), z: Math.cos(frame.yaw) };
const lat = Math.sign(second ? layout.UP_HALTS[upRow]!.lat : layout.HALTS[row()]!.lat);
const rails = { x: along.z * lat, z: -along.x * lat };
teleport(me.body!, k.x - rails.x * 0.9 - along.x * dir * 0.6, k.y + 0.6, k.z - rails.z * 0.9 - along.z * dir * 0.6);
me.body!.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-rails.x, -rails.z);
// From behind and above the platform's middle: the lever, its platform, both tracks and the platform across.
const c = frame.c;
let shot = {
  camera: [c.x - rails.x * 13, k.y + 13, c.z - rails.z * 13] as [number, number, number],
  target: [c.x + rails.x * 3, k.y - 1, c.z + rails.z * 3] as [number, number, number],
};
setInterval(() => window.__debugCam?.set(shot.camera, shot.target, 62), 50);
await bot.wait(800);
if (!(await bot.use(k.x, k.z, 'the lever', /^Request stop: to /)))
  throw new Error('running-side: the lever was not offered');
// At the line's end a train may already stand leaving that way: the lever is then not over, and nothing is owed.
const over = await bot.until(() => knob()?.over, 5000, 'the lever stands over');
say({ over: !!over, plaque: k.label, platform: k.platform, knob: [f1(k.x), f1(k.y), f1(k.z)], halt: halt.name });
const trains = () => view()!.trains!.filter((t) => t.line === 1);
const STAND = 0;
const way = (t: Train) => (t.track ? -1 : 1);
const off = (t: Train) => Math.hypot(t.cars[0]!.x - c.x, t.cars[0]!.z - c.z);
/** The asked train: running in to this stop that way within `m` metres of the platform's middle, or standing at it. */
const asked = (m: number) =>
  trains().find((t) => way(t) === dir && (t.phase === STAND ? t.at === halt.stop : t.to === halt.stop && off(t) < m));
const done = window as Window & { __runningSide?: boolean };
const report = (t: Train) => {
  // Across from the lever to the engine: the lever's own track is about 2 m off, the other one about 6 m.
  const e = t.cars[0]!;
  return {
    track: t.track,
    along: f1(t.along / 100),
    engineAcrossFromLever: f1((e.x - k.x) * rails.x + (e.z - k.z) * rails.z),
  };
};
if (mode === 'out') {
  // The Village: the train leaves the island for the double track. Look out along the line from over the island's
  // end, and flag as the train that stood here is 30 m out, on the turnout.
  if (!(await bot.until(() => asked(0), 2400000, 'a train stands'))) throw new Error('running-side: no train stood');
  const line = layout.LINKS[1]!.line,
    P = { x: 0, z: 0, ux: 0, uz: 1 };
  const at = (s: number, up: number): [number, number, number] => {
    layout.lineAt(line, s, P);
    return [P.x + layout.ORIGIN.x, layout.railY(line, s) + up, P.z + layout.ORIGIN.z];
  };
  shot = { camera: at(26, 9), target: at(85, 0) };
  const gone = () => trains().find((t) => t.phase !== STAND && t.track === 0 && t.along > 4400 && t.along < 7000);
  if (!(await bot.until(gone, 2400000, 'it leaves'))) throw new Error('running-side: it never left');
  say({ left: report(gone()!) });
} else if (mode === 'leave') {
  // An end halt (Far Head before the pier): a train leaves it that way, by the end's crossover or turnout. Look back
  // along the line from over the platform's home end, and flag once it has run `far` metres from its stand.
  const far = +(q.get('far') ?? 8);
  if (!(await bot.until(() => asked(0), 2400000, 'a train stands'))) throw new Error('running-side: no train stood');
  const from = asked(0)!.along;
  // Nearly straight down on the 30 m of line past the platform's end, the platform's side at the bottom of the frame.
  const mid = { x: c.x + along.x * dir * 20 + rails.x * 4.9, z: c.z + along.z * dir * 20 + rails.z * 4.9 };
  shot = { camera: [mid.x - rails.x * 3, k.y + 30, mid.z - rails.z * 3], target: [mid.x, k.y, mid.z] };
  const gone = () =>
    trains().find(
      (t) => t.phase !== STAND && way(t) === dir && t.at === halt.stop && Math.abs(t.along - from) > far * 100,
    );
  if (!(await bot.until(gone, 2400000, 'it leaves'))) throw new Error('running-side: it never left');
  say({ left: report(gone()!) });
} else {
  const m = mode === 'arrive' ? 90 : 25;
  if (!(await bot.until(() => asked(m), 2400000, 'the asked train comes'))) throw new Error('running-side: no train');
  say({ asked: report(asked(m)!) });
}
done.__runningSide = true;
