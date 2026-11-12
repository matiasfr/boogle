// level-check's "Track continuity" report (docs/plans/rail-map.md, "Continuity and curves"; owner, 10 November: "Tracks
// should also not have glitchy looking discontinuities, we should make sure the curves look reasonable"). Every track of
// the network as the game draws and runs it (./rail-network.ts): kinks, curvature, chord spacing, grades, the up
// track's lateral easing and the joins between separately defined pieces.
//
// Why these thresholds. A car is a rigid box on the line, posed from the chord between two points 1.1 m either side of
// its centre (src/entities/railway/car.ts poseCarOnLine); cars are 3.2 m long and 2.2 m wide on a 3.7 m pitch, so 0.5 m
// apart. On a polyline whose chords are longer than that 2.2 m window, each vertex turns every car by its whole heading
// change while it rolls 2.2 m: 0.11 s at 20 m/s.
//   KINK_SOFT 2°   a car's end (1.6 m from its centre) swings 5.6 cm sideways within about 7 frames at 20 m/s while the
//                  car behind hasn't turned yet: the twitch that reads as a snap between an engine and its car. Below
//                  it the swing is inside a rail head's width.
//   KINK_HARD 25°  two cars either side of the vertex, hinged mid-gap, touch inner corners when tan(θ/2) = 0.25/1.1:
//                  θ ≈ 25.6°. Past it the train visibly folds into itself: a broken track, not a rough one.
//   RADIUS 40 m    the catalog's loop radius, the tightest curve any plan accepts (FORMATION.loopCm).
//   EASE           a curve entered from a straight with no transition: curvature jumping from under 1/400 (a straight)
//                  to over 1/100 (a curve tighter than 100 m) within 10 m.
//   GRADE 4%       the ruling grade (world-blockout, 10 November) for future corridors; live lines' ramps are reported.
//   BREAK 2%       a change of grade over 5 m with no vertical curve pitches a 2.2 m-chord car by about 1.1° in 0.1 s.
//   FOUL 2.3 m     two tracks' centres closer than a car's width (2.2 m) plus 10 cm: the fouling point of a turnout.
// Only gross errors fail, and only on track a train is drawn on today (live and v26): a gap (a chord over 3x the
// spacing), a reversed or zero chord, a kink over KINK_HARD. Planned (v27) and tentative tracks report the same
// measures; their would-be failures are listed as "planned, would fail" and do not fail the check, because no train
// runs there yet and their data is a greybox draft (they become enforced as each line moves into RAIL_LINES).
import { LIVE, beside, deg, joins, tracks, wrap, type Join, type Pt, type Track } from './rail-network.ts';
import { HALTS, UP_HALTS, crossLat, upLat } from '../../src/place/layout.ts';

/** A car's half width and a platform's (src/entities/railway/halts-view.ts: 2.5 m decks). */
const CAR_HX = 1.1,
  PLATFORM_HX = 1.25;
/** The up track's turnouts and Far Head's crossover: how steeply each leaves today's track and its tightest radius
 * (3-point, 2 m arms, 0.5 m steps), so the eased lateral shift's ends are measured, not assumed. */
