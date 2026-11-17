// Production tail/nose acceptance. Design minima and pins: docs/plans/rider-coach.md#r2b-audit.
// The v56 counterfactual probe is preserved at a2d45b03a; this measures the actual cached consist and catalog.
import { pathToFileURL } from 'node:url';
import { consistOf, consistBounds } from '../../src/entities/railway/cars.ts';
import { deckGap } from '../../src/entities/railway/car-spacing.ts';
import { LINE2, RAIL_LINES, TRAIN_EXTENT, railEnd } from '../../src/sim/railway-lines.ts';
import { RING_END, RING_HALT, RING_HEAD, RING_S_HEAD, RING_GAP } from '../../src/sim/railway-ring-layout.ts';
import { TRAIN } from '../../src/sim/railway-train.ts';
import { OFFSET_HALTS, CROSSING_WIDTH, FORMATION } from '../../src/place/layout.ts';
import { GATES } from '../../src/place/tech-layout.ts';
import { LINE2_END_S } from '../../src/entities/railway/line2-path.ts';
import { coachTrain } from './rider-coach.ts';

export function checkCoachAudit() {
  const tail = TRAIN_EXTENT.behindCm / 100,
    nose = TRAIN_EXTENT.aheadCm / 100;
  const halts = RAIL_LINES[LINE2]!.halts;
  const at = (name: string) => halts.find((h) => h.name === name)!;
  const problems: string[] = [];
  const rows: {
    name: string;
    value: number;
    minimum: number | null;
    pin: number;
    tolerance: number;
    source: string;
  }[] = [];
  const source = 'docs/plans/rider-coach.md#r2b-audit';
  function row(name: string, value: number, minimum: number | null, pin: number, rule: string) {
    rows.push({
      name,
      value,
      minimum,
      pin,
      tolerance: 0.01,
      source: `${source}; ${rule}`,
    });
    if (minimum !== null && value + 1e-9 < minimum) problems.push(`${name}: ${value} m < ${minimum} m`);
    if (Math.abs(value - pin) > 0.01 + 1e-9) problems.push(`${name}: ${value} m, pin ${pin} ± 0.01 m`);
  }
  for (const [line, data] of RAIL_LINES.slice(0, 2).entries()) {
    const h = data.halts[0]!,
      end = h.end!;
    row(
      `Line ${line + 1} Home held tail/block edge`,
      (end.signalCm - TRAIN_EXTENT.behindCm - end.edgeCm) / 100,
      0,
      0,
      'railway-install: held tail clears near block',
    );
    row(
      `Line ${line + 1} Home signal/stop`,
      (end.signalCm - h.s) / 100,
      TRAIN.sepCm / 100,
      line === LINE2 ? 48.45 : 58.1,
      'railway-install: signal at least sepCm past stop',
    );
  }
  const camp = RAIL_LINES[0]!.halts.at(-1)!;
  row(
    'Camp reserved tail/merge (report only)',
    (camp.s - camp.end!.mergeCm) / 100 - tail,
    null,
    8.9,
    'audit: shared reservation, no physical-tail minimum',
  );
  const q = at('Quarry').s / 100;
  row('Quarry tail/Home block', q - tail - halts[0]!.end!.edgeCm / 100, 1, 103.9, 'railway-install: middle stop');
  row(
    'Quarry tail/planks',
    q - tail - OFFSET_HALTS[0]!.crossS - CROSSING_WIDTH / 2,
    0,
    9.9,
    'rail-network: crossing obstacle',
  );
  row('Quarry nose/gate', GATES.quarry.s - 0.45 - q - nose, 0, 3.35, 'rail-network: gate obstacle');
  const fh = at('Far Head').s / 100,
    merge = FORMATION.quarry.crossover![1];
  row(
    'Far Head reserved tail/merge (report only)',
    fh - tail - merge,
    null,
    -4.1,
    'fourth-car §7 #3: reservation accepted; no wagon or steel while terminal',
  );
  const plainTail = -consistBounds(consistOf({ line: LINE2, wagon: false, steel: false })).lo;
  row(
    'Far Head physical terminal tail/merge',
    fh - plainTail - merge,
    0,
    3.3,
    'audit: longest consist available before Q6',
  );
  row(
    'Far Head nose/planks',
    OFFSET_HALTS[1]!.crossS - CROSSING_WIDTH / 2 - fh - nose,
    0,
    5.1,
    'rail-network: crossing obstacle',
  );
  const pier = at('Pier').s / 100,
    plankEnd = OFFSET_HALTS[2]!.crossS + CROSSING_WIDTH / 2;
  row(
    'Pier full tail/west crossing',
    pier - tail - plankEnd,
    0.6,
    0.8,
    'ring.ts: stopped train clear of sole foot crossing; R2b.1 pin',
  );
  const shortTail = -consistBounds(consistOf({ line: LINE2, wagon: false, steel: true })).lo;
  row(
    'Pier 12.40 m tail/west crossing',
    pier - shortTail - plankEnd,
    0.6,
    4.5,
    'ring.ts; R2b.1 crossing move raises pin 1.1 → 4.5',
  );
  row(
    'Pier drawn nose/parked layer',
    734.4 - pier - 6.7,
    1,
    1.2,
    'rider-car-fit §4: parked layer, long-engine drawn nose',
  );
  for (const [i, h] of RING_HEAD.entries())
    row(
      `Railhead ${i + 1} terminal tail/stub merge`,
      (h.s - h.mergeCm) / 100 - tail,
      0,
      3.9,
      'fourth-car §7 #5; railEnd stub merge 20 m before each moving stop',
    );
  for (const name of ['Stack head 1', 'Stack head 2', 'Stack head 3']) {
    const h = at(name);
    row(`${name} terminal tail/stub merge`, (h.s - h.end!.mergeCm) / 100 - tail, 0, 3.9, 'fourth-car §7 #5');
  }
  row(
    'First railhead tail/Q7 deck',
    (RING_HEAD[0]!.s - RING_S_HEAD) / 100 - tail,
    0,
    93.9,
    'railway-r4b-views: whole train on deck',
  );
  const u = RING_END.u / 100;
  row('Ring tail/crossover', u - tail - RING_END.cross.u1 / 100, 5, 18.3, 'ring.ts');
  row('Ring tail/planks', u - tail - 430.5, 3, 4.8, 'ring.ts: RING_CROSSING.u1');
  row('Ring tail/ramp top', u - tail - 434.6, 0, 0.7, 'ring.ts: RING_CROSSING.rampTop');
  row('Ring tail/platform', u - tail - RING_HALT.u0 / 100, 0, 7.3, 'ring.ts');
  row('Ring nose/buffers', RING_END.bufferU / 100 - u - nose, 14.7, 23.4, 'ring.ts');
  row('Ring nose/platform', RING_HALT.u1 / 100 - u - nose, 0, 8.4, 'ring.ts');
  const signal = at('Ring Island').end!.signalCm / 100;
  row('Ring held tail/hinge', signal - tail - (RING_S_HEAD + RING_GAP.hinge) / 100, 20, 93.7, 'ring.ts');
  row('Ring held tail/last Railhead', signal - tail - RING_HEAD[7]!.s / 100, TRAIN.sepCm / 100, 120.7, 'ring.ts');
  for (const [k, sig] of (RAIL_LINES[LINE2]!.signals ?? []).entries())
    row(
      `Stack signal ${k + 1} held tail/passed stop (report only)`,
      (sig - at(`Stack head ${k + 1}`).s) / 100 - tail,
      null,
      -6.1,
      'audit: no clearance minimum; sepCm protects trains',
    );
  const gorge = at('High Gorge'),
    crossEnd = (gorge.end!.mergeCm + RING_END.cross.u1 - RING_END.cross.u0) / 100;
  row('Gorge full tail/crossover', gorge.s / 100 - tail - crossEnd, 0.3, 0.3, 'route-rules; R2b.2 restores 0.30 m');
  row(
    'Gorge 12.40 m tail/crossover',
    gorge.s / 100 - shortTail - crossEnd,
    0.3,
    4,
    'route-rules; R2b.2 raises pin 0.6 → 4.0',
  );
  row(
    'Gorge tail/platform',
    gorge.s / 100 - tail - (LINE2_END_S - 40),
    0,
    3.9,
    'content/levels/gorge.ts: 3210.4–3250.4',
  );
  row('Gorge nose/line end', LINE2_END_S - gorge.s / 100 - nose, 0, 11.8, 'content/levels/gorge.ts');
  const [out, back] = [false, true].map((up) => coachTrain(gorge.s / 100, up).at(-1)!);
  row(
    'Gorge last-car standing-turn displacement',
    -Math.hypot(out!.x - back!.x, out!.z - back!.z),
    0,
    0,
    'R2b.2: no movement at standing turn (negative distance, minimum zero)',
  );
  row(
    'Gorge last-car standing-turn yaw',
    -Math.abs(out!.yaw - back!.yaw),
    0,
    0,
    'R2b.2: zero radians; negative absolute yaw',
  );
  // Pin every terminal, including all moving heads. Stop-to-signal differences are unaffected by a translated stub.
  for (const h of [
    ...halts.slice(2),
    ...RING_HEAD.slice(1).map((head, i) => ({
      name: `Railhead ${i + 2}`,
      s: head.s,
      end: railEnd('stub', head.mergeCm, 1),
    })),
  ]) {
    const held = Math.min(h.end!.signalCm / 100, h.s / 100 - TRAIN.sepCm / 100);
    const value = h.s / 100 - tail - held - nose;
    const pin =
      h.name === 'Far Head'
        ? 17.9
        : h.name === 'Pier'
          ? 174.4
          : h.name === 'Ring Island'
            ? 40.3
            : h.name === 'High Gorge'
              ? 22.3
              : 23.9;
    row(`${h.name} terminal follower nose/standing tail`, value, 0, pin, 'railway-trains.ts: endBlocks');
  }
  row(
    'Open line reserved follower nose/leader tail',
    TRAIN.sepCm / 100 - tail - nose,
    0,
    3.1,
    'railway-trains.ts: blockFree',
  );
  const queue = [false, true].map((up) => {
    let gap = Infinity,
      leadingS = 0;
    // Same 0.5 m grid as the design audit, from 49.4 m through the final stop; both tracks, all car pairs.
    for (let s = 22 + TRAIN.sepCm / 100; s <= gorge.s / 100; s += 0.5) {
      const a = coachTrain(s, up),
        b = coachTrain(s - TRAIN.sepCm / 100, up);
      const g = Math.min(...a.flatMap((x) => b.map((y) => deckGap(x, y))));
      if (g < gap) {
        gap = g;
        leadingS = s;
      }
    }
    row(
      `Whole-line drawn queue ${up ? 'homeward' : 'outward'}`,
      gap,
      0.5,
      up ? 0.94 : 3.88,
      'R2b audit: all-body separation; 0.5 m samples',
    );
    return { track: Number(up), gap, leadingS };
  });
  return { level: 'rider-coach-tail-nose', failures: problems.length, problems, rows, queue };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = checkCoachAudit();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.failures ? 1 : 0;
}
