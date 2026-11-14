// Real reload proof. sessionStorage holds observations, never a seeded return record.
// Modes (query `mode=`): gorge (default: High Gorge's north platform), deck (the Railhead's deck over the sea),
// train (seated on a departing train), swim (in the sea beside the Railhead), zero (the window set to 0: Home),
// duo (with --players 2: player 1 reloads on the Railhead while player 2 watches what it is shown).
// From the first sample after each load it records whether the loading cover was up and where the body was, so the
// result says how long the cover held and whether anything was on screen before the body settled.
import { background } from '../../../src/async.ts';
import { cam, me } from '../../../src/player/player.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { jumpOf, type JumpLand } from '../../../src/world/railway-jump.ts';
import { railRead } from '../rail-read.ts';
import { aboard, platformById, fromPlatform } from '../../../src/physics/platforms.ts';
import { identity } from '../../../src/player/identity.ts';
import { getRoomId, remotes } from '../../../src/netplay/net.ts';
import { railwayRoomId } from '../../../src/world/railway-namespace.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import type { ReturnSpot } from '../../../src/place/return-spot.ts';
import { haltLandings, returnCandidates } from '../../../src/place/return-spot.ts';
import { returnKey } from '../../../src/place/return-settle.ts';
import { RETURN_MINUTES_KEY } from '../../../src/place/return-tuning.ts';
import { sitDown, seated } from '../../../src/entities/railway/seat.ts';
import { routeAreasPending } from '../../../src/entities/route-greybox/state.ts';
import { ringAreaPending } from '../../../src/entities/ring-island/state.ts';
import { bootMarks } from '../../../src/boot/timeline.ts';
import { SPAWN, toWorld } from '../../../src/place/layout.ts';

const KEY = 'look.railway-return';
const query = new URLSearchParams(location.search);
const mode = query.get('mode') ?? 'gorge';
const player = query.get('player') ?? '1';
type P = { x: number; y: number; z: number };
const flat = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const round = (n: number) => Math.round(n * 100) / 100;
const point = (p: P) => ({ x: round(p.x), y: round(p.y), z: round(p.z) });

// What the page shows, from as early as this module loads: the loading cover, the late veil and the body.
type Sample = { t: number; cover: boolean; veil: boolean; p: P | null };
const samples: Sample[] = [];
const sampler = setInterval(() => {
  if (samples.length > 6000) return clearInterval(sampler);
  const b = me.body?.position;
  samples.push({
    t: performance.now(),
    cover: !!document.querySelector('.splash:not(.gone)'),
    veil: !!document.querySelector('.railway-return-veil.on'),
    p: b ? { x: b.x, y: b.y, z: b.z } : null,
  });
}, 25);

let started = false;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const record = () =>
  JSON.parse(localStorage.getItem(returnKey(railwayRoomId(getRoomId()), identity.pid)) ?? 'null') as ReturnSpot | null;
const done = (tag: string, result: Record<string, unknown>) => {
  document.documentElement.dataset.railwayReturn = JSON.stringify(result);
  console.log(`RAILWAY RETURN ${tag} ${JSON.stringify(result)}`);
};

/** Stand at a landing: held while distance-resident scenery mounts, then left alone for a full save interval. */
async function standAt(land: JumpLand, yaw: number) {
  const body = me.body!;
  const until = performance.now() + 60000;
  let settledFor = 0;
  while (settledFor < 2000 && performance.now() < until) {
    teleport(body, land.x, land.y + 0.9, land.z);
    body.velocity.set(0, 0, 0);
    settledFor = routeAreasPending(land.x, land.z) || ringAreaPending(land.x, land.z) ? 0 : settledFor + 100;
    await wait(100);
  }
  cam.yaw = me.yaw = yaw;
  await wait(7000);
  const saved = record();
  if (!saved || flat(saved, land) > 2 || saved.ride)
    throw new Error(`railway-return: no standing record at the landing: ${JSON.stringify({ land, saved })}`);
  return saved;
}