function turnouts() {
  const out: { line: string; what: string; s0: number; s1: number; diverge: number; minRadius: number; at: number }[] =
    [];
  for (const L of LIVE) {
    const zones: [string, number, number, (s: number) => number | null][] = [
      [`stub turnout at s ${L.f.from}`, L.f.from, L.f.from + 20, (s) => upLat(L.f, s)],
      [`stub turnout at s ${L.f.to}`, L.f.to - 20, L.f.to, (s) => upLat(L.f, s)],
    ];
    const c = 'crossover' in L.f ? L.f.crossover : undefined;
    if (c) zones.push([`crossover s ${c[0]}-${c[1]}`, c[0], c[1], (s) => crossLat(L.f, s)]);
    for (const [what, s0, s1, lat] of zones) {
      let diverge = 0,
        minRadius = Infinity,
        at = s0;
      for (let s = s0 - 2; s <= s1 + 2; s += 0.5) {
        const l = (x: number) => lat(Math.max(s0, Math.min(s1, x))) ?? 0;
        const a = beside(L.line, s - 2, l(s - 2)),
          b = beside(L.line, s, l(s)),
          d = beside(L.line, s + 2, l(s + 2));
        const t0 = beside(L.line, s - 0.25, 0),
          t1 = beside(L.line, s + 0.25, 0);
        const u0 = beside(L.line, s - 0.25, l(s - 0.25)),
          u1 = beside(L.line, s + 0.25, l(s + 0.25));
        diverge = Math.max(
          diverge,
          Math.abs(deg(wrap(Math.atan2(u1.x - u0.x, u1.z - u0.z) - Math.atan2(t1.x - t0.x, t1.z - t0.z)))),
        );
        const ab = Math.hypot(b.x - a.x, b.z - a.z),
          bc = Math.hypot(d.x - b.x, d.z - b.z),
          ca = Math.hypot(a.x - d.x, a.z - d.z);
        const cr = Math.abs((b.x - a.x) * (d.z - a.z) - (b.z - a.z) * (d.x - a.x));
        const R = cr < 1e-9 ? Infinity : (ab * bc * ca) / (2 * cr);
        if (R < minRadius) {
          minRadius = R;
          at = s;
        }
      }
      out.push({ line: L.id, what, s0, s1, diverge, minRadius, at });
    }
  }
  return out;
}
/** Every live platform against both tracks: the gap between a car's side and the platform's edge (negative: the car
 * runs into it), the closest along the platform. */
function platforms() {
  const out: { name: string; track: string; clearance: number; at: number }[] = [];
  const all = [...HALTS.map((h) => ({ ...h, up: false })), ...UP_HALTS.map((h) => ({ ...h, up: true }))];
  for (const h of all) {
    const L = LIVE[h.line]!;
    for (const track of ['down', 'up'] as const) {
      let best = { c: Infinity, s: h.s0 };
      for (let s = h.s0; s <= h.s1; s += 0.5) {
        const tl = track === 'down' ? 0 : upLat(L.f, s);
        if (tl === null) continue;
        const c = Math.abs(h.lat - tl) - PLATFORM_HX - CAR_HX;
        if (c < best.c) best = { c, s };
      }
      if (best.c !== Infinity) out.push({ name: h.name, track: `${L.id} ${track}`, clearance: best.c, at: best.s });
    }
  }
  return out;
}

export const LIMITS = {
  kinkSoft: 2,
  kinkHard: 25,
  radius: 40,
  easeStraight: 400,
  easeCurve: 100,
  grade: 4,
  gradeBreak: 2,
  foul: 2.3,
  window: 2.2,
} as const;

export type Finding = {
  track: string;
  status: Track['status'];
  kind: 'kink' | 'radius' | 'ease' | 'chord' | 'grade' | 'break' | 'gap' | 'reversed' | 'join' | 'foul';
  s: number;
  x: number;
  z: number;
  value: number;
  /** value / its threshold: the ranking key. */
  severity: number;
  gross: boolean;
  /** A gross error on planned or tentative track: reported, not failed. */
  planned?: boolean;
  text: string;
};
export type TrackRow = {
  id: string;
  label: string;
  status: Track['status'];
  pose: Track['pose'];
  length: number;
  joints: number;
  maxKink: number;
  maxKinkAt: number;
  kinksOver: number;
  minRadius: number;
  minRadiusAt: number;
  under40: number;
  eases: number;
  chordMin: number;
  chordMax: number;
  chordOff: number;
  maxGrade: number;
  maxGradeAt: number;
  over4: number;
  maxBreak: number;
  breaks: number;
  gross: number;
};

