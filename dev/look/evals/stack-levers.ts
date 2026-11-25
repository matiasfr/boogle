// npm run look -- --rail-seed stack-laid-2 --eval dev/look/evals/stack-levers.ts --query 'head=1&lever=wide' --hud \
//   --until window.__leverDone --name head1-wide
// The request levers on a served stack head's two decks: outward on the east, homeward on the west.
// Stands the body on the platform (a staging teleport) and frames the pair from the platform side at eye height:
//   lever=wide     both levers, the player out of the frame (no prompt)
//   lever=back     the same pair from over the track (the faces a rider sees from a train)
//   lever=between  the player between the two levers, with whichever prompt the game offers there
//   lever=near     both plaques from 2 m off on the platform (a player walking up to the pair)
//   lever=out      the player at the outward lever, its prompt up; lever=home the same at the homeward one
//   lever=press    the player at the outward lever with no train standing at the head: presses Interact (run with
//                  `--real`), waits for a train to stand there on the original outward track and prints `PRESS ...` with the server
//                  ticks from the press to the stand
// Prints `LEVERS ...`: each lever's place and plaque, the offered prompt, and how far the departure board's stand is.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway, railRead, railAt, rw, railTrainsOf } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { RAIL_LEGS } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const { stackDisplays } = (await import(
  '/src/entities/railway/halt-map.ts' as string
)) as typeof import('../../../src/entities/railway/halt-map.ts');
const { line2At } = (await import(
  '/src/entities/railway/line2-path.ts' as string
)) as typeof import('../../../src/entities/railway/line2-path.ts');
const { RAIL_LINES, LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');

type Lever = { halt: number; dir: number; label: string; on: boolean; over: boolean; x: number; y: number; z: number };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const query = new URLSearchParams(location.search);
const head = Number(query.get('head') ?? 1);
const shotName = query.get('lever') ?? 'wide';
const halt = RAIL_LEGS[0]!.railheadHalt + head - 1;
const deadline = performance.now() + 60000;
while (!me.body || !me.entered || !railRead()?.whole()) {
  if (performance.now() > deadline) throw new Error('stack-levers: the player or the railway did not become ready');
  await wait(100);
}
const levers = () =>
  (inspectRailway()!.line2View as unknown as { ringLevers: Lever[] }).ringLevers.filter((l) => l.halt === halt && l.on);
for (let k = 0; levers().length < 2; k++) {
  if (k > 100)
    throw new Error(
      `stack-levers: head ${head} (stop ${halt}) shows ${levers().length} lever(s): ${JSON.stringify(levers())}`,
    );
  await wait(100);
}
const out = levers().find((l) => l.dir === 1)!,
  home = levers().find((l) => l.dir === -1)!;
const board = stackDisplays().find((d) => d.stop === halt)!;
const mid = { x: (out.x + home.x) / 2, z: (out.z + home.z) / 2 };
const len = Math.hypot(home.x - out.x, home.z - out.z);
const along = line2At(RAIL_LINES[LINE2]!.halts[halt]!.s / 100, { x: 0, z: 0, ux: 0, uz: 1 });
const t = { x: along.ux, z: along.uz },
  n = { x: -along.uz, z: along.ux };
const deck = out.y - 1.38; // the knob stands 1.38 m over the lever's foot
const at = (base: { x: number; z: number }, across: number, along: number) => ({
  x: base.x + n.x * across + t.x * along,
  z: base.z + n.z * across + t.z * along,
});
const SHOTS: Record<
  string,
  { body: { x: number; z: number }; cam: { x: number; z: number }; look: { x: number; z: number } }
> = {
  wide: { body: at(mid, 3.4, -9), cam: at(mid, 3.5, 0), look: mid },
  back: { body: at(mid, 3.4, -9), cam: at(mid, -3.2, 0), look: mid },
  between: { body: at(mid, 0.3, 0), cam: at(mid, 3.8, 0), look: mid },
  near: { body: at(mid, 3.4, -9), cam: at(mid, 2, 0), look: mid },
  out: { body: at(out, 0.8, 0), cam: at(out, 3.3, 1.2), look: at(out, 0, -0.6) },
  home: { body: at(home, -0.8, 0), cam: at(home, -3.3, -1.2), look: at(home, 0, 0.6) },
  press: { body: at(out, 0.8, 0), cam: at(mid, 5.2, -7), look: at(mid, -1.5, 2) },
};
const shot = SHOTS[shotName]!;
for (let k = 0; k < 20; k++) {
  teleport(me.body, shot.body.x, deck + 1.2, shot.body.z);
  me.body.velocity.set(0, 0, 0);
  await wait(100);
}
await wait(1500);
// Re-aimed every 16 ms: look.ts places its own view once the eval returns.
const aim = () =>
  window.__debugCam!.set([shot.cam.x, deck + 1.6, shot.cam.z], [shot.look.x, deck + 0.9, shot.look.z], 70);
aim();
setInterval(aim, 16);
await wait(800);
const p = me.body.position;
const target = interactTarget();
const r = (v: number) => +v.toFixed(2);
console.log(
  'LEVERS',
  JSON.stringify({
    head,
    halt,
    shot: shotName,
    deck: r(deck),
    apart: r(len),
    out: { label: out.label, x: r(out.x), y: r(out.y), z: r(out.z), over: out.over },
    home: { label: home.label, x: r(home.x), y: r(home.y), z: r(home.z), over: home.over },
    boardFromOut: r(Math.hypot(board.at.x - out.x, board.at.z - out.z)),
    boardFromHome: r(Math.hypot(board.at.x - home.x, board.at.z - home.z)),
    body: { x: r(p.x), y: r(p.y), z: r(p.z), overDeck: r(p.y - deck), swimming: me.swimming },
    prompt: target ? { id: target.id, verb: target.verb, blocked: target.blocked ?? null } : null,
  }),
);
if (shotName === 'press') {
  // The train a lever's outward ask stops: one standing at this stop on track 0, the original outward track.
  const standing = () => railTrainsOf(rw(), 1).some((r) => r.phase === 0 && r.at === halt && !r.track);
  const trains = () => railTrainsOf(rw(), 1).map((r) => ({ phase: r.phase, at: r.at, track: r.track }));
  for (let k = 0; standing(); k++) {
    if (k > 600) throw new Error('stack-levers: a train stood at the head for a minute before the press');
    await wait(100);
  }
  const before = trains();
  if (target?.blocked || !target?.id.endsWith('-up'))
    throw new Error(`stack-levers: the outward lever is not offered: ${JSON.stringify(target)}`);
  const pressed = railAt();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
  await wait(1500);
  const asked = levers().find((l) => l.dir === 1)!.over;
  const t0 = performance.now();
  while (!standing()) {
    if (performance.now() - t0 > 420000)
      throw new Error(`stack-levers: no train stood in 7 min: ${JSON.stringify(trains())}`);
    await wait(50);
  }
  const stood = railAt();
  console.log(
    'PRESS',
    JSON.stringify({
      head,
      halt,
      pressed,
      stood,
      ticks: stood - pressed,
      seconds: r((performance.now() - t0) / 1000 + 1.5),
      asked,
      before,
      after: trains(),
    }),
  );
  await wait(1500);
}
(window as Window & { __leverDone?: boolean }).__leverDone = true;
export {};
