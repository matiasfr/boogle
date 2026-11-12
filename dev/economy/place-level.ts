// `npm run level-check` (the village part): the progression check on the production world's land and tech layout (src/place).
// The classic adapter composes dev/layouts from `Site`; this checks place's land with the same player
// limits: from spawn, what can you reach on foot, in each state of the job? And it reports how long the walks really are.
// It floods the 2 m grid of src/place/terrain.ts at the player's walkable slope, plus what's solid to walk on (footbridges
// and laid track). It doesn't know about props in the way, which only the play-through (the railway bot, dev/look/bots/railway.ts) tests.
import { WALKABLE_NY } from '../../src/constants.ts';
import { CELL, H, NX, NZ, PATH_SAMPLES, at as cellAt, cellX, cellZ, heights } from '../../src/place/terrain.ts';
import {
  DEVICES,
  GATES,
  JUMP_COURSE,
  JUMP_RECOVERY,
  LEVER,
  MOVE,
  PADS,
  PILLARS,
  HOOK_FLUSH,
  SECRETS,
  SERVICE_ROUTES,
  padById,
  ringAt,
} from '../../src/place/tech-layout.ts';
import {
  BUOYS,
  FORGE_FRAME,
  FORMATION,
  GREAT_TREE,
  GROVES,
  HEAD,
  LINES,
  LINKS,
  OAK,
  ORIGIN,
  PATHS,
  RACK,
  ROCKS,
  SCOPE,
  SPAWN,
  lineAt,
  railY,
  upLat,
  type Line,
  type LinePoint,
} from '../../src/place/layout.ts';

type Entry = { state: string; message: string } & (
  { kind: 'section' | 'fact' } | { kind: 'assertion'; passed: boolean }
);

