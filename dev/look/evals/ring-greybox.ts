// Ring Island's greybox (?ring=greybox, src/proto/greybox/ring.ts): the owed and untested items of
// docs/plans/ring-island-build1.md step 0, by real input (keys, Jump, the Hook key, the Glide action). Staging
// teleports only; every measured move is the controller's. Writes `__ringResult` and prints `RING ...` lines.
//   npm run look -- --query ring=greybox --rail-seed crossing-done --eval dev/look/evals/ring-greybox.ts
// One item alone (here the double jumps): --query 'ring=greybox&ringonly=f'
// Stills (the harness takes them after the eval): the run ends on the `gap` view; `ringview=<name>` skips the items and
// stages that view alone (bentRamp, hingeRamp, gap, hook):
//   npm run look -- --query 'ring=greybox&ringview=bentRamp' --rail-seed crossing-done --eval dev/look/evals/ring-greybox.ts
// The telescope at zoom 2 (zoom 1 is lookout.ts alone): lookout.ts as the setup and this as the action, which only
// presses Zoom in ten times:
//   npm run look -- --query 'ring=greybox&shot=play&ringview=scope2' --rail-seed crossing-done --size 844x390 \
//     --eval dev/look/evals/lookout.ts --action dev/look/evals/ring-greybox.ts
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { inspectRailwayLegacy } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');

type Pt = { x: number; y: number; z: number };
type Ring = {
  root: { visible: boolean };
  views: Record<string, { cam: Pt; look: Pt }>;
  layout: { railhead: number; hinge: number; hookPile: { u: number; lat: number; y: number } };
  deckY: (u: number) => number;
  at: (u: number, lat?: number) => { x: number; z: number };
  braceY: number;
  hingeY: number;
};
const page = window as unknown as Window & { __ring?: Ring; __ringResult?: Record<string, unknown> };
const query = new URLSearchParams(location.search);
const view = query.get('ringview');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const key = (type: 'keydown' | 'keyup', code: string) =>
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));

// ---------------------------------------------------------------- the telescope's zoom (action mode)
if (view === 'scope2') {
  for (let k = 0; k < 10; k++) {
    key('keydown', 'Equal');
    key('keyup', 'Equal');
    await wait(60);
  }
  console.log('RING scope zoom pressed ten times');
  await wait(600);
} else {
  await run();
}

