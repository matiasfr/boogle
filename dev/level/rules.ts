// What breaks a level for a player, as a designer would catch it in an editor. Each issue says where and what to do about
// it. This catches what's broken; what a good level aims for is docs/research/level-design.md.
import { collidersOf, footprintOf } from '../../src/blueprints/blueprint.ts';
import { isHomePalm, PROP_BLUEPRINTS, tileKey } from '../../src/blueprints/props.ts';
import { CELL, GRID_RES, PLAYER_R, SEA, SOFT_WALL } from '../../src/constants.ts';
import { segDist, siteFrame } from '../../src/island/stamps.ts';
import { WAGON_MAX_GRADE } from '../../src/sim/wagon.ts';
import { flood, standable, type Grid } from './flood.ts';
import { MOVER } from './mover.ts';
export { MOVER } from './mover.ts';
import { nodeOf, nodeX, nodeZ, siteFile, type Level } from './level.ts';

export type Issue = {
  rule: string;
  id: string; // what the allow-list matches: names and rounded coordinates, no prose
  file: string;
  x: number;
  z: number;
  message: string; // what's wrong
  fix: string; // what to do
};

const TRACK_HALF = 1; // m each side the wagon needs: its deck is 0.8 (src/entities/railway/track-machine.ts)
const GRADE_RUN = 2.5; // m: grades are measured over about the wagon's length, so one bump in the ground doesn't count
const PLAYER_HEIGHT = 1.7; // m: what's higher up than this over the ground, you walk under
const UNREACHED_AREA = 60; // m²: smaller scraps of land nobody can reach don't matter
// A quarter or so above classic (234 objects, 846 spheres, 46 bodies). Props only: POIs build colliders as they draw.
const BUDGET = { placed: 300, spheres: 1100, bodies: 60 };

const f1 = (v: number) => v.toFixed(1);
const at = (x: number, z: number) => `(${f1(x)}, ${f1(z)})`;

/** Nodes where a collider, too tall to jump onto, keeps the player's body out. */
function blockedNodes(level: Level) {
  const blocked = new Uint8Array(GRID_RES * GRID_RES);
  for (const p of level.placements) {
    const spheres = collidersOf(PROP_BLUEPRINTS[p.blueprint], p);
    if (Math.max(...spheres.map((s) => s.y + s.r)) - p.h <= MOVER.jumpHeight) continue;
    for (const s of spheres) {
      if (s.y - s.r > level.groundAt(s.x, s.z) + PLAYER_HEIGHT) continue;
      const r = s.r + PLAYER_R;
      const k0 = nodeOf(s.x, s.z);
      const i0 = Math.floor(k0 / GRID_RES),
        j0 = k0 % GRID_RES,
        span = Math.ceil(r / CELL);
      for (let i = i0 - span; i <= i0 + span; i++)
        for (let j = j0 - span; j <= j0 + span; j++) {
          const k = i * GRID_RES + j;
          if (Math.hypot(nodeX(k) - s.x, nodeZ(k) - s.z) < r) blocked[k] = 1;
        }
    }
  }
  return blocked;
}

/** A node and its neighbours: a point is reached when the ground beside it is, whatever stands right on it. */
const around = (k: number) => {
  const out = [];
  for (const di of [-1, 0, 1]) for (const dj of [-1, 0, 1]) out.push(k + di * GRID_RES + dj);
  return out.filter((q) => q >= 0 && q < GRID_RES * GRID_RES);
};