/** What was on screen this load: the cover's hold, and the body's distance from where it ended while it was shown. */
function shown(after: P) {
  const mark = (name: string) => bootMarks().find((m) => m.name === name)?.t ?? null;
  const first = mark('first'),
    interactive = mark('interactive'),
    settled = mark('return-settled');
  const open = samples.filter((s) => !s.cover && !s.veil && s.p);
  return {
    coverUpAtFirstSample: samples[0]?.cover ?? null,
    firstFrameMs: first,
    coverLiftMs: interactive,
    coverHeldMs: first !== null && interactive !== null ? interactive - first : null,
    settledMs: settled,
    settledBeforeLift: settled !== null && interactive !== null ? settled <= interactive : null,
    veilShown: samples.some((s) => s.veil),
    veilMs: samples.filter((s) => s.veil).length * 25,
    veilFarthest: round(Math.max(0, ...samples.filter((s) => s.veil && s.p).map((s) => flat(s.p!, after)))),
    shownSamples: open.length,
    maxShownDistance: round(Math.max(0, ...open.map((s) => flat(s.p!, after)))),
    maxShownDrop: round(Math.max(0, ...open.map((s) => s.p!.y - after.y))),
    firstShown: open[0] ? point(open[0].p!) : null,
  };
}

/** Player 2 of a duo: stands a few metres off and reports where it was shown player 1, before and after the reload. */
async function watch(land: JumpLand) {
  const body = me.body!;
  const yaw = land.yaw ?? 0;
  let mine: P | null = null;
  for (const back of [10, 8, 6, 4]) {
    const at = { x: land.x - Math.sin(yaw) * back, y: land.y, z: land.z - Math.cos(yaw) * back };
    for (let k = 0; k < 30; k++) {
      teleport(body, at.x, at.y + 0.9, at.z);
      body.velocity.set(0, 0, 0);
      await wait(100);
    }
    await wait(1500);
    if (me.coyote > 0 && Math.abs(body.position.y - PLAYER_R - land.y) < 1) {
      mine = at;
      break;
    }
  }
  if (!mine) throw new Error('railway-return: the watcher found nowhere to stand by the landing');
  const home = { x: toWorld(SPAWN.x), z: SPAWN.z };
  const seen: { t: number; p: P }[] = [];
  let phase: 'before' | 'gone' | 'back' = 'before';
  let backAt = 0,
    firstBack: P | null = null,
    nearestHome = Infinity,
    farthest = 0;
  const until = performance.now() + 600000;
  while (performance.now() < until) {
    const other = [...remotes.values()].find((r) => r.entered && r.avatar);
    const p = other?.avatar?.position;
    if (phase === 'before' && p && flat(p, land) < 3) seen.push({ t: performance.now(), p: point(p) });
    if (phase === 'before' && seen.length && !p) phase = 'gone';
    if (phase === 'gone' && p) {
      phase = 'back';
      backAt = performance.now();
      firstBack = point(p);
    }
    if (phase === 'back' && p) {
      nearestHome = Math.min(nearestHome, flat(p, home));
      farthest = Math.max(farthest, flat(p, land));
      if (performance.now() - backAt > 5000) {
        window.__debugCam?.set([mine.x, mine.y + 1.7, mine.z], [p.x, p.y, p.z]);
        done('WATCHED', {
          watcher: point(body.position),
          land: point(land),
          firstShown: firstBack,
          firstShownFromSpot: round(flat(firstBack!, land)),
          farthestFromSpot: round(farthest),
          nearestToHome: round(nearestHome),
          now: point(p),
        });
        return;
      }
    }
    await wait(25);
  }
  throw new Error(`railway-return: the watcher never saw the other player come back (phase ${phase})`);
}