const head = (a: Pt, b: Pt) => Math.atan2(b.x - a.x, b.z - a.z);
/** Resample a track every `step` m along its plan length (linear between its points). */
function resample(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  let acc = 0;
  const along = [0];
  for (let i = 1; i < pts.length; i++)
    along.push((acc += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.z - pts[i - 1]!.z)));
  let k = 1;
  for (let d = 0; d <= acc + 1e-6; d += step) {
    while (k < pts.length - 1 && along[k]! < d) k++;
    const a = pts[k - 1]!,
      b = pts[k]!,
      t = (d - along[k - 1]!) / Math.max(1e-9, along[k]! - along[k - 1]!);
    out.push({
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      y: a.y + (b.y - a.y) * t,
      s: a.s + (b.s - a.s) * t,
    });
  }
  return out;
}
/** Radius of the circle through three points (Infinity on a straight). */
function circumradius(a: Pt, b: Pt, c: Pt) {
  const ab = Math.hypot(b.x - a.x, b.z - a.z),
    bc = Math.hypot(c.x - b.x, c.z - b.z),
    ca = Math.hypot(a.x - c.x, a.z - c.z);
  const cross = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));
  return cross < 1e-9 ? Infinity : (ab * bc * ca) / (2 * cross);
}

export function measure(t: Track): { row: TrackRow; findings: Finding[] } {
  const f: Finding[] = [];
  const add = (kind: Finding['kind'], p: Pt, value: number, threshold: number, gross: boolean, text: string) =>
    f.push({
      track: t.id,
      status: t.status,
      kind,
      s: p.s,
      x: p.x,
      z: p.z,
      value,
      severity: value / threshold,
      gross,
      text,
    });
  const pts = t.pts;
  const row: TrackRow = {
    id: t.id,
    label: t.label,
    status: t.status,
    pose: t.pose,
    length: 0,
    joints: Math.max(0, pts.length - 2),
    maxKink: 0,
    maxKinkAt: 0,
    kinksOver: 0,
    minRadius: Infinity,
    minRadiusAt: 0,
    under40: 0,
    eases: 0,
    chordMin: Infinity,
    chordMax: 0,
    chordOff: 0,
    maxGrade: 0,
    maxGradeAt: 0,
    over4: 0,
    maxBreak: 0,
    breaks: 0,
    gross: 0,
  };
  // Chords: length, gaps, reversals.
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!,
      b = pts[i]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    row.length += len;
    row.chordMin = Math.min(row.chordMin, len);
    row.chordMax = Math.max(row.chordMax, len);
    if (len < 1e-3) add('reversed', b, 1, 1, true, 'a zero-length chord (a repeated point)');
    else if (t.nominal && len > 3 * t.nominal)
      add('gap', b, len, 3 * t.nominal, true, `a ${len.toFixed(2)} m chord on ${t.nominal} m spacing: a gap`);
    else if (t.nominal && Math.abs(len - t.nominal) > 0.1 * t.nominal && i < pts.length - 1) {
      row.chordOff++;
      add(
        'chord',
        b,
        Math.abs(len - t.nominal) / t.nominal,
        0.1,
        false,
        `chord ${len.toFixed(2)} m against ${t.nominal} m`,
      );
    }
    // Grade per chord (live lines' y is Place's railY; future lines' the catalog's deck).
    if (len > 0.2) {
      const g = (100 * Math.abs(b.y - a.y)) / len;
      if (g > row.maxGrade) {
        row.maxGrade = g;
        row.maxGradeAt = b.s;
      }
      if (g > LIMITS.grade + 0.05) row.over4 += len;
    }
  }
  // Joints: heading change; a turn of more than 150° is a reversed chord.
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]!,
      b = pts[i]!,
      c = pts[i + 1]!;
    if (Math.hypot(b.x - a.x, b.z - a.z) < 1e-3 || Math.hypot(c.x - b.x, c.z - b.z) < 1e-3) continue;
    const d = Math.abs(deg(wrap(head(b, c) - head(a, b))));
    // On dense samples a car's 2.2 m window spans several joints: the visible snap is the joint's turn beyond its
    // neighbours' (the curve's own steady turn is the radius check's business).
    const dense = Math.hypot(c.x - b.x, c.z - b.z) < LIMITS.window && Math.hypot(b.x - a.x, b.z - a.z) < LIMITS.window;
    let k = d;
    if (dense) {
      const n: number[] = [];
      for (const j of [i - 2, i - 1, i + 1, i + 2])
        if (j >= 1 && j < pts.length - 1)
          n.push(Math.abs(deg(wrap(head(pts[j]!, pts[j + 1]!) - head(pts[j - 1]!, pts[j]!)))));
      k = Math.max(0, d - Math.max(...n, 0));
    }
    if (k > row.maxKink) {
      row.maxKink = k;
      row.maxKinkAt = b.s;
    }
    if (d > 150) add('reversed', b, d, 150, true, `the line turns back on itself (${d.toFixed(0)}°)`);
    else if (k > LIMITS.kinkSoft) {
      row.kinksOver++;
      add(
        'kink',
        b,
        k,
        LIMITS.kinkSoft,
        k > LIMITS.kinkHard,
        `${k.toFixed(1)}° kink${dense ? ' (beyond its neighbours)' : ''}`,
      );
    }
  }
  // Curvature and grade breaks on a 5 m resample (sampling-independent).
  const r = resample(pts, 5);
  const K = r.map((_, i) => (i > 0 && i < r.length - 1 ? 1 / circumradius(r[i - 1]!, r[i]!, r[i + 1]!) : 0));
  let run: Finding | null = null;
  let lastEase = -Infinity;
  for (let i = 1; i < r.length - 1; i++) {
    const R = 1 / K[i]!;
    if (R < row.minRadius) {
      row.minRadius = R;
      row.minRadiusAt = r[i]!.s;
    }
    if (R < LIMITS.radius - 0.5) {
      row.under40++;
      // One finding per run of tight samples, at its tightest point.
      const text = `radius ${R.toFixed(1)} m (under ${LIMITS.radius})`;
      if (run && r[i]!.s - run.s <= 10.01 && f.includes(run)) {
        if (LIMITS.radius / R > run.severity)
          Object.assign(run, { s: r[i]!.s, x: r[i]!.x, z: r[i]!.z, value: R, severity: LIMITS.radius / R, text });
      } else {
        add('radius', r[i]!, LIMITS.radius / R, 1, false, text);
        run = f.at(-1)!;
        run.value = R;
      }
    }
    // A curve entered from a straight with no transition: curvature 10 m back (two samples) against here.
    if (i >= 3) {
      const k0 = K[i - 2]!,
        k1 = K[i]!;
      if (
        Math.min(k0, k1) < 1 / LIMITS.easeStraight &&
        Math.max(k0, k1) > 1 / LIMITS.easeCurve &&
        r[i]!.s - lastEase > 20
      ) {
        lastEase = r[i]!.s;
        row.eases++;
        add(
          'ease',
          r[i]!,
          Math.max(k0, k1) * LIMITS.easeCurve,
          1,
          false,
          `straight into a ${(1 / Math.max(k0, k1)).toFixed(0)} m curve within 10 m, no easing`,
        );
      }
    }
    if (i >= 2) {
      const g0 = (r[i]!.y - r[i - 1]!.y) / 5,
        g1 = (r[i + 1]!.y - r[i]!.y) / 5;
      const br = 100 * Math.abs(g1 - g0);
      if (br > row.maxBreak) row.maxBreak = br;
      if (br > LIMITS.gradeBreak) {
        row.breaks++;
        add(
          'break',
          r[i]!,
          br,
          LIMITS.gradeBreak,
          false,
          `grade ${(100 * g0).toFixed(1)}% to ${(100 * g1).toFixed(1)}% within 5 m (no or too short a vertical curve)`,
        );
      }
    }
  }
  if (row.chordMin === Infinity) row.chordMin = 0;
  row.gross = f.filter((x) => x.gross).length;
  return { row, findings: f };
}