function reachability(level: Level, out: Issue[]) {
  const grid: Grid = { n: GRID_RES, cell: CELL, h: level.h };
  const blocked = blockedNodes(level);
  const starts = [level.spawnNode];
  const onFoot = flood(grid, MOVER, starts, { blocked });
  const swimming = flood(grid, MOVER, starts, { blocked, swim: true });
  const back = flood(grid, MOVER, starts, { blocked, swim: true, reverse: true });

  const CLIMB = `The player climbs a slope up to ${MOVER.walkSlope.toFixed(2)} and jumps ${MOVER.jumpHeight.toFixed(1)} m`;
  const nearestReached = (k0: number) => {
    let best = -1,
      bestD = Infinity;
    for (let k = 0; k < onFoot.length; k++) {
      if (!onFoot[k]) continue;
      const d = Math.hypot(nodeX(k) - nodeX(k0), nodeZ(k) - nodeZ(k0));
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    return { best, bestD };
  };
  for (const t of level.targets) {
    const near = around(nodeOf(t.x, t.z));
    const id = `${t.name} ${at(t.x, t.z)}`;
    if (near.some((k) => onFoot[k])) {
      if (near.some((k) => back[k])) continue;
      out.push({
        rule: 'one-way',
        id,
        file: t.file,
        x: t.x,
        z: t.z,
        message: `${t.name} can be reached, but there's no way back out.`,
        fix: `${CLIMB}: cut a ramp out with a 'path' stamp (set: 'path'), or move it.`,
      });
      continue;
    }
    const { best, bestD } = nearestReached(nodeOf(t.x, t.z));
    const where = `Nearest ground reached on foot: ${at(nodeX(best), nodeZ(best))}, ${f1(bestD)} m away, at ${f1(level.h[best]!)} m; it stands at ${f1(level.groundAt(t.x, t.z))} m.`;
    const swims = near.some((k) => swimming[k]);
    out.push({
      rule: swims ? 'swim-only' : 'unreachable',
      id,
      file: t.file,
      x: t.x,
      z: t.z,
      message: `${t.name} can't be reached on foot${swims ? ', only by swimming' : ', not even by swimming'}. ${where}`,
      fix: swims
        ? 'Join it to the land (a causeway stamp, or move it onto land), or mark the swim as meant in dev/level/allow.ts.'
        : `${CLIMB}: grade the way up with a 'path' stamp (set: 'path'), or move it.`,
    });
  }

  // Land nobody can stand on is scenery. Land you could stand on that nothing reaches is a place you can see but never visit.
  const stand = standable(grid, MOVER);
  const done = new Uint8Array(GRID_RES * GRID_RES);
  const cutOff = (k: number) => !done[k] && !swimming[k] && !blocked[k] && stand[k] && level.h[k]! > SEA;
  for (let k0 = 0; k0 < done.length; k0++) {
    if (!cutOff(k0)) continue;
    const stack = [k0];
    done[k0] = 1;
    let n = 0,
      sx = 0,
      sz = 0;
    while (stack.length) {
      const k = stack.pop()!;
      n++;
      sx += nodeX(k);
      sz += nodeZ(k);
      for (const q of [k + GRID_RES, k - GRID_RES, k + 1, k - 1]) {
        if (q < 0 || q >= done.length || !cutOff(q)) continue;
        done[q] = 1;
        stack.push(q);
      }
    }
    const area = n * CELL * CELL;
    if (area < UNREACHED_AREA) continue;
    const x = sx / n,
      z = sz / n;
    out.push({
      rule: 'unreached-land',
      id: `land ${at(x, z)}`,
      file: level.layoutFile ?? 'src/island/shape.ts',
      x,
      z,
      message: `${Math.round(area)} m² of walkable land around here is cut off: nothing gets to it from spawn.`,
      fix: `Grade a way in with a 'path' stamp (set: 'path'), or stamp the ground so it isn't standable.`,
    });
  }
}

function overlaps(level: Level, out: Issue[]) {
  const { discs, placements, route, routeFile } = level;
  // What POIs and the home places claim, against each other.
  for (let a = 0; a < discs.length; a++)
    for (let b = a + 1; b < discs.length; b++) {
      const p = discs[a]!,
        q = discs[b]!;
      if (p.owner === q.owner) continue;
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d >= p.r + q.r) continue;
      out.push({
        rule: 'overlap',
        id: `${p.name} x ${q.name}`,
        file: q.file,
        x: q.x,
        z: q.z,
        message: `${p.name} (r ${p.r}) and ${q.name} (r ${q.r}) overlap by ${f1(p.r + q.r - d)} m.`,
        fix: `Move one in ${q.file}, or shrink a keepOut disc that claims more than it uses.`,
      });
    }
  // Props against each other and against what's claimed. A bucket grid keeps this quick: nothing is wider than 4 m.
  const BUCKET = 8;
  const buckets = new Map<number, number[]>();
  const key = (x: number, z: number) => Math.floor(x / BUCKET) * 4096 + Math.floor(z / BUCKET);
  placements.forEach((p, k) => {
    const bp = PROP_BLUEPRINTS[p.blueprint];
    const r = footprintOf(bp, p);
    const bx = Math.floor(p.x / BUCKET),
      bz = Math.floor(p.z / BUCKET);
    for (let a = bx - 1; a <= bx + 1; a++)
      for (let b = bz - 1; b <= bz + 1; b++)
        for (const o of buckets.get(a * 4096 + b) ?? []) {
          const q = placements[o]!;
          const rq = footprintOf(PROP_BLUEPRINTS[q.blueprint], q);
          if (Math.hypot(p.x - q.x, p.z - q.z) >= r + rq) continue;
          out.push({
            rule: 'overlap',
            id: `${q.blueprint} ${at(q.x, q.z)} x ${p.blueprint} ${at(p.x, p.z)}`,
            file: 'src/blueprints/props.ts',
            x: p.x,
            z: p.z,
            message: `A ${q.blueprint} at ${at(q.x, q.z)} and a ${p.blueprint} at ${at(p.x, p.z)} stand in each other.`,
            fix: `Space them in the scatter or the placements of src/blueprints/props.ts.`,
          });
        }
    const k0 = key(p.x, p.z);
    if (!buckets.has(k0)) buckets.set(k0, []);
    buckets.get(k0)!.push(k);
    for (const d of discs) {
      if (Math.hypot(p.x - d.x, p.z - d.z) >= r + d.r) continue;
      out.push({
        rule: 'overlap',
        id: `${p.blueprint} ${at(p.x, p.z)} x ${d.name}`,
        file: 'src/blueprints/props.ts',
        x: p.x,
        z: p.z,
        message: `A ${p.blueprint} at ${at(p.x, p.z)} stands on the ground ${d.name} keeps clear.`,
        fix: `Keep it out with keptOut in the scatter, or shrink ${d.name}'s disc in ${d.file}.`,
      });
    }
  });
  // The line, against what stands in its way.
  route.forEach((sec, s) => {
    const seg = (x: number, z: number) => segDist(x, z, sec.x, sec.z, sec.to[0]!, sec.to[1]!).d;
    for (const d of discs)
      if (seg(d.x, d.z) < d.r + TRACK_HALF)
        out.push({
          rule: 'overlap',
          id: `section ${s + 1} x ${d.name}`,
          file: routeFile,
          x: d.x,
          z: d.z,
          message: `Track section ${s + 1} runs through ${d.name} (centre ${at(d.x, d.z)}, r ${d.r}).`,
          fix: `Route the line around it, ${f1(d.r + TRACK_HALF)} m from its centre at least.`,
        });
    for (const p of placements) {
      const r = footprintOf(PROP_BLUEPRINTS[p.blueprint], p);
      if (seg(p.x, p.z) >= r + TRACK_HALF) continue;
      out.push({
        rule: 'overlap',
        id: `section ${s + 1} x ${p.blueprint} ${at(p.x, p.z)}`,
        file: routeFile,
        x: p.x,
        z: p.z,
        message: `A ${p.blueprint} at ${at(p.x, p.z)} stands on track section ${s + 1}.`,
        fix: `Move the line, or leave the prop out in a layout ("clear": { "line": 4.5 }; home palms stay).`,
      });
    }
  });
}