async function run() {
  const deadline = performance.now() + 180000;
  while (!me.body || !me.entered || !railRead()?.ready()) {
    if (performance.now() > deadline) throw new Error('railway-return: player and railway never ready');
    await wait(100);
  }
  const body = me.body;
  const gorge = jumpOf('gorge-reached')!.land!;
  const railhead = jumpOf('gap-footed')!.land!;
  if (mode === 'duo' && player === '2') return watch(railhead);
  const previous = sessionStorage.getItem(KEY);
  if (previous) {
    await wait(6000);
    const before = JSON.parse(previous) as P & { yaw: number; expected?: P[]; left?: P };
    const after = { x: body.position.x, y: body.position.y, z: body.position.z };
    const home = { x: toWorld(SPAWN.x), z: SPAWN.z };
    const nearest = (before.expected ?? []).map((p) => round(flat(after, p)));
    const result = {
      mode,
      before: point(before),
      left: before.left ? point(before.left) : undefined,
      after: point(after),
      distance: round(flat(after, before)),
      yaw: { before: round(before.yaw), after: round(me.yaw) },
      fromHome: round(flat(after, home)),
      fromHalts: nearest,
      standing: me.coyote > 0 && !me.swimming,
      cover: shown(after),
      ok:
        mode === 'zero'
          ? flat(after, home) < 15
          : mode === 'train' || mode === 'swim'
            ? nearest.some((d) => d < 10) && flat(after, home) > 30
            : flat(after, before) < 2,
    };
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(RETURN_MINUTES_KEY);
    window.__debugCam?.set([after.x + 8, after.y + 6, after.z + 10], [after.x, after.y, after.z]);
    done(result.ok ? 'PASS' : 'FAIL', result);
    return;
  }
  const leave = (extra: { expected?: P[]; left?: P } = {}) => {
    window.dispatchEvent(new PageTransitionEvent('pagehide'));
    const saved = record();
    if (!saved) throw new Error('railway-return: nothing was saved before the reload');
    const before = { x: saved.x, y: saved.y, z: saved.z, yaw: saved.yaw, ...extra };
    console.log(`RAILWAY RETURN BEFORE ${JSON.stringify({ mode, saved, ...extra })}`);
    sessionStorage.setItem(KEY, JSON.stringify(before));
    location.reload();
  };
  const halts = () => returnCandidates(record()!, haltLandings()).filter((p) => p.halt);
  if (mode === 'duo') {
    const until = performance.now() + 240000;
    while (![...remotes.values()].some((r) => r.entered)) {
      if (performance.now() > until) throw new Error('railway-return: the second player never entered');
      await wait(200);
    }
  }
  const land = mode === 'deck' || mode === 'duo' ? railhead : gorge;
  await standAt(land, (land.yaw ?? 0) + 0.7);
  if (mode === 'train') {
    const train = platformById('railway:train0-1');
    if (!train) throw new Error('railway-return: passenger deck unavailable');
    const local = { x: 0.7, y: train.top + PLAYER_R + 0.1, z: 0, yaw: 0 };
    const at = fromPlatform(train, local, false, { ...local });
    teleport(body, at.x, at.y, at.z);
    body.velocity.set(0, 0, 0);
    await wait(200);
    sitDown();
    if (!seated()) throw new Error('railway-return: no reachable train chair');
    const departure = { x: body.position.x, z: body.position.z };
    const until = performance.now() + 240000;
    while (flat(body.position, departure) < 10) {
      if (performance.now() > until || !seated()) throw new Error('railway-return: seated train never departed');
      await wait(100);
    }
    await wait(6000);
    if (!aboard() && !seated()) throw new Error('railway-return: left the train before the reload');
    window.dispatchEvent(new PageTransitionEvent('pagehide'));
    if (!record()?.ride) throw new Error('railway-return: no saved train observation');
    return leave({ expected: halts(), left: point(body.position) });
  }
  if (mode === 'swim') {
    // The sea beside the Railhead's deck, far from the saved Gorge spot: the nearest halt is the Railhead.
    const yaw = railhead.yaw ?? 0;
    for (const side of [18, -18, 30, -30]) {
      teleport(body, railhead.x + Math.cos(yaw) * side, 1, railhead.z - Math.sin(yaw) * side);
      body.velocity.set(0, 0, 0);
      await wait(4000);
      if (me.swimming) break;
    }
    if (!me.swimming) throw new Error('railway-return: never reached the sea beside the Railhead');
    await wait(6000);
    window.dispatchEvent(new PageTransitionEvent('pagehide'));
    if (!record()?.ride) throw new Error('railway-return: no saved swimming observation');
    return leave({ expected: halts(), left: point(body.position) });
  }
  if (mode === 'zero') localStorage.setItem(RETURN_MINUTES_KEY, '0');
  leave();
}
export function start() {
  if (started) return;
  started = true;
  background(run(), 'railway-return eval');
}
