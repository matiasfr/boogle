// What a bot needs to play a page: real keys and presses, a person's pace, a way round things, and an honest account. Runs in
// the page: a bot file does `import { makeBot } from '../bot.ts'`, and an eval imports that with `import('/dev/look/bots/x.ts')`.
// `walk` plans over the world as it stands now, asking the real colliders with the player's own limits, so a bridge just built
// is a way across and a gate just opened needs no new code. A bot says what it expected with `until` and `check`, and
// `npm run playthrough` reports anything that never came, rather than the bot walking past it to THE END.
import { me, cam } from '../../src/player/player.ts';
import { input } from '../../src/player/input.ts';
import { interactDown, interactTarget, interactUp, useDown, useUp } from '../../src/player/hands.ts';
import { getMask, rayHit, raycastClosest, sweepSphere } from '../../src/physics/engine.ts';
import { GROUP } from '../../src/physics/physics.ts';
import { PLAYER_R, SEA, SWIM_DEPTH, WALKABLE_NY } from '../../src/constants.ts';

const CELL = 1; // m: a deck two metres wide has centres on it
const STEP_UP = 0.9; // m in one cell without a jump
const JUMP_UP = 1.4; // the jump tops out at 1.6
const OFF_START_DROP = 3; // m: the way off wherever you stand now, however high a thing the plan can't see put you
const DROP = JUMP_UP; // m: anything further is a way down you might not get back up, and a plan shouldn't count on those
const MAX_NODES = 25000; // past this it goes as near as it got and thinks again from there
const CLOSE = 1.5; // m past the distance asked for that still counts as there, for what's solid in the middle
const EDGE = [
  [0.7, 0],
  [-0.7, 0],
  [0, 0.7],
  [0, -0.7],
] as const;
const TURNS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

type Point = { x: number; y: number; z: number };
type Node = Point & { ix: number; iz: number; g: number; f: number; from: Node | null; key: string };
export type BotOptions = {
  /** Plan through surface water and steer normally there; never implies relocation recovery. */
  allowSwimming?: boolean;
  /** Is this spot under water? Default: below the sea. */
  water?: (x: number, y: number, z: number) => boolean;
  /** Get out of the water, as a person would. */
  recover?: () => void;
  /** Set when the run is over: the page expression `npm run playthrough` waits for. */
  doneFlag?: string;
  /** Spots to walk round though nothing solid stands there (a box that opens when you walk into it), read per plan. */
  avoid?: () => readonly { x: number; z: number; r: number }[];
};

/** Hides makeBot's on-screen notes panel so a still shows the game; the console keeps every note. */
export function hideBotNotes() {
  for (const panel of document.querySelectorAll<HTMLDivElement>('body > div'))
    if (panel.style.zIndex === '9999' && panel.style.whiteSpace === 'pre') panel.style.display = 'none';
}