/** The steepest rise over `run` metres along a line, and where. */
function worstGrade(level: Level, a: number[], b: number[], run: number) {
  const len = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
  let worst = 0,
    wx = a[0]!,
    wz = a[1]!;
  const n = Math.max(1, Math.ceil(len / CELL));
  const dx = (b[0]! - a[0]!) / len,
    dz = (b[1]! - a[1]!) / len;
  for (let k = 0; k <= n; k++) {
    const d = (k / n) * len,
      x = a[0]! + dx * d,
      z = a[1]! + dz * d;
    const e = Math.min(len, d + run);
    if (e <= d) continue;
    const grade = Math.abs(level.groundAt(a[0]! + dx * e, a[1]! + dz * e) - level.groundAt(x, z)) / (e - d);
    if (grade > worst) {
      worst = grade;
      wx = x;
      wz = z;
    }
  }
  return { grade: worst, x: wx, z: wz };
}

function slopes(level: Level, out: Issue[]) {
  level.route.forEach((sec, s) => {
    const { grade, x, z } = worstGrade(level, [sec.x, sec.z], sec.to, GRADE_RUN);
    if (Math.round(grade * 100) / 100 <= WAGON_MAX_GRADE) return;
    out.push({
      rule: 'grade',
      id: `section ${s + 1}`,
      file: level.routeFile,
      x,
      z,
      message: `Track section ${s + 1} climbs at ${grade.toFixed(2)} here; the wagon takes ${WAGON_MAX_GRADE} (WAGON_MAX_GRADE, src/sim/wagon.ts).`,
      fix: `Run it round the hill or lengthen the climb, or grade it with a 'path' stamp along the line (set: 'path').`,
    });
  });
  for (const site of level.sites) {
    const frame = siteFrame(site);
    (site.stamps ?? []).forEach((st, k) => {
      if (st.shape !== 'path' || !st.paint || !st.points) return; // a path is what's painted; the rest is shaping
      for (let p = 0; p + 1 < st.points.length; p++) {
        const a = frame.toWorld(st.points[p]![0]!, st.points[p]![1]!),
          b = frame.toWorld(st.points[p + 1]![0]!, st.points[p + 1]![1]!);
        const { grade, x, z } = worstGrade(level, a, b, GRADE_RUN);
        if (grade <= MOVER.walkSlope) continue;
        out.push({
          rule: 'grade',
          id: `${site.name} path ${k}`,
          file: level.discs.find((d) => d.owner === site.id)?.file ?? siteFile(site.id),
          x,
          z,
          message: `A path of ${site.name} climbs at ${grade.toFixed(2)} here; the player takes ${MOVER.walkSlope.toFixed(2)}.`,
          fix: `Add a height to the path's points with set: 'path', so it ramps instead of following the ground.`,
        });
      }
    });
  }
  const stand = standable({ n: GRID_RES, cell: CELL, h: level.h }, MOVER);
  for (const t of level.targets) {
    if (around(nodeOf(t.x, t.z)).some((k) => stand[k])) continue;
    out.push({
      rule: 'steep-ground',
      id: `${t.name} ${at(t.x, t.z)}`,
      file: t.file,
      x: t.x,
      z: t.z,
      message: `${t.name} stands on ground too steep to stand on.`,
      fix: `Flatten it with a 'disc' stamp (set: 'ground'), or move it.`,
    });
  }
}

