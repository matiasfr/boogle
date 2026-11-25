// Garage step 4's Checkpoint (docs/plans/garage-step4.md): two peers at the Roundhouse post on `trade-ready`. Runs on
// both pages; `look` captures page 1's sheet through the departure and both pages' stills at its end.
//   npm run look -- --players 2 --real --rail-seed trade-ready --hud --eval dev/look/evals/garage-trade-two.ts \
//     --until window.__twoDone --seconds 100 --frames 25 --wall 900 --name gt-two
// Player 1 opens the garage at the post and clicks the bay line's chip (a real rail.bring). Player 2 opens it too and,
// while the copies swap, selects Strong and holds Interact: the screen must offer no Install and say the table's busy.
// Then player 2 holds Interact the moment Install lights (a person's press, no wait), letting go and holding again if
// the screen drops the hold, and logs each hold with the page's ticks against the table's hold (the early-Install
// finding). Once the bay line wears Strong both stand at the West landing and log every bay train's row change (a
// change while not standing is a mid-run fit) and the first departure after the fit, with its cars.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { garageRow, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { inspectRailway, line, railAt, railReady, rw, shed, tableFree } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { RAIL_LEGS, ROW_LINE, legFrame } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const { BRING_TICKS } = (await import(
  '/src/sim/railway-works-layout.ts' as string
)) as typeof import('../../../src/sim/railway-works-layout.ts');

const BAY = ROW_LINE.bay,
  STRONG = 5;
const second = new URLSearchParams(location.search).get('player') === '2';
const who = second ? 'two' : 'one';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text: string, data?: unknown) =>
  console.log(`TRADETWO ${who}: ${text}${data ? ` ${JSON.stringify(data)}` : ''}`);
const done = window as Window & { __twoDone?: boolean };
async function until(ok: () => unknown, what: string, ms: number) {
  const end = performance.now() + ms;
  while (!ok()) {
    if (performance.now() > end) throw new Error(`garage-trade-two ${who}: ${what}`);
    await wait(16);
  }
}
const snap = () => garage.api!.snap();
/** The page's two clocks against the table's hold: `railAt` (the conservative shown tick, for actions) and
 * `tickNow` (the RTT-compensated room time the garage reads for its hold). */
const clocks = () => ({
  railAt: railAt(),
  tickNow: Math.round(railwayCommands()!.read.tickNow() * 10) / 10,
  free: tableFree(rw()),
  bringEnds: shed(rw()).brought + BRING_TICKS,
});
const screen = () => {
  const btn = document.querySelector<HTMLElement>('.g-btn');
  const chip = document.querySelector<HTMLElement>(`.g-chips [data-line="${BAY}"]`);
  return {
    tableLine: snap().facts.tableLine,
    bayChipPressed: chip?.getAttribute('aria-pressed'),
    chipsTitle: document.querySelector<HTMLElement>('.g-chips')?.title,
    installShown: !!btn && !btn.hidden,
    button: btn?.textContent?.trim(),
    parts: document.querySelector('.g-parts')?.textContent?.replace(/\s+/g, ' ').trim(),
    need: document.querySelector('.g-need')?.textContent?.trim(),
  };
};