export function makeBot(opts: BotOptions = {}) {
  const water = opts.water ?? ((_x: number, y: number) => y < SEA + 1.2); // you swim before the ground's under the sea, and it has waves
  const body = () => me.body!;
  const wait = async (ms: number) => {
    await new Promise<void>((r) => setTimeout(r, ms));
    sample();
  };
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  // ---------------------------------------------------------------- notes
  const say = document.createElement('div');
  say.style.cssText =
    'position:fixed;left:8px;top:90px;z-index:9999;font:bold 12px monospace;color:#000;background:#fffc;padding:6px;white-space:pre';
  document.body.append(say);
  const lines: string[] = [];
  let last = 0;
  function note(text: string) {
    const n = now();
    const line = `${n.toFixed(1)} (+${(n - last).toFixed(1)}) ${text}`;
    lines.push(line);
    last = n;
    say.textContent = lines.slice(-30).join('\n');
    console.log('PLAY ' + line);
  }
  /** A beat that didn't come is a finding: the report leads with these. */
  const said = new Set<string>();
  const never = (what: string) => {
    const words = what.replace(/[\d.-]+/g, '#');
    if (!said.has(words)) note(`NEVER: ${what}`);
    said.add(words);
  };
  /** Waits for `fn`. `what` names the beat: if it doesn't come in `ms` of game time, that's on the record. */
  async function until(fn: () => unknown, ms = 60000, what = '') {
    const t = performance.now();
    while (!fn() && performance.now() - t < ms) await wait(60);
    if (what && !fn()) never(what);
    return !!fn();
  }
  const check = (what: string, ok: unknown) => void (ok || never(what));
  function finish(text: string) {
    note(`THE END at ${now().toFixed(1)}: ${text}`);
    (window as unknown as Record<string, unknown>)[opts.doneFlag ?? '__placeDone'] = true;
  }

  // ---------------------------------------------------------------- the world, from the player's height
  const hit = rayHit();
  const mask = () => getMask(body()) & ~GROUP.DEFAULT; // every static thing you'd walk into, never your own body
  /** Where you'd stand at (x, z), coming from height y: null if nothing's there, or a wall stands in it. */
  function ground(x: number, y: number, z: number, steepest = WALKABLE_NY, drop = DROP) {
    // A little off the exact spot: a ray straight down an edge of a heightfield's cell goes through it.
    const from = { x: x + 0.017, y: y + JUMP_UP + 0.3, z: z + 0.013 };
    const to = { x: x + 0.017, y: y - drop - 0.5, z: z + 0.013 };
    if (!raycastClosest(from, to, { mask: mask() }, hit)) return null;
    if (hit.distance < 0.01 || hit.hitNormalWorld.y < steepest) return null; // inside something, or too steep to stand on
    return hit.hitPointWorld.y;
  }
  /** From a spot to the next, one cell or so off. Returns the height there, or null if you can't. */
  function step(a: Point, x: number, z: number, steepest = WALKABLE_NY, drop = DROP) {
    // Into an avoided spot, never; out of one (you're standing in it), always.
    for (const s of avoiding)
      if (Math.hypot(x - s.x, z - s.z) < s.r && Math.hypot(a.x - s.x, a.z - s.z) >= s.r) return null;
    let y = ground(x, a.y, z, steepest, drop);
    // A low bank can lead onto the water surface. Never turn a high ledge's missing floor into a shortcut down.
    if (opts.allowSwimming && a.y <= SEA + JUMP_UP && (y === null || water(x, y, z))) y = SEA - SWIM_DEPTH - PLAYER_R;
    if (y === null || y - a.y > JUMP_UP || a.y - y > drop || (!opts.allowSwimming && water(x, y, z))) return null;
    const lift = PLAYER_R + 0.45;
    const from = { x: a.x, y: a.y + lift, z: a.z },
      to = { x, y: y + lift, z };
    // Twice: a sweep takes solid things and thin ones (trunks, posts) separately.
    for (const thin of ['skip', 'only'] as const)
      if (sweepSphere(from, to, PLAYER_R * 0.9, { mask: mask(), thin }) >= 0) return null;
    return y;
  }
  /** Is there a drop close beside this spot? A narrow deck has these all along its sides, so walk down the middle. */
  function nearEdge(x: number, y: number, z: number) {
    if (opts.allowSwimming && y <= SEA + JUMP_UP) return false;
    for (const [dx, dz] of EDGE) {
      const g = ground(x + dx, y, z + dz, 0.2);
      if (g === null ? !solidBeside(x + dx, y, z + dz) : water(x + dx, g, z + dz) || y - g > DROP * 0.7) return true;
    }
    return false;
  }
  // No ground found there: either a drop, or a wall standing in it, which is no danger.
  const solidBeside = (x: number, y: number, z: number) =>
    raycastClosest({ x, y: y + JUMP_UP + 0.3, z }, { x, y: y - 0.2, z }, { mask: mask() }, hit);
  function lineClear(a: Point, b: Point) {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.ceil(d / CELL);
    let at = a;
    for (let k = 1; k <= n; k++) {
      const x = a.x + ((b.x - a.x) * k) / n,
        z = a.z + ((b.z - a.z) * k) / n;
      const y = step(at, x, z);
      if (y === null || y - at.y > STEP_UP || nearEdge(x, y, z)) return false;
      at = { x, y, z };
    }
    // A clear route underneath a bridge is not a shortcut to a waypoint on its deck.
    return Math.abs(at.y - b.y) < 0.4;
  }

  // ---------------------------------------------------------------- finding a way
  const blocked = new Map<string, number>(); // cells that held you up, until this game time
  let avoiding: readonly { x: number; z: number; r: number }[] = [];
  let lastSeen = new Map<string, number>();
  async function plan(
    goalX: number,
    goalZ: number,
    r: number,
  ): Promise<{ path: Point[]; arrives: boolean; gaveUp: boolean }> {
    // The browser also sends room heartbeats. A harvest's batch of searches must not disconnect a peer.
    await wait(0);
    avoiding = opts.avoid?.() ?? [];
    const p = body().position;
    const under = opts.allowSwimming && me.swimming ? null : ground(p.x, p.y - PLAYER_R, p.z);
    // Nothing in reach below, yet you stand: on something the plan can't see, such as a parked train's roof.
    const high = under === null && me.coyote > 0;
    const y0 = opts.allowSwimming && me.swimming ? SEA - SWIM_DEPTH - PLAYER_R : (under ?? p.y - PLAYER_R);
    const start: Node = {
      x: p.x,
      y: y0,
      z: p.z,
      ix: Math.round(p.x / CELL),
      iz: Math.round(p.z / CELL),
      g: 0,
      f: 0,
      from: null,
      key: '',
    };
    const open: Node[] = [start];
    const push = (n: Node) => {
      open.push(n);
      for (let k = open.length - 1; k > 0;) {
        const up = (k - 1) >> 1;
        if (open[up]!.f <= open[k]!.f) break;
        [open[up], open[k]] = [open[k]!, open[up]!];
        k = up;
      }
    };
    const pop = () => {
      const top = open[0]!;
      const end = open.pop()!;
      if (open.length) {
        open[0] = end;
        for (let k = 0; ;) {
          const l = 2 * k + 1,
            m = l + 1;
          let s = k;
          if (l < open.length && open[l]!.f < open[s]!.f) s = l;
          if (m < open.length && open[m]!.f < open[s]!.f) s = m;
          if (s === k) break;
          [open[s], open[k]] = [open[k]!, open[s]!];
          k = s;
        }
      }
      return top;
    };
    const seen = new Map<string, number>();
    lastSeen = seen;
    const h = (x: number, z: number) => Math.hypot(x - goalX, z - goalZ);
    let best = start;
    let bestH = h(start.x, start.z);
    let expanded = 0;
    const clock = performance.now();
    while (open.length && expanded++ < MAX_NODES) {
      if (expanded % 128 === 0) await wait(0);
      const a = pop();
      if (a.g > (seen.get(a.key) ?? Infinity)) continue;
      const d = h(a.x, a.z);
      if (d < bestH) {
        best = a;
        bestH = d;
      }
      if (d <= r) {
        best = a;
        bestH = d;
        break;
      }
      for (const [dx, dz] of TURNS) {
        const ix = a.ix + dx,
          iz = a.iz + dz;
        const x = ix * CELL,
          z = iz * CELL;
        const cell = `${ix},${iz}`;
        if ((blocked.get(cell) ?? 0) > clock) continue;
        // You may be standing somewhere steep already, and the way off it counts. So does a way down from
        // somewhere the plan can't see (a parked train's roof, 2 m up): a person just steps off it.
        const y = a.g < 3 ? step(a, x, z, 0.3, high ? OFF_START_DROP : DROP) : step(a, x, z);
        if (y === null || nearEdge(x, y, z)) continue;
        const key = `${cell},${Math.round(y / 2)}`;
        const g = a.g + Math.hypot(dx, dz) * CELL + (y - a.y > STEP_UP ? 4 : 0);
        if ((seen.get(key) ?? Infinity) <= g) continue;
        seen.set(key, g);
        push({ x, y, z, ix, iz, g, f: g + 1.4 * h(x, z), from: a, key });
      }
    }
    const path: Point[] = [];
    for (let n: Node | null = best; n; n = n.from) path.unshift({ x: n.x, y: n.y, z: n.z });
    return { path, arrives: bestH <= r, gaveUp: expanded >= MAX_NODES };
  }

  // ---------------------------------------------------------------- walking it
  const here = () => {
    const p = body().position;
    return { x: p.x, y: p.y - PLAYER_R, z: p.z };
  };
  const faceTo = (x: number, z: number) => {
    const p = body().position;
    cam.yaw = me.yaw = Math.atan2(-(x - p.x), -(z - p.z));
  };
  const dist = (x: number, z: number) => Math.hypot(body().position.x - x, body().position.z - z);
  let motion = 'idle';
  let destination: { x: number; z: number } | null = null;
  let waypoint: Point | null = null;
  let wet = false;
  const trace: unknown[] = [];
  function sample() {
    const p = here();
    trace.push({
      t: +now().toFixed(2),
      ...p,
      v: { ...body().velocity },
      ground: ground(p.x, p.y, p.z),
      motion,
      destination,
      waypoint,
    });
    if (trace.length > 200) trace.shift();
    if (me.swimming && !wet) {
      note(`FALL water at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) during ${motion}`);
      console.log('BOT TRACE ' + JSON.stringify(trace));
    }
    wet = me.swimming;
  }
  function swimCheck() {
    if (!me.swimming || opts.allowSwimming) return false;
    // Recovery can deliberately throw in a continuous route. Stop driving even when its caller aborts.
    input.keys.delete('KeyW');
    input.keys.delete('ShiftLeft');
    note('in the water: requesting recovery');
    opts.recover?.();
    return true;
  }
  /** Walks to within `r` of (x, z), round whatever's there. False if it couldn't, and it says so. */
  async function walk(x: number, z: number, r = 1.5, { limit = 0, sprint = false } = {}) {
    destination = { x, z };
    motion = 'plan';
    if (dist(x, z) <= r) return true;
    const budget = (limit || Math.max(30000, dist(x, z) * 1000)) + performance.now();
    if (sprint) input.keys.add('ShiftLeft');
    let holdups = 0;
    let recovered = false;
    let forgiven = false;
    let nearest = Infinity;
    let ok = true;
    let why = '';
    planning: for (let tries = 0; dist(x, z) > r; tries++) {
      if (performance.now() > budget || tries > 30) {
        ok = false;
        why = performance.now() > budget ? 'out of time' : 'kept replanning';
        break;
      }
      input.keys.delete('KeyW');
      const { path, arrives, gaveUp } = await plan(x, z, Math.max(0.6, r - 0.4));
      if (!arrives && tries === 0)
        note(
          `no way yet to (${x.toFixed(0)}, ${z.toFixed(0)}): as near as ${dist(path.at(-1)!.x, path.at(-1)!.z).toFixed(0)} m from here`,
        );
      if (path.length < 2 && !arrives) {
        console.log('BOT HEMMED ' + JSON.stringify({ at: here(), destination, tries, blocked: [...blocked], trace }));
        // A temporary obstacle must not fence in the start (or the next walk's start).
        if (blocked.size && !forgiven) {
          forgiven = true;
          blocked.clear();
          continue;
        }
        if (opts.recover && !recovered) {
          recovered = true;
          note('stuck in a hole: back up');
          opts.recover();
          await wait(500);
          continue;
        }
        ok = false;
        why = 'nowhere to go from here';
        break;
      }
      let k = 1;
      motion = 'follow';
      input.keys.add('KeyW');
      let lookedAt = 0;
      let target = path[Math.min(k, path.length - 1)]!;
      let was = { x: body().position.x, z: body().position.z, at: performance.now() };
      while (dist(x, z) > r) {
        if (performance.now() > budget) continue planning;
        if (swimCheck()) {
          await wait(500);
          continue planning;
        }
        // The furthest of the next few waypoints in a straight line, so it walks like a person, not along a grid.
        if (performance.now() - lookedAt > 100) {
          lookedAt = performance.now();
          while (k < path.length - 1 && dist(path[k]!.x, path[k]!.z) < 0.4 && Math.abs(here().y - path[k]!.y) < 0.6)
            k++;
          target = path[k]!;
          const me0 = here();
          for (let n = Math.min(path.length - 1, k + 20); n > k; n -= 5)
            if (lineClear(me0, path[n]!)) {
              target = path[n]!;
              k = n;
              break;
            }
          if (dist(target.x, target.z) < 0.4 && k >= path.length - 1) break; // the end of this way
          if (target.y - me0.y > STEP_UP * 0.6 && dist(target.x, target.z) < 2.5) me.jumpQueued = 0.2;
        }
        faceTo(target.x, target.z);
        waypoint = target;
        await wait(40);
        if (performance.now() - was.at > 900) {
          if (Math.hypot(body().position.x - was.x, body().position.z - was.z) < 0.6) {
            // Something the plan didn't know, a machine or a train. Hop; then rule that spot out and think again.
            holdups++;
            me.jumpQueued = 0.2;
            await wait(250);
            blocked.set(`${Math.round(target.x / CELL)},${Math.round(target.z / CELL)}`, performance.now() + 15000);
            if (holdups > 8) {
              ok = false;
              why = `held up ${holdups} times, last at (${body().position.x.toFixed(0)}, ${body().position.z.toFixed(0)})`;
              break planning;
            }
            continue planning;
          }
          was = { x: body().position.x, z: body().position.z, at: performance.now() };
        }
      }
      // Only approach within a checked route. A partial plan may end at a cliff, far from the goal.
      const end = performance.now() + 1200;
      motion = 'final approach';
      let before = dist(x, z);
      while (arrives && dist(x, z) > r && performance.now() < end) {
        const p = here();
        const d = dist(x, z);
        const f = (d - r) / d;
        if (!lineClear(p, { x: p.x + (x - p.x) * f, y: p.y, z: p.z + (z - p.z) * f })) break;
        faceTo(x, z);
        await wait(40);
        if (before - dist(x, z) < 0.05) break;
        before = dist(x, z);
      }
      if (dist(x, z) <= r + CLOSE) break;
      if (!arrives) {
        // It stopped looking before it found one: from here, it can look further. Only a real dead end is a failure.
        if (gaveUp && dist(x, z) < nearest - 3) {
          nearest = dist(x, z);
          continue;
        }
        // What held it up may have moved on: once more, forgetting the spots it ruled out.
        if (blocked.size && !forgiven) {
          forgiven = true;
          blocked.clear();
          continue;
        }
        ok = false;
        why = `no way there: the nearest it can get from here is ${dist(x, z).toFixed(0)} m off`;
        break;
      }
    }
    input.keys.delete('KeyW');
    input.keys.delete('ShiftLeft');
    motion = 'idle';
    if (!ok) never(`reached (${x.toFixed(0)}, ${z.toFixed(0)}); stopped ${dist(x, z).toFixed(1)} m short: ${why}`);
    return ok;
  }
  /** Straight at it, no planning: onto a moving deck, or the last step up to a thing. */
  async function straight(x: number, z: number, r = 1.2, limit = 8000) {
    motion = 'straight';
    destination = { x, z };
    const end = performance.now() + limit;
    input.keys.add('KeyW');
    while (dist(x, z) > r && performance.now() < end) {
      faceTo(x, z);
      if (swimCheck()) break;
      await wait(40);
    }
    input.keys.delete('KeyW');
    return dist(x, z) <= r;
  }
  /** What a person presses for the thing in front of them: the click for a `click` target, Interact for the rest. */
  function press() {
    if (interactTarget()?.click) {
      useDown();
      useUp();
      return;
    }
    interactDown();
    interactUp();
  }
  /** Walks up to the thing at (x, z) until the game offers it (`verb` if given), then presses, as a person would. */
  async function use(x: number, z: number, what: string, verb?: RegExp) {
    await walk(x, z, 3);
    const end = performance.now() + 6000;
    const offered = () => {
      const t = interactTarget();
      return t?.run && (!verb || verb.test(t.verb)) ? t : null;
    };
    input.keys.add('KeyW');
    while (!offered() && performance.now() < end && dist(x, z) > 0.6) {
      faceTo(x, z);
      await wait(40);
    }
    input.keys.delete('KeyW');
    const t = offered();
    if (!t) {
      never(
        `the game offered ${what}; it offers ${interactTarget()?.verb ?? 'nothing'}, ${dist(x, z).toFixed(1)} m off`,
      );
      return false;
    }
    press();
    return true;
  }
  /** Presses at a person's pace until `done`, or out of `ms`. */
  async function work(done: () => unknown, ms = 60000, pace = 380) {
    const end = performance.now() + ms;
    while (!done() && performance.now() < end) {
      press();
      await wait(pace);
    }
    return !!done();
  }
  return {
    note,
    never,
    until,
    check,
    finish,
    now,
    wait,
    walk,
    straight,
    press,
    use,
    work,
    dist,
    lines,
    plan,
    seenLast: () => lastSeen,
  };
}
export type Bot = ReturnType<typeof makeBot>;