/** Where the up track's centre comes within FOUL of today's (or crosses it): its fouling points. */
function fouling(all: Track[]): Finding[] {
  const out: Finding[] = [];
  for (const up of all.filter((t) => t.kind === 'up' && t.status === 'v26')) {
    const down = all.find((t) => t.id === up.id.replace('-up', '-down'))!;
    let inFoul = false,
      start = 0;
    for (const p of up.pts) {
      const q = down.pts[Math.round(p.s)]!;
      const sep = Math.hypot(p.x - q.x, p.z - q.z);
      if (sep < LIMITS.foul && !inFoul) {
        inFoul = true;
        start = p.s;
      }
      if ((sep >= LIMITS.foul || p === up.pts.at(-1)) && inFoul) {
        inFoul = false;
        out.push({
          track: up.id,
          status: up.status,
          kind: 'foul',
          s: start,
          x: p.x,
          z: p.z,
          value: p.s - start,
          severity: 0,
          gross: false,
          text: `tracks closer than ${LIMITS.foul} m from s ${start} to ${p.s} (a turnout's fouling zone)`,
        });
      }
    }
  }
  return out;
}

export function checkContinuity() {
  const all = tracks();
  const rows: TrackRow[] = [];
  const findings: Finding[] = [];
  for (const t of all) {
    const m = measure(t);
    rows.push(m.row);
    // A planned track's gross errors stay visible but don't fail: no train runs there yet.
    for (const x of m.findings)
      findings.push(
        x.gross && !t.enforce
          ? {
              ...x,
              gross: false,
              planned: true,
              text: `${x.text} (${t.pose === 'none' ? 'never drawn: reported' : 'planned, would fail'})`,
            }
          : x,
      );
  }
  const js: Join[] = joins();
  for (const j of js) {
    const sev = j.severity;
    findings.push({
      track: j.name,
      status: j.status,
      kind: 'join',
      s: 0,
      x: j.x,
      z: j.z,
      value: Math.max(j.gap, j.heading),
      severity: sev,
      gross: false,
      text: `gap ${j.gap.toFixed(2)} m, heading ${j.heading.toFixed(1)}°: ${j.note}`,
    });
  }
  const foul = fouling(all);
  const turns = turnouts();
  for (const t of turns) {
    const L = LIVE.find((l) => l.id === t.line)!;
    const p = beside(L.line, t.at, 0);
    findings.push({
      track: `${t.line}-up`,
      status: 'v26',
      kind: 'radius',
      s: t.at,
      x: p.x,
      z: p.z,
      value: t.minRadius,
      severity: LIMITS.radius / t.minRadius,
      gross: false,
      text: `the ${t.what}'s eased shift: radius ${t.minRadius.toFixed(1)} m, leaving at ${t.diverge.toFixed(1)}° (a 1:8 turnout leaves at 7°)`,
    });
  }
  const clear = platforms();
  for (const p of clear)
    if (p.clearance < 0)
      findings.push({
        track: p.track,
        status: 'v26',
        kind: 'foul',
        s: p.at,
        x: 0,
        z: 0,
        value: -p.clearance,
        severity: 10,
        gross: true,
        text: `${p.name}: a car runs ${(-p.clearance).toFixed(2)} m into the platform`,
      });
  const unique = findings;
  const ranked = unique.filter((x) => x.kind !== 'chord').sort((a, b) => b.severity - a.severity);
  const drawn = new Set(all.filter((t) => t.pose !== 'none').map((t) => t.id));
  const isTrack = (x: Finding) => x.kind === 'join' || drawn.has(x.track) || x.track.endsWith('-up');
  const worst = (status: (s: Track['status']) => boolean) =>
    ranked.filter((x) => status(x.status) && isTrack(x)).slice(0, 10);
  const failures = unique.filter((x) => x.gross).length;
  return {
    name: 'track continuity',
    rows,
    findings: unique,
    foul,
    turns,
    clear,
    joins: js,
    worstAsRun: worst((s) => s === 'live' || s === 'v26'),
    worstPlanned: worst((s) => s === 'v27'),
    worstAll: ranked.filter(isTrack).slice(0, 10),
    worstSim: ranked.filter((x) => !isTrack(x)).slice(0, 5),
    failures,
  };
}
export type ContinuityReport = ReturnType<typeof checkContinuity>;