if (!(await railReady(60_000))) throw new Error('garage-trade-two: the railway never became ready');
await until(() => me.body && me.entered, 'the player entered', 60_000);
const { geo, table: centre, y: groundY } = garageRow();
const post = polarAt(centre, geo.post);
const stood = polarAt(centre, { bearing: geo.post.bearing + (second ? -7 : 7), r: geo.post.r - 0.25 });
teleport(me.body!, stood.x, groundY + 0.7, stood.z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(stood.x - post.x, stood.z - post.z);
// A player seeded into a room is shown each ability's flourish first (ability-arrival.ts); let them play out.
await wait(14000);
window.__debugCam?.clear();
triggerAction('interact', 'down');
triggerAction('interact', 'up');
await until(() => garage.api?.isOpen(), 'Interact at the post opened the garage', 8000);
await wait(900);
say('garage open', { table: snap().facts.tableLine, line: line(rw(), BAY).boiler });

if (!second) {
  // Player 1 brings the bay line 10 s on, so player 2's garage is open first.
  const go = railAt() + 100;
  await until(() => railAt() >= go, 'the bring tick', 30_000);
  document.querySelector<HTMLElement>(`.g-chips [data-line="${BAY}"]`)!.click();
}
await until(() => shed(rw()).tableLine === BAY, 'the bay copy on the table', 30_000);
say('bay brought', { ...clocks(), brought: shed(rw()).brought });
await wait(400);
say('screen during the swap', screen());

if (second) {
  // Strong selected, then Interact held for a second while the copies swap: nothing may go on.
  const tile = '.g-parts [data-part="strong"]';
  await until(() => document.querySelector(tile), 'the Strong tile on screen', 8000);
  document.querySelector<HTMLElement>(tile)!.click();
  await wait(200);
  const before = screen();
  triggerAction('interact', 'down');
  await wait(1000);
  triggerAction('interact', 'up');
  say('install during the swap', {
    before,
    after: screen(),
    phase: snap().phase,
    sel: snap().sel,
    bayRow: line(rw(), BAY).boiler,
    ...clocks(),
  });
}
await wait(600);
done.__twoDone = true;

background(
  (async () => {
    if (second) {
      // The moment Install lights, hold it as a person would; a dropped hold is let go and held again.
      for (let attempt = 1; line(rw(), BAY).boiler !== STRONG; attempt++) {
        if (attempt > 5) throw new Error('garage-trade-two two: Strong not fitted in five holds');
        await until(() => screen().installShown && snap().sel === 'strong', 'Install lit on Strong', 60_000);
        const lit = clocks();
        triggerAction('interact', 'down');
        const seen: { k: string; railAt: number; tickNow: number }[] = [];
        let began = false;
        try {
          await until(
            () => {
              const s = snap();
              const k = `${s.phase}${s.held ? '+held' : ''}${s.waiting ? '+waiting' : ''}${s.canInstall ? '' : '-can'}${s.facts.held ? '+tablehold' : ''}`;
              if (seen.at(-1)?.k !== k) {
                const c = clocks();
                seen.push({ k, railAt: c.railAt, tickNow: c.tickNow });
              }
              began ||= s.phase !== 'idle';
              return line(rw(), BAY).boiler === STRONG || (began && s.phase === 'idle' && !s.waiting);
            },
            'the hold ended',
            30_000,
          );
        } finally {
          triggerAction('interact', 'up');
        }
        say(`hold ${attempt}`, { lit, fitted: line(rw(), BAY).boiler === STRONG, seen, at: clocks() });
        await wait(300);
      }
    } else await until(() => line(rw(), BAY).boiler === STRONG, 'the bay line on Strong', 120_000);
    const fitAt = railAt();
    say('bay line on Strong', { fitAt, rev: line(rw(), BAY).rev });
    await until(() => snap().phase === 'idle', 'the install moment over', 20_000);
    await wait(1500);
    garage.api!.close();
    // Both on the West landing's platform by its first frame, looking at the train's stand.
    const west = legFrame(
      RAIL_LEGS.find((l) => l.id === 'bay-cut')!,
      0,
    );
    teleport(me.body!, west.x / 100 + (second ? 2 : 0), west.y / 100 + 0.7, west.z / 100);
    me.body!.velocity.set(0, 0, 0);
    type Tr = {
      slot: number;
      line: number;
      boiler: number;
      phase: number;
      at: number;
      tailCrates: number;
      cars: { role?: string; x: number; z: number }[];
    };
    const bayTrains = () =>
      ((inspectRailway() as unknown as { line2View?: { trains?: Tr[] } })?.line2View?.trains ?? []).filter(
        (t) => t.line === BAY,
      );
    const last = new Map<number, Tr>();
    const end = performance.now() + 180_000;
    let departed = false;
    while (!departed && performance.now() < end) {
      const now = bayTrains();
      for (const t of now) {
        const was = last.get(t.slot);
        if (was && was.boiler !== t.boiler)
          say('row change', {
            slot: t.slot,
            from: was.boiler,
            to: t.boiler,
            phase: t.phase,
            at: t.at,
            wasPhase: was.phase,
            tick: railAt(),
          });
        if (was && was.phase === 0 && was.at === 0 && t.phase !== 0) {
          say('departure from the West landing', {
            slot: t.slot,
            boiler: t.boiler,
            cars: t.cars.length,
            roles: t.cars.map((c) => c.role),
            tailCrates: t.tailCrates,
            tick: railAt(),
            sinceFit: railAt() - fitAt,
          });
          departed = t.boiler === STRONG;
        }
        last.set(t.slot, t);
      }
      const engine = now.find((t) => t.at === 0 || t.phase !== 0)?.cars.find((c) => c.role === 'engine');
      if (engine && me.body) {
        const p = me.body.position;
        cam.yaw = me.yaw = Math.atan2(p.x - engine.x, p.z - engine.z);
      }
      await wait(100);
    }
    if (!departed) throw new Error('garage-trade-two: no Strong bay train left the West landing in 180 s');
    say('done');
  })(),
  `garage trade two ${who}`,
);
export {};
