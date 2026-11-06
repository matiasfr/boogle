// Offline report/figures only; importing this module never writes files.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { escapeHtml as xml } from '../development/markdown.ts';
import { simulateCampaign } from './campaign.ts';
import type { Campaign, CampaignOptions, Kind } from './campaign-types.ts';
import { POLICIES } from './campaign-types.ts';

type Result = ReturnType<typeof simulateCampaign>;
const minute = (n: number) => (n / 60).toFixed(1);
const pct = (n: number, total: number) => `${((100 * n) / total).toFixed(1)}%`;
const kinds: Kind[] = ['F', 'C', 'A', 'M', 'R', 'E'];
const table = (head: string[], rows: (string | number)[][]) =>
  `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`;
const span = (a: number, b: number) => `${minute(a)}–${minute(b)}`;

function noDesire(r: Result) {
  const windows: { fromS: number; toS: number; people: number }[] = [];
  for (const i of r.intervals) {
    if (!i.idle || i.wants || i.fromS >= r.elapsedS || i.toS <= i.fromS) continue;
    const last = windows.at(-1);
    if (last?.toS === i.fromS && last.people === i.idle) last.toS = Math.min(r.elapsedS, i.toS);
    else windows.push({ fromS: i.fromS, toS: Math.min(r.elapsedS, i.toS), people: i.idle });
  }
  return windows;
}
function brief(r: Result) {
  const { trace, intervals, ...rest } = r;
  return {
    ...rest,
    noDesire: noDesire(r),
    paths: trace.filter((e) => e.type === 'path'),
    presence: trace.filter((e) => e.type === 'presence'),
    retainedCargo: trace.filter((e) => e.type === 'retained-cargo'),
    roomIdleS: intervals
      .filter((i) => !i.authored && !i.hauling && i.players && i.fromS < r.elapsedS)
      .reduce((n, i) => n + i.toS - i.fromS, 0),
  };
}
function comparison(r: Result) {
  return {
    route: r.route,
    party: r.party,
    options: r.options,
    complete: r.complete,
    elapsedS: r.elapsedS,
    authoredS: r.authoredS,
    haulOnlyS: r.haulOnlyS,
    waitS: r.waitS,
    absentS: r.absentS,
    totals: r.totals,
    auditCount: r.auditCount,
    ledger: r.ledger,
  };
}
function chart(
  title: string,
  labels: string[],
  series: { name: string; color: string; values: number[] }[],
  max: number,
  reference = false,
) {
  const width = 1000,
    left = 190,
    right = 55,
    top = 100,
    row = 36,
    height = top + labels.length * row + 60;
  const scale = (width - left - right) / max;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xml(title)}">`,
    '<rect width="100%" height="100%" fill="#f8fafc"/>',
    '<g font-family="Arial,sans-serif" font-size="13" fill="#172033">',
    `<text x="24" y="30" font-size="20" font-weight="bold">${xml(title)}</text>`,
  ];
  series.forEach((s, i) =>
    parts.push(
      `<rect x="${24 + i * 180}" y="49" width="13" height="13" fill="${s.color}"/><text x="${43 + i * 180}" y="61">${xml(s.name)}</text>`,
    ),
  );
  for (let n = 0; n <= max; n += max / 8) {
    const x = left + n * scale;
    parts.push(
      `<path d="M${x},${top - 10} V${height - 40}" stroke="#dbe2ec"/><text x="${x}" y="${height - 17}" text-anchor="middle">${n.toFixed(0)}</text>`,
    );
  }
  labels.forEach((label, i) => {
    const y = top + i * row;
    let x = left;
    parts.push(`<text x="${left - 12}" y="${y + 17}" text-anchor="end">${xml(label)}</text>`);
    for (const s of series) {
      const w = s.values[i]! * scale;
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="24" fill="${s.color}"/>`);
      x += w;
    }
  });
  if (reference)
    parts.push(
      `<path d="M${left + 480 * scale},${top - 10} V${height - 40}" stroke="#172033" stroke-dasharray="5 4"/><text x="${left + 480 * scale + 5}" y="${top - 17}">8 h</text>`,
    );
  parts.push('</g></svg>');
  return parts.join('\n');
}

export function writeCampaignReport(routes: Campaign[]) {
  const directory = 'docs/research/progression-sim';
  mkdirSync(directory, { recursive: true });
  const run = (c: Campaign, party: number, options: CampaignOptions = {}) => simulateCampaign(c, party, options);
  const baseline = routes.flatMap((c) => [1, 2, 3, 4].map((p) => run(c, p)));
  const variants: [string, CampaignOptions][] = [
    ['core only / zero optional play', { optional: false }],
    ['zero authored duration', { content: 0 }],
    ['75% authored duration', { content: 0.75 }],
    ['cost 75%', { cost: 0.75 }],
    ['cost 125%', { cost: 1.25 }],
    ['supply 0.5x', { supply: 0.5 }],
    ['supply 2x', { supply: 2 }],
    ['distance 0.75x', { distance: 0.75 }],
    ['distance 1.5x', { distance: 1.5 }],
    ...POLICIES.filter((policy) => policy !== 'route-first').map((policy): [string, CampaignOptions] => [
      policy,
      { policy },
    ]),
  ];
  const comparisons = routes.flatMap((c) =>
    variants.map(([name, options]) => ({
      route: c.id,
      name,
      runs: [1, 2, 3, 4].map((p) => comparison(run(c, p, options))),
    })),
  );
  const attendance = routes.flatMap((c) =>
    Object.entries(c.scenarios).map(([name, presence]) => ({
      route: c.id,
      name,
      result: brief(run(c, 1, { presence })),
    })),
  );
  const omissions = routes.flatMap((c) =>
    c.tasks
      .filter((t) => t.optional && t.kind !== 'E')
      .map((t) => {
        const base = baseline.find((r) => r.route === c.id && r.party === 1)!;
        const without = run(c, 1, { omit: [t.id] });
        const u = base.unlocks.find((u) => u.id === t.id);
        return {
          route: c.id,
          id: t.id,
          complete: without.complete,
          withoutMinutes: without.elapsedS / 60,
          netMinutesSavedByPurchase: (without.elapsedS - base.elapsedS) / 60,
          labourMinutesSavedByPurchase: (without.totals.haulingPersonS - base.totals.haulingPersonS) / 60,
          firstUseS: u?.firstUseS ?? null,
          availableBeforeEndS: u ? base.elapsedS - u.atS : null,
        };
      }),
  );
  const missingFreight = routes.map((c) => {
    const blocked = structuredClone(c);
    blocked.lines.shift();
    return { route: c.id, removedLine: c.lines[0]!.id, result: brief(run(blocked, 1)) };
  });
  const files = [
    'campaign.ts',
    'campaign-types.ts',
    'campaign-kit.ts',
    'options.ts',
    'three-area.ts',
    'five-area.ts',
    'report.ts',
    'cli.ts',
    'model.ts',
  ].map((f) => `dev/economy/${f}`);
  files.push('dev/development/markdown.ts');
  const inputHash = createHash('sha256').update(JSON.stringify(routes)).digest('hex');
  const sourceHash = createHash('sha256');
  for (const file of files) sourceHash.update(file).update(readFileSync(file));
  const metadata = {
    schema: 1,
    scope: 'offline tooling only',
    baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    inputSha256: inputHash,
    sourceSha256: sourceHash.digest('hex'),
    sourceFiles: files,
    command: 'npm run economy -- --report',
    node: process.version,
    status: baseline.every((r) => r.complete) ? 'complete' : 'blocked',
  };
  const data = {
    metadata,
    inputs: routes,
    baseline: baseline.map(brief),
    comparisons,
    attendance,
    omissions,
    missingFreight,
  };
  writeFileSync(`${directory}/results.json`, `${JSON.stringify(data, null, 2)}\n`);
  const labels = baseline.map((r) => `${r.route} / ${r.party} player${r.party === 1 ? '' : 's'}`);
  writeFileSync(
    `${directory}/time-mix.svg`,
    chart(
      'Campaign clock: where the proposed minutes go',
      labels,
      [
        { name: 'Authored lane', color: '#2563eb', values: baseline.map((r) => r.authoredS / 60) },
        { name: 'Hauling only', color: '#d97706', values: baseline.map((r) => r.haulOnlyS / 60) },
        { name: 'Exposed wait', color: '#dc2626', values: baseline.map((r) => r.waitS / 60) },
      ],
      600,
      true,
    ),
  );
  const contrast = routes.flatMap((c) => [
    baseline.find((r) => r.route === c.id && r.party === 1)!,
    comparisons.find((v) => v.route === c.id && v.name === 'core only / zero optional play')!.runs[0]!,
    comparisons.find((v) => v.route === c.id && v.name === 'zero authored duration')!.runs[0]!,
  ]);
  writeFileSync(
    `${directory}/content-debt.svg`,
    chart(
      'Solo content counterfactuals (minutes)',
      routes.flatMap((c) => ['all selected', 'core only', 'zero authored'].map((s) => `${c.id} / ${s}`)),
      [
        { name: 'Authored lane', color: '#2563eb', values: contrast.map((r) => r.authoredS / 60) },
        { name: 'Hauling + wait', color: '#d97706', values: contrast.map((r) => (r.haulOnlyS + r.waitS) / 60) },
      ],
      600,
      true,
    ),
  );
  const solo = baseline.filter((r) => r.party === 1);
  const hourly = solo.flatMap((r) => r.hourly.map((h) => ({ label: `${r.route} / hour ${h.hour}`, ...h })));
  writeFileSync(
    `${directory}/kind-cadence.svg`,
    chart(
      'Solo acquisition cadence (counts, not duration)',
      hourly.map((h) => h.label),
      kinds.map((kind, i) => ({
        name: kind,
        color: ['#2563eb', '#0891b2', '#7c3aed', '#d97706', '#16a34a', '#db2777'][i]!,
        values: hourly.map((h) => h.kinds[kind]),
      })),
      16,
    ),
  );
  const body: string[] = [
    '# Progression on paper: two candidate campaigns',
    '_5 November 2026. Owner-authorized early tooling exception; no route selected, gameplay changed, push or ship. Generated numbers are deterministic design arithmetic, not measurements or playtest approval._',
    `The full-shopping, curious solo forecasts are **${solo.map((r) => `${(r.elapsedS / 3600).toFixed(2)} h (${r.route})`).join(' and ')}**. They depend on **${solo.map((r) => minute(r.authoredS)).join(' / ')} minutes of named but unbuilt authored activity**. Removing optional play or the authored durations shortens them; no bill was raised to hit eight hours. The model can expose missing content and bottlenecks; it cannot establish that these minutes are fun.`,
    '## Scope, authority and inputs',
    'The [brief](../brainstorms/progression.md) remains proposed. [Upgrade economy](upgrade-economy.md#what-deveconomymodelts-needs-to-simulate), [next destinations](next-destinations.md#three-ways-to-fit-an-eight-hour-arc) and [rail economy](rail-economy-model.md) supply the comparison questions. This serves DESIGN’s **Toys before chores**, **Designed for drop-in, drop-out** and **Small and readable**. The exception authorizes this paper experiment ahead of the replay, not building either route. No Boogler copy was edited; no suspect dialogue was encountered in the tooling scope.',
    '- **Three-area**: starter → Glasshouse/fibre → sail tower → Split Shell/cement → bell terraces → Exhibition/steel → optional observatory → original island. Double jump at the sail tower is this unresolved variant only. Crystal/copper are omitted, not smuggled in as extra areas.\n- **Five-area**: starter → chalk/cement → steel harbour → suspended coast/crystal → port/copper → original island. Starter double jump, hook and glide remain. The four-resource catalogue retains C1–C6, S1–S6, X1–X4, U1–U6 and C5 → U6. Both routes explicitly experiment with further jumps, faster glide, longer hook and a plate-target hook **pull**, never swing.',
    'All economic quantities, durations, geometry thresholds, capacities, reserves and attendance times are named inputs in [campaign-kit.ts](../../dev/economy/campaign-kit.ts), [three-area.ts](../../dev/economy/three-area.ts) or [five-area.ts](../../dev/economy/five-area.ts). Shared engine constants are structural identities/unit conversions, not hidden balance knobs. CLI overrides are recorded in JSON. Every output below uses the complete input snapshots in [results.json](progression-sim/results.json); this file also includes every unlock, first modeled use, remaining use window, hourly count, material ledger and counterfactual.',
    `Input SHA-256: \`${metadata.inputSha256}\`. Engine/report source SHA-256: \`${metadata.sourceSha256}\`. Base checkout: \`${metadata.baseCommit}\`; hashes identify the uncommitted simulation sources used at generation, not a claim that the base commit contains them. See [manifest](progression-sim/manifest.json).`,
    '## Model contract and deliberate limits',
    'This is a discrete-event schedule, separate from the historical model fixtures. Each finite raw source processes 1 raw unit into 1 component, with explicit recipe input/output accounts; seed stock is charged once at initialization. There is no renewal, waste or hidden income. Sources stop at demand or per-material rack capacity. Bills reserve shipments once, mixed final loads respect carry capacity, and deposits become installed stock once. Raw, loose, processing, reserved/rail, carried, deposited and installed units remain accounted for at every event. Conservation and exactly-once installation are not tunables.',
    'One shared authored activity lane prevents dividing the story by headcount; additional active workers haul while it runs. This is an explicit conservative scheduling assumption, not a co-op engagement model. All workers are fungible at job sites: per-job local carry distance is charged, but repositioning between distant work sites is not modeled. The reported human labour excludes automatic manufacturing and train travel. Costs never scale with party size. Acquisition counts have one primary kind; practice is not another A, and E is excluded from functional-novelty gaps.',
    'The rail graph has stations, bidirectional lines, finite trains and loads, acceleration/deceleration, empty positioning/return trips, dwell, receiving capacity and transfers. Routing chooses stable fewest-hop paths, not a globally optimal timetable. Sources consolidate a load up to the bill, rack and wagon limits before dispatch; different lines/deliveries overlap. Reservations occupy receiving capacity before arrival. No passengers, overtaking, switches, backhaul optimization, train ownership choices, or missed-boardings are simulated. U5’s capacity effect is only a proxy for its proposed passenger/freight separation; S4/U3 open preset cross-links. Source-rate improvements are generic preparation multipliers, not a claim that an axe accelerates a real kiln.',
    'Ability paths are authored alternatives with explicit minimum extra jumps, glide speed, hook reach/type or permanent route prerequisites. The fastest available alternative changes travel and puzzle time; abilities are not given a fictional universal seconds-per-upgrade value. This borrows the requirement-graph idea from [place-level.ts](../../dev/economy/place-level.ts), without importing its terrain or claiming physics reachability. The five-area route currently exercises its iterative movement chiefly on the final approach: that is a content weakness, visible in first-use/omission results.',
    'Late visitors immediately inherit shared capabilities and personal reward eligibility, retaining unseen reveal opportunities without duplicating materials. A departing carrier retains their personal cargo; its project reservation is released, so another worker can fund the deficit from remaining finite supply. Retained cargo is not silently confiscated or automatically re-donated on return. Interrupted authored work can pass to the remaining player. When empty, only already-started production/deliveries and fully funded builds finish; no new purchase, extraction or freight dispatch starts. These are offline assumptions, not a production save/sync implementation. 5–6 players, finite-stock hoarding beyond the tested deficit, optional dismantling/refunds and persistent personal claim/replay execution remain future work.',
    '## Baseline clocks and grind proxies',
    'Minutes below are modeled, not wall-clock runtime. **Authored** includes named first approaches/puzzle paths. **Haul-only** is elapsed time hauling with no authored lane running; **wait** has neither lane active while someone is present. These three partition the baseline clock. **Haul labour** sums person-minutes including overlap; grind share is conservatively (haul-only + wait) / elapsed. A longer task is not necessarily grind and a named task is not proof of enjoyable content.',
    table(
      [
        'Route / players',
        'Finish min',
        'Authored min',
        'Haul-only min',
        'Wait min',
        'Haul labour min',
        'Grind proxy',
        'Loads / rail legs / transfers',
      ],
      baseline.map((r) => [
        `${r.route} / ${r.party}`,
        minute(r.elapsedS),
        minute(r.authoredS),
        minute(r.haulOnlyS),
        minute(r.waitS),
        minute(r.totals.haulingPersonS),
        pct(r.haulOnlyS + r.waitS, r.elapsedS),
        `${r.totals.loads} / ${r.totals.shipments} / ${r.totals.transfers}`,
      ]),
    ),
    '![Campaign clock](progression-sim/time-mix.svg)',
    '## Hour-by-hour upgrade mix',
    'Each cell is **F/C/A/M/R/E acquisitions**, in that order. Zeros after completion are a finished campaign, not a demand for endless purchases. No hourly timer gates the route. A practice beat consumes authored time but adds no A. The full JSON retains each acquisition timestamp.',
  ];
  for (const c of routes) {
    const runs = baseline.filter((r) => r.route === c.id);
    body.push(
      `### ${c.name}`,
      table(
        ['Hour', '1 player', '2 players', '3 players', '4 players'],
        Array.from({ length: Math.max(...runs.map((r) => r.hourly.length)) }, (_, i) => [
          i + 1,
          ...runs.map((r) => kinds.map((k) => r.hourly[i]?.kinds[k] ?? 0).join('/')),
        ]),
      ),
    );
  }
  body.push(
    '![Solo kind cadence](progression-sim/kind-cadence.svg)',
    '## Time to every unlock',
    'Minutes since arrival; “—” means not acquired/used before the ending. First use is the first scheduler read of an affected capability or path, not a noticed player benefit. A higher capacity can be read without saving a whole trip; omission tests below measure the net schedule consequence. All costs/dependencies remain in the route data.',
  );
  for (const c of routes) {
    const runs = baseline.filter((r) => r.route === c.id);
    body.push(
      `### ${c.id}`,
      table(
        ['Unlock / kind', '1p', '2p', '3p', '4p', 'Solo first modeled use', 'Solo minutes left'],
        c.tasks
          .filter((t) => t.kind)
          .map((t) => {
            const u = runs[0]!.unlocks.find((u) => u.id === t.id);
            return [
              `${t.id}: ${t.label} (${t.kind})`,
              ...runs.map((r) => {
                const u = r.unlocks.find((u) => u.id === t.id);
                return u ? minute(u.atS) : '—';
              }),
              u?.firstUseS == null ? '—' : minute(u.firstUseS),
              u ? minute(runs[0]!.elapsedS - u.atS) : '—',
            ];
          }),
      ),
    );
  }
  body.push(
    '## Waiting, nothing eligible to want, and functional gaps',
    '“No desire” is a narrow, inspectable proxy: an idle active worker while there is no dependency-ready, uncompleted acquisition in the selected catalogue. It cannot infer motivation. A worker watching their friend’s authored activity may be happily involved. It excludes post-ending time, optional toys and locked future purchases. A separate functional gap counts time between non-E acquisitions; long puzzles can legitimately occupy it. The JSON preserves all windows; this table shows the three longest per run and total person-minutes.',
    table(
      [
        'Route / players',
        'Idle person-min',
        'No-desire person-min',
        'Three longest no-desire windows (min; idle people)',
        'Longest functional gap min',
      ],
      baseline.map((r) => {
        const windows = noDesire(r).sort((a, b) => b.toS - b.fromS - (a.toS - a.fromS));
        return [
          `${r.route} / ${r.party}`,
          minute(r.totals.idlePersonS),
          minute(windows.reduce((n, w) => n + (w.toS - w.fromS) * w.people, 0)),
          windows
            .slice(0, 3)
            .map((w) => `${span(w.fromS, w.toS)} (${w.people})`)
            .join('; ') || 'none',
          minute(Math.max(0, ...r.gaps.map((g) => g.toS - g.fromS))),
        ];
      }),
    ),
    'No E reward is used to hide an A/M or functional gap. In the solo data, review the interval ending at each entry below; it is a prompt to inspect the named activity, not an instruction to add another ability.',
    table(
      ['Route', 'Functional gap intervals (minutes → next unlock)'],
      solo.map((r) => [r.route, r.gaps.map((g) => `${span(g.fromS, g.toS)} → ${g.next}`).join('; ') || 'none']),
    ),
    '## Content debt, prices and purchase order',
    'The core-only run has zero optional activities/purchases and retains all required travel/puzzles. Zero-authored removes all declared authored/puzzle durations but keeps actual modeled path distance, production, freight, carry and construction. It is an economy stress run, not a speedrun forecast. Differences therefore include newly exposed supply waits. Cost/rate/distance sweeps are assumptions, not confidence intervals. “blocked” means the 12 h ceiling was reached without the ending, never fabricated extra income.',
    table(
      ['Route', 'Change', 'Finish min, 1 / 2 / 3 / 4 players'],
      comparisons.map((v) => [
        v.route,
        v.name,
        v.runs.map((r) => (r.complete ? minute(r.elapsedS) : 'blocked')).join(' / '),
      ]),
    ),
    '![Content counterfactuals](progression-sim/content-debt.svg)',
    'Eight hours is supported only if the named encounters earn their proposed durations. The direct route is shorter than the curious run; optional interiors and courses cannot be required to make the promise true. The cost +25% row adds labour and waiting, not authored play. Do not use that extra time to close a content deficit. The research’s 60/90/90/90/75/75 minute allowances were not copied as mandatory clock gates.',
    '### Omit each optional functional purchase (solo)',
    'Positive net saving means buying the option shortened the full route; negative means it cost more elapsed time than it saved. This includes its authored acquisition time and changed scheduling, so it is opportunity cost, not isolated mechanical payback. Optional descendants are omitted too (C5 → U6). Reward-only E options are outside this economic test. A path-opening upgrade may be worthwhile despite negative time savings; the player must judge that.',
    table(
      [
        'Route / option',
        'Net minutes saved by buying',
        'Haul labour minutes saved',
        'First modeled use min',
        'Minutes available before ending',
      ],
      omissions.map((o) => [
        `${o.route} / ${o.id}`,
        o.netMinutesSavedByPurchase.toFixed(2),
        o.labourMinutesSavedByPurchase.toFixed(2),
        o.firstUseS === null ? '—' : minute(o.firstUseS),
        o.availableBeforeEndS === null ? '—' : minute(o.availableBeforeEndS),
      ]),
    ),
    '## Attendance, late visitors and failure cases',
    table(
      [
        'Route / schedule',
        'Finish min',
        'Absent min',
        'Eligible / unseen reveals for late or p2',
        'Retained personal cargo',
      ],
      attendance.map((a) => {
        const p = a.result.people.find((p) => p.id === 'late' || p.id === 'p2');
        return [
          `${a.route} / ${a.name}`,
          a.result.complete ? minute(a.result.elapsedS) : 'blocked',
          minute(a.result.absentS),
          p ? `${p.eligible.length} / ${p.unexperienced.length}` : '—',
          JSON.stringify(a.result.people.map((p) => ({ id: p.id, cargo: p.retainedCargo }))),
        ];
      }),
    ),
    table(
      ['Route', 'Removed freight edge', 'Outcome', 'Last completed unlock'],
      missingFreight.map((r) => [
        r.route,
        r.removedLine,
        r.result.complete ? 'unexpected completion' : 'blocked, conserved stock retained',
        r.result.unlocks.at(-1)?.id ?? 'none',
      ]),
    ),
    'The 1→2→1 schedule joins at hour 1 and leaves at hour 2 permanently. Absence is hour 2–3. Late joins are hours 3 and 7. Unit fixtures additionally depart during a full load, leave during funded construction, join after the ending, and exhaust raw supply: the last case must block without creating material. Baseline peak concurrent delivery counts: ' +
      baseline.map((r) => `${r.route}/${r.party}p=${r.totals.maxConcurrentDeliveries}`).join(', ') +
      '.',
    '## Conclusions and the next bounded proof',
    '1. **Neither route is selected.** Both can close under fixed bills in this paper schedule, including solo, core-only and optional-first. The three-area route buys distinct named settings with fewer material chains; the five-area route has a more explicit bill catalogue. The arithmetic does not decide which is worth authoring.\n2. **Content is the dominant uncertainty.** First time in an area, understanding a puzzle, watching construction, choosing an export and enjoying the return are all guessed. Replace one complete area’s timing with a fresh player’s trace before promising eight hours; accept a shorter result. Added costs do not create authored activity.\n3. **Freight and late-game abilities need scrutiny.** Review batching, deadhead/transfer waits, the no-desire windows and options with no first use. Author an early use for an iterative move only if it creates an interesting route; otherwise omit it. Do not broaden this task into gameplay or retune the replay.',
    'Unmeasured: actual fun, novice discovery, co-op role choice, movement geometry, local-fit benefits within 2–5 minutes, production/animation durations, service rates, reserves, physical layout and all device behavior. The paper duration is independent of machine load; no frame or wall-clock benchmark is used. A quiet-machine rerun is needed only for future runtime/feel/performance evidence, not to trust deterministic item counts. The owner replay and production-core gates remain separate.',
    '## Reproduce and verify',
    '```sh\nnpm run economy\nnpm run economy -- three-area --players=2 --policy=cart-first\nnpm run economy -- five-area --core-only --json\nnpm run economy -- five-area --scenario=late-7h --json\nnpm run economy -- three-area --content=0 --json\nnpm run economy -- five-area --omit=C5 --json\nnpm run economy -- --report\nnode --test test/economy.test.ts\nnode dev/economy/model.ts prototype\nnpm run check\n```',
    'The historical 437-second fit is retained as a regression, not current-game validation. New tests are the owner’s explicit conservation exception to the test diet. No game/runtime imports were added; no high-risk source folder was changed, so no nested source AGENTS or lockstep/sync math route is triggered. The tooling route explicitly calls for no browser. No bot or device run is claimed. `npm run inflight` was skipped because it fetches from GitHub, prohibited by the brief; only cached refs were inspected. No new dependency or network request was needed. Figures are SVG artifacts, not game screenshots. Not tested on a device.',
  );
  writeFileSync('docs/research/progression-sim.md', `${body.join('\n\n')}\n`);
  const artifacts = [
    'docs/research/progression-sim.md',
    ...['results.json', 'time-mix.svg', 'content-debt.svg', 'kind-cadence.svg'].map((f) => `${directory}/${f}`),
  ];
  // Hash the delivered, formatted artifacts, so a later format check cannot stale the manifest.
  execFileSync(
    process.execPath,
    [
      'node_modules/prettier/bin/prettier.cjs',
      '--write',
      '--ignore-path',
      '/dev/null',
      ...artifacts.filter((p) => !p.endsWith('.svg')),
    ],
    { stdio: 'pipe' },
  );
  execFileSync(
    process.execPath,
    [
      'node_modules/prettier/bin/prettier.cjs',
      '--write',
      '--ignore-path',
      '/dev/null',
      '--parser',
      'html',
      ...artifacts.filter((p) => p.endsWith('.svg')),
    ],
    { stdio: 'pipe' },
  );
  writeFileSync(
    `${directory}/manifest.json`,
    `${JSON.stringify(
      {
        ...metadata,
        baselineRuns: baseline.length,
        comparisonRuns: comparisons.length * 4,
        attendanceRuns: attendance.length,
        omissionRuns: omissions.length,
        expectedBlockedFreightRuns: missingFreight.length,
        artifacts: artifacts.map((path) => ({
          path,
          sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
        })),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote progression-sim.md, 3 SVGs, full inputs/results and manifest (${baseline.length} baseline runs).`);
}