const f1 = (n: number) => (n === Infinity ? '∞' : n.toFixed(1));
export function printContinuity(r: ContinuityReport) {
  console.log('\nTrack continuity');
  console.log(
    '  track | pose | length m | max kink ° @s | kinks >2° | min radius m @s | runs <40 m | no-ease | chord m | max grade % @s | m over 4% | breaks >2% | gross',
  );
  for (const t of r.rows)
    console.log(
      `  ${t.id} [${t.status}] | ${t.pose} | ${t.length.toFixed(0)} | ${f1(t.maxKink)} @${t.maxKinkAt.toFixed(0)} | ${t.kinksOver} | ${f1(t.minRadius)} @${t.minRadiusAt.toFixed(0)} | ${t.under40} | ${t.eases} | ${t.chordMin.toFixed(2)}-${t.chordMax.toFixed(2)} | ${t.maxGrade.toFixed(1)} @${t.maxGradeAt.toFixed(0)} | ${t.over4.toFixed(0)} | ${t.breaks} | ${t.gross}`,
    );
  console.log('  joins:');
  for (const j of r.joins)
    console.log(`    [${j.status}] ${j.name}: gap ${j.gap.toFixed(2)} m, heading ${j.heading.toFixed(1)}° (${j.note})`);
  console.log("  fouling zones (up track within 2.3 m of today's):");
  for (const x of r.foul) console.log(`    ${x.track}: ${x.text}`);
  const line = (x: Finding) =>
    `    ${x.gross ? 'FAIL ' : ''}${x.track} [${x.status}] s ${x.s.toFixed(0)} (${x.x.toFixed(1)}, ${x.z.toFixed(1)}): ${x.text}`;
  console.log("  turnouts and crossover (divergence from today's track, tightest radius of the eased shift):");
  for (const t of r.turns)
    console.log(
      `    ${t.line} ${t.what}: leaves at up to ${t.diverge.toFixed(1)}°, radius ${t.minRadius.toFixed(1)} m at s ${t.at}`,
    );
  console.log('  platform edges against both tracks (car side to platform edge, closest point):');
  for (const p of r.clear) console.log(`    ${p.name} / ${p.track}: ${p.clearance.toFixed(2)} m at s ${p.at}`);
  console.log('  worst ten, track a train is drawn on today (live, v26):');
  for (const x of r.worstAsRun) console.log(line(x));
  console.log('  worst ten, planned (v27):');
  for (const x of r.worstPlanned) console.log(line(x));
  console.log("  the sims' coarse paths (never drawn; the server's near-train check):");
  for (const x of r.worstSim) console.log(line(x));
  console.log('  worst ten, whole network (tentative lines included):');
  for (const x of r.worstAll) console.log(line(x));
  const would = r.findings.filter((x) => x.planned);
  if (would.length) console.log(`  planned or tentative track that would fail if run today: ${would.length}`);
  for (const x of would.slice(0, 12)) console.log(line(x));
  for (const x of r.findings.filter((x) => x.gross)) console.log(line(x));
  console.log(
    `track continuity: ${r.failures ? `${r.failures} PROBLEMS` : 'ok'} (${r.rows.length} tracks, ${r.joins.length} joins)`,
  );
}

if (import.meta.main) {
  const r = checkContinuity();
  printContinuity(r);
  process.exitCode = r.failures ? 1 : 0;
}