/** The existing progression checks, also callable by the unified level-check entry point. No physics witness. */
export function runPlaceLevelCheck() {
  const entries: Entry[] = [];
  let state = 'start';
  const fact = (message: string) => entries.push({ kind: 'fact', state, message });
  const section = (id: string, message: string) => {
    state = id;
    entries.push({ kind: 'section', state, message });
  };
  const assertion = (passed: boolean, message: string, requiredState = state) => {
    entries.push({ kind: 'assertion', state: requiredState, passed, message });
  };
  const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  // The player's slope limit, as a rise over one 2 m cell.
  const maxRise = CELL * Math.tan(Math.acos(WALKABLE_NY));
  const WATER = 0.2;
  const k = (i: number, j: number) => i + j * NX;
  const ij = (x: number, z: number) => [Math.round((x - cellX(0)) / CELL), Math.round((z - cellZ(0)) / CELL)] as const;

  /** Extra links: a bridge or a laid track joins its cells whatever's under it. */
  function linksFor(tracks: [Line, number, number][]) {
    const extra = new Map<number, number[]>();
    const join = (a: number, b: number) => {
      if (a === b) return;
      (extra.get(a) ?? extra.set(a, []).get(a)!).push(b);
      (extra.get(b) ?? extra.set(b, []).get(b)!).push(a);
    };
    for (const p of PATHS) {
      const a = p.pts[p.bridgeAt]!,
        b = p.pts[p.bridgeAt + 1]!;
      const [ai, aj] = ij(a[0], a[1]),
        [bi, bj] = ij(b[0], b[1]);
      join(k(ai, aj), k(bi, bj));
    }
    for (const [line, s0, s1] of tracks) {
      let prev = -1;
      for (let s = s0; s <= s1; s += 1) {
        lineAt(line, s, P);
        const [i, j] = ij(P.x, P.z);
        if (i < 0 || j < 0 || i >= NX || j >= NZ) continue;
        const c = k(i, j);
        if (prev >= 0) join(prev, c);
        prev = c;
      }
    }
    return extra;
  }
  function flood(tracks: [Line, number, number][]) {
    const extra = linksFor(tracks);
    const seen = new Uint8Array(NX * NZ);
    const [si, sj] = ij(SPAWN.x, SPAWN.z);
    const q = [k(si, sj)];
    seen[q[0]!] = 1;
    while (q.length) {
      const c = q.pop()!,
        i = c % NX,
        j = Math.floor(c / NX),
        h = heights[cellAt(i, j)]!;
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const a = i + di,
          b = j + dj;
        if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
        const n = k(a, b);
        if (seen[n]) continue;
        const g = heights[cellAt(a, b)]!;
        if (g < WATER || Math.abs(g - h) > maxRise) continue;
        seen[n] = 1;
        q.push(n);
      }
      for (const n of extra.get(c) ?? [])
        if (!seen[n]) {
          seen[n] = 1;
          q.push(n);
        }
    }
    return seen;
  }
  const can = (seen: Uint8Array, x: number, z: number) => {
    // Near enough: within a couple of cells, for what stands on a wall's lip.
    const [i, j] = ij(x, z);
    for (let dj = -2; dj <= 2; dj++)
      for (let di = -2; di <= 2; di++) {
        const a = i + di,
          b = j + dj;
        if (a >= 0 && b >= 0 && a < NX && b < NZ && seen[k(a, b)]) return true;
      }
    return false;
  };
  function check(name: string, seen: Uint8Array, x: number, z: number) {
    const ok = can(seen, x, z);
    assertion(ok, name);
  }
  const framePos = (st: (typeof LINKS)[number]['stations'][number], l: Line, dir: number) => {
    lineAt(l, st.s - dir * 1.5, P);
    return { x: P.x - P.uz * st.side * 5.4, z: P.z + P.ux * st.side * 5.4 };
  };
  const [timber, quarry] = LINKS as [(typeof LINKS)[0], (typeof LINKS)[1]];

  section(
    'start',
    `\nAt the start: only the paths and footbridges (the player's slope limit: rise ${maxRise.toFixed(2)} m a cell)`,
  );
  const start = flood([]);
  const N = LINES.north,
    E = LINES.east;
  check('the machine, the long way round', start, N.xs[191]!, N.zs[191]!);
  for (const st of timber.stations) {
    const q = framePos(st, N, -1);
    check(`frame ${st.id}`, start, q.x, q.z);
  }
  for (const g of GROVES) check(`the grove at ${g.x},${g.z}`, start, g.x, g.z);
  check('the great tree', start, GREAT_TREE.x, GREAT_TREE.z);
  for (const r of ROCKS) check(`the rock at ${r.x},${r.z}`, start, r.x, r.z);
  check('the old oak', start, OAK.x, OAK.z);
  check("the forge's frame", start, FORGE_FRAME.x, FORGE_FRAME.z);
  check('the telescope', start, SCOPE.x, SCOPE.z);

  section('far-head-line', '\nOnce line 2 reaches Far Head');
  const open = flood([
    [N, 0, N.len],
    [E, 0, quarry.stations[4]!.to],
  ]);
  for (const st of quarry.stations) {
    const q = framePos(st, E, 1);
    check(`frame ${st.id}`, open, q.x, q.z);
    lineAt(E, st.s - 16, P);
    if (st.rack) check(`  its rack`, open, P.x - P.uz * st.side * 5.2, P.z + P.ux * st.side * 5.2);
  }
  for (const s of quarry.stops) {
    lineAt(E, s, P);
    check(`stop at ${s}`, open, P.x, P.z);
  }
  check('the forge rack', open, RACK.x, RACK.z);
  const headCentre = can(start, HEAD.x, HEAD.z);
  assertion(
    !headCentre,
    headCentre
      ? 'Far Head can be walked to before the line reaches it'
      : 'Far Head is out of reach until the line gets there',
    'start',
  );

  // ---------------------------------------------------------------- abilities: what each state of the run can reach
  // The flood above is walking. Over it, the moves as numbers, from the real controller's constants: one jump's rise, two jumps',
  // a hook's 24 m to a ring, and the glide's budget with the research's margins. Each edge names what it needs, so a state's list is
  // everything you can stand on with what you have then. Not physics: the bot (the railway bot, dev/look/bots/railway.ts) does those moves
  // for real. This one looks for what shouldn't be possible yet.
  type Have = { jump: boolean; hook: boolean; glide: boolean };
  const ONE_JUMP = 1.68,
    TWO_JUMPS = 3.03,
    JUMP_REACH = 4.7, // walking pace, one jump
    TWO_REACH = 8; // two
  // Course-only sprint envelopes; browser inputs supply the collision witness. Include coyote grace and body diameter.
  const COURSE_SINGLE = 9.5 * (0.842 + 0.1) + 0.9;
  const COURSE_DOUBLE = 9.5 * (0.511 + 0.466 + Math.sqrt((2 * 3.03) / 30.6));
  const courseIds = new Set(JUMP_COURSE.slice(1).map((p) => p.id));
  const GLIDE = (drop: number) => Math.max(0, (drop - 2) * (MOVE.glideSpeed / MOVE.glideSink) * 0.8 - 2.8);
  const groundAt = (seen: Uint8Array, x: number, z: number, y: number, rise: number, reach: number) => {
    // Any walkable cell within reach, whose ground is at most `rise` under y.
    const [ci, cj] = ij(x, z);
    const n = Math.ceil(reach / CELL);
    let best = Infinity;
    for (let dj = -n; dj <= n; dj++)
      for (let di = -n; di <= n; di++) {
        const i = ci + di,
          j = cj + dj;
        if (i < 0 || j < 0 || i >= NX || j >= NZ || !seen[k(i, j)]) continue;
        const d = Math.hypot(cellX(i) - x, cellZ(j) - z);
        if (d > reach) continue;
        const h = heights[cellAt(i, j)]!;
        if (y - h <= rise && y - h > -30) best = Math.min(best, d);
      }
    return best < Infinity;
  };
  function padsReachable(seen: Uint8Array, have: Have, tracks: [Line, number, number][]) {
    const got = new Set<string>();
    // From track: a pad's edge within reach of a laid deck, at a height you can make.
    const fromTrack = (x: number, z: number, y: number, hx: number, rise: number, reach: number) => {
      for (const [l, a, b] of tracks)
        for (let s = a; s <= b; s += 2) {
          lineAt(l, s, P);
          const d = Math.max(0, Math.hypot(P.x - x, P.z - z) - hx);
          if (d <= reach && y - railY(l, s) <= rise && y >= railY(l, s) - 4) return true;
        }
      return false;
    };
    // The hook walk (SERVICE_ROUTES.hook, drawn with line 2 over the stem): places to stand, sampled every metre along
    // its centreline, the first points flush with the deck's walkable top. Measured from the centreline, as decks are.
    const walk: { x: number; z: number; y: number }[] = [];
    if (tracks.some(([l, a, b]) => l === E && a <= 84 && b >= 92)) {
      const pts = SERVICE_ROUTES.hook.map((q, i) => ({ ...q, y: q.y + (i < HOOK_FLUSH.points ? HOOK_FLUSH.top : 0) }));
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!,
          b = pts[i]!;
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
        for (let j = 0; j <= n; j++)
          walk.push({ x: a.x + ((b.x - a.x) * j) / n, z: a.z + ((b.z - a.z) * j) / n, y: a.y + ((b.y - a.y) * j) / n });
      }
    }
    const fromWalk = (x: number, z: number, y: number, hx: number, rise: number, reach: number) =>
      walk.some((q) => Math.max(0, Math.hypot(q.x - x, q.z - z) - hx) <= reach && y - q.y <= rise && y >= q.y - 4);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of PADS) {
        if (got.has(p.id)) continue;
        const r = Math.max(p.hx, p.hz);
        // A pillar's lip joins the deck: walk.
        const pillar = PILLARS.find((q) => q.id === p.id);
        const lip = pillar?.lipTo;
        const lipTrack = tracks.find(([l, a, b]) => l === N && a <= 92 && b >= 92);
        lineAt(N, 92, P);
        // The flat 2.4 m-wide lip butts the trestle deck's edge (the double formation's, 5.8 m left of the line: it stops
        // there rather than run through the leaning planks, dev/level/timber-track.ts), and both ends are walkable
        // steps (14 cm at track, 4 cm at pad). Check the authored connector, not a
        // loose proximity budget that stops matching after the pillar moves outward.
        let ok = !!(
          p.id === 'p1' &&
          pillar &&
          lip &&
          lipTrack &&
          Math.hypot(lip.x - P.x, lip.z - P.z) <= 1.85 - (upLat(FORMATION.timber, 92) ?? 0) &&
          Math.abs(pillar.top - 0.04 - (railY(N, 92) + 0.1)) <= 0.3 &&
          Math.abs(pillar.x - p.x) < p.hx &&
          Math.abs(pillar.z - p.z) < p.hz &&
          Math.abs(p.top - (pillar.top - 0.04)) <= 0.3
        );
        // Jumps, from the ground or a deck.
        const rise = have.jump ? TWO_JUMPS : ONE_JUMP,
          reach = courseIds.has(p.id)
            ? have.jump
              ? COURSE_DOUBLE
              : COURSE_SINGLE
            : have.jump
              ? TWO_REACH
              : JUMP_REACH;
        ok ||=
          groundAt(seen, p.x, p.z, p.top, rise, reach + r) ||
          fromTrack(p.x, p.z, p.top, r, rise, reach) ||
          fromWalk(p.x, p.z, p.top, r, rise, reach);
        for (const id of got) {
          const q = padById(id);
          const d = Math.max(0, Math.hypot(q.x - p.x, q.z - p.z) - r - Math.max(q.hx, q.hz));
          // A pad to a pad: jumps; a hook, if it has a ring; down by glide.
          ok ||= p.top - q.top <= rise && d <= reach;
          if (have.glide && q.top > p.top) ok ||= d <= GLIDE(q.top - p.top);
        }
        if (have.glide)
          for (const [l, a0, b0] of tracks)
            for (let s = a0; s <= b0 && !ok; s += 2) {
              lineAt(l, s, P);
              const y = railY(l, s);
              ok = y > p.top && Math.max(0, Math.hypot(P.x - p.x, P.z - p.z) - r) <= GLIDE(y - p.top);
            }
        if (have.hook && p.ring) {
          const a = ringAt(p);
          // From the ground, from a deck, from another pad, within the hook's range of the ring.
          const inRange = (x: number, y: number, z: number) => Math.hypot(a.x - x, a.y - y, a.z - z) <= MOVE.hookRange;
          for (const id of got) {
            const q = padById(id);
            ok ||= inRange(q.x, q.top + 1, q.z);
          }
          const [ci, cj] = ij(a.x, a.z);
          const n = Math.ceil(MOVE.hookRange / CELL);
          for (let dj = -n; dj <= n && !ok; dj++)
            for (let di = -n; di <= n && !ok; di++) {
              const i = ci + di,
                j = cj + dj;
              if (i < 0 || j < 0 || i >= NX || j >= NZ || !seen[k(i, j)]) continue;
              ok = inRange(cellX(i), heights[cellAt(i, j)]! + 1, cellZ(j));
            }
          for (const [l, a0, b0] of tracks)
            for (let s = a0; s <= b0 && !ok; s += 2) {
              lineAt(l, s, P);
              ok = inRange(P.x, railY(l, s) + 1, P.z);
            }
          ok ||= walk.some((q) => inRange(q.x, q.y + 1, q.z));
        }
        if (ok) {
          got.add(p.id);
          grew = true;
        }
      }
    }
    return got;
  }
  const mustNot = (got: Set<string>, id: string, why: string, requiredState = state) => {
    const bad = got.has(id);
    assertion(!bad, `${id} is out of reach: ${why}`, requiredState);
  };
  /** A secret the model reaches before its ability, accepted as a sequence break (designer, 9 November;
   * docs/agent-calls.md): reported as a fact, not failed. */
  const accepted = (got: Set<string>, id: string, how: string) =>
    fact(
      `  ${got.has(id) ? 'accepted' : 'ok      '} ${id}: ${got.has(id) ? `reached early, accepted: ${how}` : 'not reached'}`,
    );
  const must = (got: Set<string>, id: string, why: string) => {
    const ok = got.has(id);
    assertion(ok, `${id}: ${why}`);
  };
  section('double-jump-course', '\nDouble-jump course: edge gaps and dry recovery');
  for (let i = 1; i < JUMP_COURSE.length; i++) {
    const a = JUMP_COURSE[i - 1]!,
      b = JUMP_COURSE[i]!;
    const dx = Math.max(0, Math.abs(b.x - a.x) - a.hx - b.hx);
    const dz = Math.max(0, Math.abs(b.z - a.z) - a.hz - b.hz);
    const gap = Math.hypot(dx, dz);
    assertion(
      a.top === b.top && gap > COURSE_SINGLE && gap < COURSE_DOUBLE - 1,
      `${a.id} -> ${b.id}: ${gap.toFixed(2)} m; single upper estimate ${COURSE_SINGLE.toFixed(2)}, double ${COURSE_DOUBLE.toFixed(2)} m`,
    );
  }
  const drop = JUMP_COURSE[0]!.top - JUMP_RECOVERY.top;
  assertion(drop > TWO_JUMPS && drop <= 4, `catch floor ${drop.toFixed(2)} m down; below double-jump reach`);
  // Keep a 1.5 m rail corridor and 4.2 m overhead for a rider on cargo. Slabs are 1.2 m thick.
  let railConflicts = 0;
  for (const line of Object.values(LINES)) {
    for (let s = 0; s <= line.len; s += 0.25) {
      lineAt(line, s, P);
      const y = railY(line, s);
      for (const slab of JUMP_RECOVERY.slabs) {
        if (Math.abs(P.x - slab.x) > slab.hx + 1.5 || Math.abs(P.z - slab.z) > slab.hz + 1.5) continue;
        if (JUMP_RECOVERY.top > y - 0.3 && JUMP_RECOVERY.top - 1.2 < y + 4.2) railConflicts++;
      }
    }
  }
  assertion(railConflicts === 0, `recovery slab/rail corridor conflicts: ${railConflicts}`);
  {
    const N1: [Line, number, number][] = [[N, 30, N.len]];
    const st1 = flood([]);
    const st2 = flood(N1);
    section('first-path', '\nAbilities: the first path is open, before the second jump');
    let got = padsReachable(st2, { jump: false, hook: false, glide: false }, N1);
    must(got, DEVICES.jump.pad, 'the first device, walking off the new deck');
    for (const p of JUMP_COURSE.slice(1)) mustNot(got, p.id, 'the course needs the air jump, even at sprint speed');
    mustNot(got, 'apron', "gate 1's ledge needs two jumps");
    mustNot(got, 'lookout', "the lookout's secret needs the second jump");
    mustNot(got, 'p2', 'the second device: its line is not there yet, and it needs two jumps');
    mustNot(
      padsReachable(st1, { jump: false, hook: false, glide: false }, []),
      DEVICES.jump.pad,
      'and before the path, the first device',
      'start',
    );

    section('second-jump', '\nWith the second jump, before line 2 crosses the stem');
    got = padsReachable(st2, { jump: true, hook: false, glide: false }, N1);
    for (const p of JUMP_COURSE.slice(1)) must(got, p.id, 'the sprint double-jump course');
    must(got, 'lookout', 'the lookout shelf');
    must(got, 'apron', "gate 1's ledge");
    mustNot(got, 'p2', 'the second device, until the line reaches it');
    mustNot(got, 'summit', 'the top of the tower');

    const E2: [Line, number, number][] = [
      [N, 30, N.len],
      [E, 0, 122],
    ];
    const st3 = flood(E2);
    section('stem-line-second-jump', '\nLine 2 over the stem, second jump, no hook yet');
    got = padsReachable(st3, { jump: true, hook: false, glide: false }, E2);
    must(got, 'p2', 'the second device, from the deck with two jumps');
    mustNot(got, 't1', 'the first high slab: only the hook gets you up');
    // The hook secrets (production's finds, place-retirement F2): each waits for the hook.
    for (const id of ['t0', 'nook', 'loft'])
      mustNot(got, id, `${id === 't0' ? "firstpull's" : `the ${id}'s`} secret needs the hook`);
    accepted(got, 'alcove', 'drop from the plateau');
    for (const id of ['balcony', 'stack']) mustNot(got, id, `the ${id}'s secret needs the glider`);
    mustNot(got, 'summit', 'the top');
    // Route v2's hook walk (solid from Q2, line2Routes) climbs to p2's top, so one jump is enough: walk up it. The
    // model stood only on decks and ground until generic-lines step 2's review, so this read "one jump is not enough".
    must(
      padsReachable(st3, { jump: false, hook: false, glide: false }, E2),
      'p2',
      'the second pillar, up the hook walk',
    );

    section('hook', '\nWith the hook');
    got = padsReachable(st3, { jump: true, hook: true, glide: false }, E2);
    for (const id of ['t0', 't1', 't2', 't3', 't4', 't5', 'summit', 'nook', 'alcove', 'loft'])
      must(got, id, 'a ring in range from where you can stand');
    mustNot(got, 'balcony', 'the balcony needs the glider');
    mustNot(got, 'stack', 'the sea stack needs the glider');

    const E3: [Line, number, number][] = [
      [N, 30, N.len],
      [E, 0, 546],
    ];
    const st4 = flood(E3);
    section('hook-far-head', '\nThe line to Far Head with the hook, no glider: the glide secrets still wait');
    got = padsReachable(st4, { jump: true, hook: true, glide: false }, E3);
    mustNot(got, 'balcony', "the balcony's secret needs the glider");
    accepted(got, 'stack', 'drop from stack-return');
    section('glide', '\nWith the glider, and the line to Far Head');
    got = padsReachable(st4, { jump: true, hook: true, glide: true }, E3);
    for (const id of ['balcony', 'stack']) must(got, id, 'by air');

    section('summit-glide', '\nFrom the summit, by glide (budget: (drop - 2) x ratio x 0.8, less entry)');
    const top = padById('summit');
    const tp = (name: string, x: number, z: number, y: number) => {
      const d = Math.hypot(x - top.x, z - top.z);
      const b = GLIDE(top.top - y);
      const ok = d <= b;
      assertion(ok, `${name}: ${d.toFixed(0)} m away, budget ${b.toFixed(0)} m`);
    };
    const seaGate = GATES.sea;
    tp('the sea gate, the frame beside it', seaGate.x, seaGate.z, seaGate.y);
    tp('home, the village', -100, 14, 18);
    tp('the balcony', padById('balcony').x, padById('balcony').z, padById('balcony').top);
    const head = Math.hypot(HEAD.x - top.x, HEAD.z - top.z),
      bud = GLIDE(top.top - HEAD.y);
    assertion(
      head > bud,
      `Far Head can't be flown to from the tower: ${head.toFixed(0)} m, budget ${bud.toFixed(0)} m`,
    );

    section(
      'second-jump-ground',
      '\nWhat the second jump does to the walking flood: new ground from a 3 m hop up a wall',
    );
    const hopped = new Uint8Array(st2);
    const q2: number[] = [];
    for (let c = 0; c < hopped.length; c++) if (hopped[c]) q2.push(c);
    let extra = 0;
    while (q2.length) {
      const c = q2.pop()!,
        i = c % NX,
        j = Math.floor(c / NX),
        h = heights[cellAt(i, j)]!;
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const a = i + di,
          b = j + dj;
        if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
        const n = k(a, b);
        if (hopped[n]) continue;
        const g = heights[cellAt(a, b)]!;
        if (g < WATER || g - h > TWO_JUMPS) continue;
        hopped[n] = 1;
        q2.push(n);
        extra++;
      }
    }
    const namedBits = [
      ['the first device pillar', DEVICES.jump.x, DEVICES.jump.z],
      ['the second pillar', DEVICES.hook.x, DEVICES.hook.z],
      ['gate 1 lever', LEVER.x, LEVER.z],
      ['Far Head', HEAD.x, HEAD.z],
    ] as const;
    fact(
      `  ${extra} more cells (${((extra * CELL * CELL) / 1000).toFixed(1)}k m²), mostly hopping up gorge walls and shores:`,
    );
    for (const [n, x, z] of namedBits) fact(`    ${n}: ${can(hopped, x, z) ? 'under it, or by it' : 'no'}`);
    fact(`  (${SECRETS.length} secrets, ${PADS.length} pads.)`);
  }

  section('layout', '\nRail grades: the steepest cell on each line');
  for (const [name, l] of Object.entries(LINES)) {
    let most = 0;
    for (let s = 1; s < l.len; s++) most = Math.max(most, Math.abs(railY(l, s) - railY(l, s - 1)));
    fact(`  ${name}: ${(most * 100).toFixed(1)}%`);
  }

  section('layout', '\nWalks, in metres and seconds at 5.6 m/s');
  const pathLen = (p: number[][]) =>
    p.reduce((a, q, n) => (n ? a + Math.hypot(q[0]! - p[n - 1]![0]!, q[1]! - p[n - 1]![1]!) : 0), 0);
  const long = pathLen(PATHS[0]!.pts);
  const row = (name: string, m: number) => fact(`  ${name}: ${m.toFixed(0)} m, ${(m / 5.6).toFixed(0)} s`);
  row('village to the machine, the long way', long);
  row('village to the machine, the new way', 191);
  row('village to Far Head along line 2', quarry.stations[4]!.to);
  fact(
    `  (${PATH_SAMPLES.length} paths; ${BUOYS.n} buoys; origin ${ORIGIN.x}; land at Far Head ${H(HEAD.x + ORIGIN.x, HEAD.z).toFixed(1)} m)`,
  );
  const failures = entries.filter((entry) => entry.kind === 'assertion' && !entry.passed).length;
  return { level: 'place', states: [...new Set(entries.map((entry) => entry.state))], entries, failures };
}

export function printPlaceLevelCheck(report: ReturnType<typeof runPlaceLevelCheck>) {
  for (const entry of report.entries)
    console.log(entry.kind === 'assertion' ? `${entry.passed ? '  ok  ' : ' FAIL '} ${entry.message}` : entry.message);
  console.log(
    report.failures
      ? `\n${report.failures} problem(s).`
      : '\nAll progression assertions passed (approximate reachability).',
  );
}

// Keep the old direct command as an alias for callers; the default check chain uses dev/level/check.ts.
if (import.meta.main) {
  const report = runPlaceLevelCheck();
  printPlaceLevelCheck(report);
  process.exitCode = report.failures ? 1 : 0;
}