function boundsAndWater(level: Level, out: Issue[]) {
  const outside = (x: number, z: number) => Math.abs(x) > SOFT_WALL || Math.abs(z) > SOFT_WALL;
  const report = (id: string, what: string, file: string, x: number, z: number, prop = false, wetOk = false) => {
    if (outside(x, z))
      out.push({
        rule: 'bounds',
        id,
        file,
        x,
        z,
        message: `${what} is past the edge of the world: the soft wall turns the player back at ${SOFT_WALL} m.`,
        fix: `Bring it inside ±${SOFT_WALL} m.`,
      });
    else if (!wetOk && level.groundAt(x, z) < SEA)
      out.push({
        rule: 'water',
        id,
        file,
        x,
        z,
        message: `${what} is under the sea: the ground there is at ${f1(level.groundAt(x, z))} m.`,
        fix: prop
          ? `Keep it out of the sea in the scatter, or mark its blueprint wet: true if it belongs there.`
          : `Raise the ground with a stamp, or move it.`,
      });
  };
  for (const t of level.targets) report(`${t.name} ${at(t.x, t.z)}`, t.name, t.file, t.x, t.z);
  for (const p of level.placements)
    report(
      `${p.blueprint} ${at(p.x, p.z)}`,
      `A ${p.blueprint}`,
      'src/blueprints/props.ts',
      p.x,
      p.z,
      true,
      PROP_BLUEPRINTS[p.blueprint].wet,
    );
  level.route.forEach((sec, s) => {
    const len = Math.hypot(sec.to[0]! - sec.x, sec.to[1]! - sec.z);
    const n = Math.max(1, Math.ceil(len / CELL));
    for (let k = 0; k <= n; k++) {
      const x = sec.x + ((sec.to[0]! - sec.x) * k) / n,
        z = sec.z + ((sec.to[1]! - sec.z) * k) / n;
      if (!outside(x, z) && level.groundAt(x, z) >= SEA) continue;
      report(`section ${s + 1}`, `Track section ${s + 1} at ${at(x, z)}`, level.routeFile, x, z);
      break;
    }
  });
}

export function checkLevel(level: Level): Issue[] {
  const out: Issue[] = [];
  reachability(level, out);
  overlaps(level, out);
  slopes(level, out);
  boundsAndWater(level, out);
  return out;
}

/** Budgets report and never fail, for now: home palms take a body each and the rest merge into a body per 64 m tile. */
export function budgets(level: Level) {
  let spheres = 0;
  const tiles = new Set<number>();
  let palms = 0;
  for (const p of level.placements) {
    spheres += collidersOf(PROP_BLUEPRINTS[p.blueprint], p).length;
    if (isHomePalm(p)) palms++;
    else tiles.add(tileKey(p.x, p.z));
  }
  const counts = { placed: level.placements.length, spheres, bodies: palms + tiles.size };
  const over = (Object.keys(BUDGET) as (keyof typeof BUDGET)[]).filter((k) => counts[k] > BUDGET[k]);
  return { counts, budget: BUDGET, over };
}