async function run() {
  const until = async (fn: () => unknown, label: string, ms = 60000) => {
    const end = performance.now() + ms;
    while (!fn()) {
      if (performance.now() > end) throw new Error(`ring-greybox: ${label}`);
      await wait(50);
    }
  };
  await until(() => page.__ring && me.body && inspectRailwayLegacy()?.ready, 'greybox, body and railway ready');
  const R = page.__ring!;
  await until(() => R.root.visible, 'greybox pipelines');
  const b = me.body!;
  const L = R.layout;
  const HX = 0.0272;
  const HEAD = { x: 1402.0, z: -372 };
  const platTop = (u: number) => R.deckY(u) + 0.9;
  /** u and lat of a world point (the inverse of `at`). */
  const ul = (x: number, z: number) => {
    let u = HEAD.z - z,
      lat = x - HEAD.x - HX * u;
    for (let k = 0; k < 3; k++) {
      u = HEAD.z - z + HX * lat;
      lat = x - HEAD.x - HX * u;
    }
    return { u, lat };
  };
  const here = () => ul(b.position.x, b.position.z);
  const faceTo = (dx: number, dz: number) => {
    cam.yaw = me.yaw = Math.atan2(-dx, -dz);
  };
  const lane = () => faceTo(HX, -1); // along u
  const f2 = (n: number) => +n.toFixed(2);
  const say = (text: string) => console.log(`RING ${text}`);
  const stage = async (u: number, lat: number, y: number) => {
    const p = R.at(u, lat);
    teleport(b, p.x, y, p.z);
    b.velocity.set(0, 0, 0);
    input.keys.clear();
    releaseJump();
    await wait(700);
  };
  const standing = () => me.coyote > 0 && !me.swimming;

  let travelled = 0;
  /** Walk by real keys to (u, lat), steering the camera each tick; true if it got within `tol`. */
  async function walkTo(u: number, lat: number, tol: number, ms: number, sprint = false) {
    const p = R.at(u, lat);
    input.keys.add('KeyW');
    if (sprint) input.keys.add('ShiftLeft');
    const end = performance.now() + ms;
    try {
      let lx = b.position.x,
        lz = b.position.z;
      while (performance.now() < end) {
        const dx = p.x - b.position.x,
          dz = p.z - b.position.z;
        travelled += Math.hypot(b.position.x - lx, b.position.z - lz);
        lx = b.position.x;
        lz = b.position.z;
        if (Math.hypot(dx, dz) < tol) return true;
        faceTo(dx, dz);
        await wait(16);
      }
      return false;
    } finally {
      input.keys.delete('KeyW');
      input.keys.delete('ShiftLeft');
    }
  }
  async function walkPath(path: [number, number][], tol: number, msPer: number) {
    for (const [u, lat] of path) {
      if (!(await walkTo(u, lat, tol, msPer))) {
        const h = here();
        return { ok: false, stuckBefore: [u, lat], at: { u: f2(h.u), lat: f2(h.lat), y: f2(b.position.y) } };
      }
    }
    return { ok: true } as { ok: boolean; stuckBefore?: number[]; at?: Record<string, number> };
  }

  const result: Record<string, unknown> = {
    load: 'read by the caller (npm run heartbeat) and noted per run; timings here are page time under whatever load',
  };
  page.__ringResult = result;

  // ---------------------------------------------------------------- stills
  const setView = (name: string) => {
    const v = R.views[name]!;
    window.__debugCam!.set([v.cam.x, v.cam.y, v.cam.z], [v.look.x, v.look.y, v.look.z]);
  };
  const lockView = (name: string) => {
    setView(name);
    // look places its own default camera after the eval; the named view is the one to capture.
    window.__debugCam!.set = () => {};
  };
  if (view) {
    const stand: Record<string, [number, number, number]> = {
      bentRamp: [249.5, 13, 5.6],
      hingeRamp: [297.5, 15, 5.4],
      gap: [252, 4, platTop(252)],
      hook: [284, 6, R.braceY],
    };
    const s = stand[view];
    if (!s) throw new Error(`ring-greybox: no view ${view}`);
    await stage(s[0], s[1], s[2] + PLAYER_R + 0.3);
    lane();
    lockView(view);
    await wait(1500);
    say(`view ${view} staged`);
    result.view = view;
    return;
  }

  // ---------------------------------------------------------------- measuring helpers
  const owned = () => {
    const s = inspectRailwayLegacy()!;
    return { jump: s.jump, hook: s.hookShot.owned, glide: s.glider.owned };
  };
  result.ownedAtStart = owned();
  // The double jump and the glider are finds, not seed facts (crossing-done has neither): take each at its device with a
  // real Interact press, as railway-held-jump.ts and railway-glide.ts do. Staging teleports only; the greybox is untouched.
  async function take(what: 'jump' | 'glide') {
    const s = inspectRailwayLegacy()!;
    if (what === 'jump' ? s.jump : s.glide) return;
    const d = what === 'jump' ? s.reward.jumpDevice : s.line2View.glideDevice;
    teleport(b, d.x + (what === 'glide' ? 2.5 : 0), d.y + PLAYER_R + 0.5, d.z);
    b.velocity.set(0, 0, 0);
    await until(() => interactTarget(), `${what} device offers Interact`, 8000);
    say(`${what} device target ${interactTarget()?.id}`);
    triggerAction('interact', 'down');
    triggerAction('interact', 'up');
    await until(() => (what === 'jump' ? inspectRailwayLegacy()!.jump : inspectRailwayLegacy()!.glide), `${what} accepted`, 8000);
    await wait(2200);
    for (let k = 0; k < 6 && inspectRailwayLegacy()!.reward.showing; k++) {
      key('keydown', 'KeyE');
      key('keyup', 'KeyE');
      await wait(700);
    }
    await until(() => !inspectRailwayLegacy()!.reward.showing, `${what} card dismissed`, 8000);
  }
  try {
    await take('jump');
    await take('glide');
    await until(() => inspectRailwayLegacy()!.glider.owned, 'glider owned', 8000);
  } catch (e) {
    result.takeError = String(e);
    say(`take failed ${e}`);
  }
  result.owned = owned();
  say(`owned ${JSON.stringify(result.owned)}`);

  // `ringonly=f,g` runs only those items (a re-measure), the rest are skipped.
  const only = query.get('ringonly')?.split(',');
  const item = async (id: string, fn: () => Promise<unknown>) => {
    if (only && !only.includes(id)) return;
    try {
      result[id] = await fn();
    } catch (e) {
      result[id] = { error: String(e) };
    }
    say(`${id} ${JSON.stringify(result[id])}`);
  };

  /** Swim to a slipway and walk the flights; the path is (u, lat) corners from the greybox's builders. */
  const BENT: [number, number][] = [
    [238, 14],
    [248, 14],
    [249.6, 13.3],
    [249.6, 11.8],
    [238, 11.8],
    [236.4, 11.4],
    [236.4, 9.6],
    [248, 9.6],
    [250.5, 8.6],
    [252.5, 5.2],
    [256, 4.2],
  ];
  const HINGE: [number, number][] = [
    [286, 16],
    [296, 16],
    [297.6, 15],
    [297.6, 13.8],
    [287, 13.8],
    [285.2, 13],
    [285.2, 9],
    [284, 6],
  ];
  const onPlatform = (u0: number, u1: number, l0: number, l1: number, top: number) => {
    const h = here();
    return h.u >= u0 && h.u <= u1 && h.lat >= l0 && h.lat <= l1 && Math.abs(b.position.y - PLAYER_R - top) < 0.6;
  };

  async function rampWalk(label: string, foot: [number, number], path: [number, number][], arrived: () => boolean) {
    await stage(foot[0], foot[1], 0.2);
    const jumps = me.jumpPresses;
    const swimmingAtStart = me.swimming;
    travelled = 0;
    const t0 = performance.now();
    lane();
    const first = await walkTo(path[0]![0], path[0]![1], 1.0, 8000);
    const r = first ? await walkPath(path.slice(1), 0.8, 7000) : { ok: false, at: { y: f2(b.position.y) } };
    await wait(250);
    const seconds = f2((performance.now() - t0) / 1000);
    const h = here();
    return {
      label,
      swimmingAtStart,
      arrived: arrived(),
      within10s: seconds <= 10,
      seconds,
      metresWalked: f2(travelled),
      noJumpPressed: me.jumpPresses === jumps,
      end: { u: f2(h.u), lat: f2(h.lat), y: f2(b.position.y) },
      ...r,
    };
  }

  await item('a', () =>
    rampWalk('bent ramp to the railhead platform', [232, 14], BENT, () =>
      onPlatform(235, 260, 1.8, 6.3, platTop(here().u)),
    ),
  );
  await item('b', () =>
    rampWalk('hinge ramp to the brace platform', [280, 16], HINGE, () => onPlatform(276.5, 289, 2.2, 10.2, R.braceY)),
  );

  /** (c) a swimmer 6 m out from a slipway's foot swims in and walks on up the first flight. */
  async function swimIn(foot: [number, number], flightEnd: [number, number], dir: 1 | -1) {
    await stage(foot[0] - 6 * dir, foot[1], 0.2);
    await wait(500);
    const swimmingStart = me.swimming;
    input.keys.add('KeyW');
    faceTo(HX * dir, -dir);
    const t0 = performance.now();
    let walkedOut = false;
    while (performance.now() - t0 < 12000) {
      const p = R.at(foot[0] + 8 * dir, foot[1]);
      faceTo(p.x - b.position.x, p.z - b.position.z);
      if (!me.swimming && b.position.y > 0.1 && standing()) {
        walkedOut = true;
        break;
      }
      await wait(16);
    }
    input.keys.delete('KeyW');
    const out = here();
    const secondsToWalk = f2((performance.now() - t0) / 1000);
    const cont = walkedOut && (await walkTo(flightEnd[0], flightEnd[1], 1.0, 6000));
    const h = here();
    return {
      swimmingStart,
      swimmingEndedOnSlipway: walkedOut,
      slipwayAt: { u: f2(out.u), lat: f2(out.lat) },
      secondsToWalk,
      walkContinues: cont,
      end: { u: f2(h.u), lat: f2(h.lat), y: f2(b.position.y), swimming: me.swimming },
    };
  }
  await item('c', async () => ({
    bent: await swimIn([232, 14], [244, 14], 1),
    hinge: await swimIn([280, 16], [292, 16], 1),
  }));

  /** (d) Hook while swimming near the hook pile's foot: refused by canPress (`!me.swimming`). */
  const press = async (code: string) => {
    key('keydown', code);
    await wait(60);
    key('keyup', code);
  };
  const hookState = () => {
    const h = inspectRailwayLegacy()!.hookShot;
    return {
      owned: h.owned,
      pick: h.pick,
      pulling: h.pulling,
      pulls: h.pulls,
      denied: h.denied,
      rings: h.rings.length,
    };
  };
  const toRing = () => {
    const p = R.at(L.hookPile.u, L.hookPile.lat);
    faceTo(p.x - b.position.x, p.z - b.position.z);
    const dy = L.hookPile.y - (b.position.y + 1.3),
      dh = Math.hypot(p.x - b.position.x, p.z - b.position.z);
    cam.pitch = Math.atan2(dy, dh);
  };
  await item('d', async () => {
    await stage(L.hookPile.u - 6, L.hookPile.lat + 10, 0.2);
    await wait(600);
    const swimming = me.swimming;
    const pile = R.at(L.hookPile.u, L.hookPile.lat);
    const dist = f2(Math.hypot(pile.x - b.position.x, pile.z - b.position.z));
    toRing();
    const before = hookState();
    const y0 = b.position.y;
    await press('KeyF');
    await wait(900);
    const after = hookState();
    return {
      swimming,
      metresFromPileFoot: dist,
      before,
      after,
      pulled: after.pulls > before.pulls || after.pulling,
      refused: !(after.pulls > before.pulls || after.pulling),
      movedUp: f2(b.position.y - y0),
    };
  });

  /** (e) Hook from the brace platform's four corners, aimed at the ring. */
  await item('e', async () => {
    const corners: [string, number, number][] = [
      ['near west', 277.5, 3.2],
      ['near east', 277.5, 9.2],
      ['far west', 288, 3.2],
      ['far east', 288, 9.2],
    ];
    const out: unknown[] = [];
    for (const [name, u, lat] of corners) {
      await stage(u, lat, R.braceY + PLAYER_R + 0.3);
      await wait(500);
      const ring = R.at(L.hookPile.u, L.hookPile.lat);
      const eye = { x: b.position.x, y: b.position.y + 1.3, z: b.position.z };
      const metres = f2(Math.hypot(ring.x - eye.x, L.hookPile.y - eye.y, ring.z - eye.z));
      toRing();
      await wait(300);
      const before = hookState();
      await press('KeyF');
      await wait(2500);
      const after = hookState();
      const h = here();
      out.push({
        name,
        eyeMetresToGreyboxRing: metres,
        before,
        pulls: after.pulls - before.pulls,
        connected: after.pulls > before.pulls,
        end: { u: f2(h.u), lat: f2(h.lat), y: f2(b.position.y) },
        onPadOfRailheadPlatform: onPlatform(235, 260, 1.8, 6.3, platTop(h.u)),
      });
    }
    return out;
  });

  // ---------------------------------------------------------------- (f) (g) (g2): off the railhead platform's end
  const TAKEOFF = L.railhead - 0.4;
  type Sample = { t: number; u: number; lat: number; y: number; vy: number; c: number; sw: boolean };
  /** Sprint down the lane from u 246 and hand control to `fly` at the take-off. Returns the whole trace. */
  async function flight(fly: (t0: number) => Promise<void>, ms = 9000, releaseAtU = Infinity) {
    await stage(246, 4, platTop(246) + PLAYER_R + 0.3);
    lane();
    cam.pitch = -0.1;
    input.keys.add('KeyW');
    input.keys.add('ShiftLeft');
    const trace: Sample[] = [];
    try {
      const tEnd = performance.now() + 8000;
      while (here().u < TAKEOFF) {
        if (performance.now() > tEnd) throw new Error('ring-greybox: sprint to the platform end');
        await wait(4);
      }
      const t0 = performance.now();
      let done = false;
      const flown = fly(t0).finally(() => (done = true));
      let sinceLand = 0;
      while (performance.now() - t0 < ms && !done) {
        const h = here();
        trace.push({
          t: performance.now() - t0,
          u: h.u,
          lat: h.lat,
          y: b.position.y,
          vy: b.velocity.y,
          c: me.coyote,
          sw: me.swimming,
        });
        if (h.u >= releaseAtU) {
          input.keys.delete('KeyW');
          input.keys.delete('ShiftLeft');
        }
        await wait(8);
      }
      await flown;
      // run on until it lands or swims
      const end = performance.now() + ms;
      while (performance.now() < end) {
        const h = here();
        const s: Sample = {
          t: performance.now() - t0,
          u: h.u,
          lat: h.lat,
          y: b.position.y,
          vy: b.velocity.y,
          c: me.coyote,
          sw: me.swimming,
        };
        trace.push(s);
        if (h.u >= releaseAtU) {
          input.keys.delete('KeyW');
          input.keys.delete('ShiftLeft');
        }
        if (s.t > 400 && (s.sw || (s.c > 0 && Math.abs(s.vy) < 0.5))) {
          if (++sinceLand > 8) break;
        } else sinceLand = 0;
        await wait(8);
      }
    } finally {
      input.keys.delete('KeyW');
      input.keys.delete('ShiftLeft');
      releaseJump();
    }
    return trace;
  }
  const spanOf = (trace: Sample[]) => {
    const last = trace[trace.length - 1]!;
    const first = trace.find((s) => s.t >= 0)!;
    // the u where the body fell through the brace platform's standing height (the model's "landing u")
    const level = R.braceY + PLAYER_R;
    let cross: number | null = null;
    for (let k = 1; k < trace.length; k++) {
      const a = trace[k - 1]!,
        c = trace[k]!;
      if (a.u > L.railhead - 1 && a.y > level && c.y <= level) {
        cross = a.u + ((c.u - a.u) * (a.y - level)) / (a.y - c.y || 1);
        break;
      }
    }
    // The landing: the first ground contact after the body has been airborne (the controller's coyote set again), the
    // midpoint of the two samples around it. Crossing the standing height comes 0.2-0.45 s after touchdown on a deck,
    // with the body still sprinting (R1 review), so it is kept only for a splash, where there is no contact to read.
    let contact: number | null = null,
      splash = false;
    for (let k = 1, aired = false; k < trace.length; k++) {
      const a = trace[k - 1]!,
        c = trace[k]!;
      if (c.c <= 0) aired = true;
      if (aired && c.sw) {
        splash = true;
        break;
      }
      if (aired && a.c <= 0 && c.c > 0) {
        contact = (a.u + c.u) / 2;
        break;
      }
    }
    const peak = trace.reduce((m, s) => (s.y > m.y ? s : m), trace[0]!);
    return {
      takeoffU: f2(first.u),
      apexAtMs: Math.round(peak.t),
      apexY: f2(peak.y),
      firstContactU: contact === null ? null : f2(contact),
      landU: contact !== null ? f2(contact) : splash && cross !== null ? f2(cross) : null,
      uAtPlatformLevel: cross === null ? null : f2(cross),
      end: { u: f2(last.u), lat: f2(last.lat), y: f2(last.y), swimming: last.sw },
      landedOn: last.sw ? 'sea' : last.y > R.braceY + 0.2 ? 'a deck' : 'low ground',
      onBracePlatform: !last.sw && last.u >= 276.5 && last.u <= 289 && Math.abs(last.y - PLAYER_R - R.braceY) < 0.6,
      seconds: f2(last.t / 1000),
    };
  };
  const firstJump = () => {
    pressJump();
  };
  const jumpsSpent = () => inspectRailwayLegacy()!.reward.tools.jumps;

  await item('f', async () => {
    const out: Record<string, unknown> = {};
    // 'apex' and 'late' (1.0 s) are the plan's two; the numbers are a sweep of the press time in seconds, for the record
    for (const mode of ['apex', 'late', 0.7, 0.85, 1.15] as const) {
      const jumps0 = jumpsSpent();
      let secondAt = 0,
        secondVy = 0,
        secondU = 0,
        secondY = 0,
        secondH = 0;
      const trace = await flight(async (t0) => {
        firstJump(); // held for the full rise, as a player holds it
        await wait(60);
        for (const end = performance.now() + 2000; !(b.velocity.y <= 0 && !standing()); await wait(2))
          if (performance.now() > end) throw new Error('ring-greybox: first jump apex');
        releaseJump();
        if (mode !== 'apex') await wait(Math.max(0, (mode === 'late' ? 1000 : mode * 1000) - (performance.now() - t0)));
        else await wait(25);
        secondAt = performance.now() - t0;
        secondVy = b.velocity.y;
        secondU = here().u;
        secondY = b.position.y;
        secondH = Math.hypot(b.velocity.x, b.velocity.z);
        pressJump();
        await wait(60);
        releaseJump();
        await wait(150);
      });
      const span = spanOf(trace);
      const takeoff = span.takeoffU;
      const lands = span.landU;
      out[String(mode)] = {
        ...span,
        secondPressedAtMs: Math.round(secondAt),
        secondPressVy: f2(secondVy),
        secondPressU: f2(secondU),
        secondPressY: f2(secondY),
        secondPressHorizontalMs: f2(secondH),
        airJumpsSpent: jumpsSpent() - jumps0,
        // what the review's model gives for a take-off at u 260: carry the difference in take-off u
        landUOn260: lands === null ? null : f2(lands - (takeoff - L.railhead)),
      };
    }
    const apex = out.apex as { landUOn260: number | null };
    const late = out.late as { landUOn260: number | null };
    out.predicted = { apex: 276.4, late: 279.3, plusCoyoteMax: 0.9 };
    out.apexVsPrediction = apex.landUOn260 === null ? null : f2(apex.landUOn260 - 276.4);
    out.lateVsPrediction = late.landUOn260 === null ? null : f2(late.landUOn260 - 279.3);
    out.latePastPredictionByMoreThan0_3m = late.landUOn260 === null ? null : late.landUOn260 - 279.3 > 0.3;
    return out;
  });

  /** (g) a sprint jump, the air jump at the apex, then Jump opens the canopy. */
  const glideAfterJumps = async (releaseAtU: number) => {
    const opens0 = inspectRailwayLegacy()!.glider.jumpOpens;
    const trace = await flight(
      async () => {
        pressJump();
        await wait(60);
        await until(() => b.velocity.y <= 0 && !standing(), 'first jump apex', 2000);
        releaseJump();
        await wait(25);
        pressJump(); // the air jump
        await wait(60);
        releaseJump();
        await wait(300);
        pressJump(); // no air jump left: Jump opens the canopy
        await wait(60);
        releaseJump();
        await wait(100);
        await until(() => !inspectRailwayLegacy()!.glider.open || standing() || me.swimming, 'glide ends', 14000);
      },
      16000,
      releaseAtU,
    );
    return { ...spanOf(trace), canopyOpened: inspectRailwayLegacy()!.glider.jumpOpens > opens0 };
  };
  /** (g2) straight off the edge with no jump: once the ground is gone, the Glide action. */
  const glideOffEdge = async (releaseAtU: number) => {
    const opens0 = inspectRailwayLegacy()!.glider.opened;
    const trace = await flight(
      async () => {
        await until(() => me.coyote <= 0 && !standing(), 'off the edge', 3000);
        triggerAction('glide', 'down');
        triggerAction('glide', 'up');
        await wait(100);
        await until(() => !inspectRailwayLegacy()!.glider.open || standing() || me.swimming, 'glide ends', 14000);
      },
      16000,
      releaseAtU,
    );
    return { ...spanOf(trace), canopyOpened: inspectRailwayLegacy()!.glider.opened > opens0 };
  };
  // Full stick all the way, and the stick let go once past u 280 (the canopy brakes and sinks): a player would do the second.
  await item('g', async () => ({ fullStick: await glideAfterJumps(Infinity), letGoAt280: await glideAfterJumps(280) }));
  await item('g2', async () => ({ fullStick: await glideOffEdge(Infinity), letGoAt270: await glideOffEdge(270) }));

  // ---------------------------------------------------------------- done: leave the camera on the gap view for the still
  input.keys.clear();
  await stage(252, 4, platTop(252) + PLAYER_R + 0.3);
  lane();
  lockView('gap');
  await wait(1500);
  result.done = true;
  say(`result ${JSON.stringify(result)}`);
}
export {};
