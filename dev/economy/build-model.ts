// Builds docs/economy/economy-model.xlsx (live formulas), the same data as CSVs, and the data block of
// docs/world/ring-economy.html. Cached values come from ring-sim.ts, which mirrors every formula.
//   node dev/economy/build-model.ts                              write everything
//   node dev/economy/build-model.ts --check                      fail if any committed output is stale
//   node dev/economy/build-model.ts --bare=DIR [--first=gorge] [--pick=chassis]
//                                                                a copy without cached values, to check the formulas
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GOALS,
  LADDERS,
  LINKS,
  MATERIALS,
  PLACES,
  PRICES,
  PRODUCERS,
  RECIPES,
  RESOURCES,
  RETURNS,
  ROUTE,
  SETTINGS,
  STORAGE,
  TRAIN_SERVICE,
  type Bill,
  type Branch,
  type Material,
} from './ring-data.ts';
import {
  NEVER,
  awayCredit,
  crossover,
  milestoneOf,
  orderOf,
  placeKm,
  simulate,
  railRideS,
  trainSetting,
  slotOfSource,
  type Result,
} from './ring-sim.ts';
import { STYLE, colName, workbook, type Cell, type Sheet } from './xlsx.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'docs/economy');
const PAGE = join(ROOT, 'docs/world/ring-economy.html');
const args = process.argv.slice(2);
const check = args.includes('--check');
const bare = args.find((a) => a.startsWith('--bare='))?.slice(7);
const firstArg = args.find((a) => a.startsWith('--first='))?.slice(8);
const pickArg = args.find((a) => a.startsWith('--pick='))?.slice(7);
if ((firstArg || pickArg) && !bare) throw new Error('--first and --pick only apply with --bare');
const res = simulate({ ...(firstArg ? { branchFirst: firstArg } : {}), ...(pickArg ? { trainFirst: pickArg } : {}) });
const set = res.settings;
const first = res.first;
const N = ROUTE.length;
const M = MATERIALS.length;
const r1 = (n: number) => Math.round(n * 1000) / 1000;

// ---------- cell helpers ----------
const withValues = !bare;
const F = (f: string, v?: number | string, s: number = STYLE.num): Cell => ({ f, v: withValues ? v : undefined, s });
const T = (v: string, s = STYLE.none): Cell => ({ v, s });
const I = (v: number | string): Cell => ({ v, s: typeof v === 'number' ? STYLE.inputNum : STYLE.input });
const H = (v: string): Cell => ({ v, s: STYLE.header });
const billTotal = (b: Bill) => MATERIALS.reduce((n, m) => n + (b[m] ?? 0), 0);
const billDistinct = (b: Bill) => MATERIALS.filter((m) => (b[m] ?? 0) > 0).length;
const billCells = (bill: Bill) => MATERIALS.map((m) => I(bill[m] ?? 0));
const costHeaders = MATERIALS.map((m) => H(m));
const COST0 = 6; // column G on Producers, Storage and Recipes
const costCol = (m: Material) => colName(COST0 + MATERIALS.indexOf(m));

// ---------- Settings ----------
const settingsRows: Cell[][] = [
  [T('Settings: edit the yellow cells', STYLE.title)],
  [
    T(
      'Every other tab reads these. Change the first branch to "gorge", or the first upgrade to "chassis".',
      STYLE.note,
    ),
  ],
  [H('Setting'), H('Value'), H('Unit'), H('Note'), H('Key')],
];
const setRow: Record<string, number> = {};
for (const s of SETTINGS) {
  setRow[s.key] = settingsRows.length + 1;
  settingsRows.push([T(s.label), I(set[s.key]!), T(s.unit), T(s.note, STYLE.note), T(s.key, STYLE.note)]);
}
const S = (key: string) => {
  if (!setRow[key]) throw new Error(key);
  return `Settings!$B$${setRow[key]}`;
};
settingsRows.push(
  [],
  [H('Ladder'), H('Label'), H('Step 0'), H('Step 1'), H('Step 2'), H('Step 3'), H('Unit'), H('Note')],
);
const ladRow: Record<string, number> = {};
for (const l of LADDERS) {
  ladRow[l.key] = settingsRows.length + 1;
  settingsRows.push([
    T(l.key),
    T(l.label),
    ...l.steps.map((n) => I(n)),
    T(l.unit),
    T(
      `${l.note}. Each recipe that names this ladder moves it one step, for every player: progression is shared.`,
      STYLE.note,
    ),
  ]);
}
const ladderRange = (key: string) => `Settings!$C$${ladRow[key]}:$F$${ladRow[key]}`;
const awayNow = awayCredit(set, Number(set.awayHours));
settingsRows.push([], [H('Derived'), H('Value'), H('Unit'), H('Formula')]);
const AWAY_ROW = settingsRows.length + 1;
settingsRows.push([
  T('Away credit for the time away above'),
  F(`${S('awayFill')}*${S('awayHorizonHours')}*(1-EXP(-${S('awayHours')}/${S('awayHorizonHours')}))`, r1(awayNow)),
  T('hours of output'),
  T('Credited to each yard on the next join, never past the yard', STYLE.note),
]);
const AWAY = `Settings!$B$${AWAY_ROW}`;
const FIRST = S('branchFirst');
const PICK = S('trainFirst');
const settingsSheet: Sheet = {
  name: 'Settings',
  rows: settingsRows,
  widths: [36, 22, 10, 10, 10, 10, 18, 60],
  freeze: { row: 3, col: 0 },
};

// ---------- Links ----------
const linkRow: Record<string, number> = {};
const linksSheet: Sheet = {
  name: 'Links',
  widths: [16, 10, 10, 10, 70],
  freeze: { row: 1, col: 1 },
  rows: [
    [H('Link'), H('From'), H('To'), H('km'), H('Note')],
    ...LINKS.map((l, k) => {
      linkRow[l.id] = k + 2;
      return [T(l.id, STYLE.bold), T(l.from), T(l.to), I(l.km), T(l.note, STYLE.note)];
    }),
    [],
    [T('Every travel time comes from these lengths. A new map layout changes only this table.', STYLE.note)],
  ],
};
const L = (id: string) => `Links!$D$${linkRow[id]}`;
const br = (canopy: string, gorge: string) => `IF(${FIRST}="canopy",${L(canopy)},${L(gorge)})`;

// ---------- Resources ----------
const resourcesSheet: Sheet = {
  name: 'Resources',
  widths: [6, 18, 6, 16, 12, 12, 12, 9, 36, 60, 16, 12],
  freeze: { row: 1, col: 2 },
  rows: [
    [
      H('ID'),
      H('Resource'),
      H('Tier'),
      H('Source (authored)'),
      H('Source slot'),
      H('Hand harvest s/unit'),
      H('Local haul m'),
      H('By hand?'),
      H('Becomes shared stock'),
      H('Note'),
      H('Hand rate today (carry 8, no tools), units/h'),
      H('Town price, Bucks/unit'),
    ],
    ...RESOURCES.map((r, k) => {
      const row = k + 2;
      const slotF = r.source.startsWith('branch:')
        ? F(`IF(${FIRST}="${r.source.slice(7)}","b1","b2")`, slotOfSource(r.source, first), STYLE.none)
        : T(r.source);
      const today = r.manual ? (8 * 3600) / (r.harvestS * 8 + 1.2 + (2 * r.localM) / 5.6) : 0;
      return [
        T(r.id, STYLE.bold),
        T(r.name),
        T(String(r.tier)),
        T(r.source),
        slotF,
        I(r.harvestS),
        I(r.localM),
        I(r.manual),
        T(r.shared),
        T(r.note, STYLE.note),
        F(`IF(H${row}=0,0,8*3600/(F${row}*8+${S('pickupS')}+2*G${row}/${S('walkMps')}))`, r1(today), STYLE.int),
        I(PRICES[r.id]),
      ];
    }),
  ],
};
const price = (m: Material) => `Resources!$L$${2 + MATERIALS.indexOf(m)}`;

// ---------- World ----------
const spoke1Order = `(MATCH("spoke1",Route!$A:$A,0)-1)`;
const closeOrder = `(MATCH("ring.close",Route!$A:$A,0)-1)`;
const kmF = (slot: string, i: string) => {
  const at = (col: string) => `INDEX(World!$${col}:$${col},MATCH(${slot},World!$A:$A,0))`;
  return `MIN(IF(${spoke1Order}<${i},${at('I')},${at('H')}),IF(${closeOrder}<${i},${at('J')},${NEVER}),IF(${at('M')}<${i},${at('K')},${NEVER}))`;
};
const trainF = (v: string, key: 'accel' | 'dwellS' | 'boardWaitS') =>
  TRAIN_SERVICE.slice(1).reduce((f, t) => `IF(${v}>=${t.speed},${S(`${key}${t.suffix}`)},${f})`, S(key));
const railF = (km: string, v: string) => {
  const a = trainF(v, 'accel');
  return `IF(${km}*1000>=${v}*${v}/${a},${km}*1000/${v}+${v}/${a},2*SQRT(${km}*1000/${a}))`;
};
const rideF = (km: string, v: string) =>
  `IF(${km}<${S('walkLimitKm')},${km}*1000/${S('walkMps')},${railF(km, v)}+${trainF(v, 'dwellS')}+${trainF(v, 'boardWaitS')})`;
const rideTS = (km: number, v: number, wait: number) =>
  km < Number(set.walkLimitKm)
    ? (km * 1000) / Number(set.walkMps)
    : railRideS(set, km * 1000, v) + trainSetting(set, v, 'dwellS') + wait;
const v0 = `INDEX(${ladderRange('speed')},1,1)`;
const placeKey = (slot: string, b: Branch) =>
  slot === 'b1' ? b : slot === 'b2' ? (b === 'canopy' ? 'gorge' : 'canopy') : slot.startsWith('stop') ? 'stops' : slot;
const billHere = (key: string) =>
  RECIPES.filter((r) => r.place === key && r.required === 'main').reduce((n, r) => n + billTotal(r.bill), 0);
const worldRow = (slot: string) => 2 + PLACES.findIndex((p) => p.slot === slot);
const kmFormulas = (slot: string, row: number): [string, string, string, string] | null => {
  const E = L('entry'),
    rb1 = br('ring-canopy', 'gorge-ring'),
    b1p = br('canopy-port', 'port-gorge'),
    pb2 = br('port-gorge', 'canopy-port'),
    b2r = br('gorge-ring', 'ring-canopy'),
    sb1 = br('spoke-canopy', 'spoke-gorge'),
    sb2 = br('spoke-gorge', 'spoke-canopy'),
    sp = L('spoke-port'),
    o = L('port-original');
  const p = worldRow('port');
  switch (slot) {
    case 'ring':
      return [E, `H${row}`, `H${row}`, `H${row}`];
    case 'b1':
      return [`${E}+${rb1}`, `MIN(H${row},${sb1})`, `I${row}`, sb1];
    case 'port':
      return [`${E}+${rb1}+${b1p}`, `MIN(H${row},${sb1}+${b1p})`, `MIN(I${row},${E}+${b2r}+${pb2})`, sp];
    case 'b2':
      return [`${E}+${rb1}+${b1p}+${pb2}`, `MIN(H${row},${sb1}+${b1p}+${pb2})`, `MIN(I${row},${E}+${b2r})`, sb2];
    case 'original':
      return [`H${p}+${o}`, `I${p}+${o}`, `J${p}+${o}`, `${sp}+${o}`];
  }
  return null;
};
const worldSheet: Sheet = {
  name: 'World',
  widths: [12, 10, 24, 10, 8, 26, 40, 10, 10, 10, 10, 18, 8, 10, 10, 10, 10, 60],
  freeze: { row: 1, col: 1 },
  rows: [
    [
      H('Slot'),
      H('Place key'),
      H('Place'),
      H('Kind'),
      H('Map angle°'),
      H('Resources'),
      H('Abilities and finds'),
      H('km to hub, before spoke 1'),
      H('km after spoke 1'),
      H('km after the ring closes'),
      H('km over own spoke'),
      H('Own spoke built at'),
      H('Its order'),
      H('Ride min, the long way (step-0 train)'),
      H('Ride min over own spoke'),
      H('Minutes the spoke saves'),
      H('Main bill here (units)'),
      H('Note'),
    ],
    ...PLACES.map((p, k) => {
      const row = k + 2;
      const km = placeKm(p.slot, first);
      const key =
        p.slot === 'b1'
          ? F(FIRST, first, STYLE.none)
          : p.slot === 'b2'
            ? F(`IF(${FIRST}="canopy","gorge","canopy")`, placeKey('b2', first), STYLE.none)
            : T(placeKey(p.slot, first));
      const name =
        p.slot === 'b1'
          ? F(
              `IF(${FIRST}="canopy","Canopy Town","High Gorge")`,
              first === 'canopy' ? 'Canopy Town' : 'High Gorge',
              STYLE.none,
            )
          : p.slot === 'b2'
            ? F(
                `IF(${FIRST}="canopy","High Gorge","Canopy Town")`,
                first === 'canopy' ? 'High Gorge' : 'Canopy Town',
                STYLE.none,
              )
            : T(p.name);
      const f = kmFormulas(p.slot, row);
      const kmCells = f
        ? [F(f[0], r1(km.before)), F(f[1], r1(km.spoke1)), F(f[2], r1(km.closed)), F(f[3], r1(km.own))]
        : [I(km.before), F(`H${row}`, km.spoke1), F(`H${row}`, km.closed), F(`H${row}`, km.own)];
      const longMin = rideTS(km.before, 20, Number(set.boardWaitS)) / 60;
      const ownMin = rideTS(km.own, 20, Number(set.boardWaitS)) / 60;
      return [
        T(p.slot, STYLE.bold),
        key,
        name,
        T(p.kind),
        p.angle === null ? T('') : T(String(p.angle)),
        T(p.resources),
        T(p.abilities),
        ...kmCells,
        I(p.ownSpoke),
        F(`IFERROR(MATCH(L${row},Route!$A:$A,0)-1,${NEVER})`, orderOf(p.ownSpoke), STYLE.int),
        F(`${rideF(`H${row}`, v0)}/60`, r1(longMin)),
        F(`${rideF(`K${row}`, v0)}/60`, r1(ownMin)),
        F(`N${row}-O${row}`, r1(longMin - ownMin)),
        F(
          `SUMIFS(Recipes!$S:$S,Recipes!$F:$F,B${row},Recipes!$E:$E,"main")`,
          billHere(placeKey(p.slot, first)),
          STYLE.int,
        ),
        T(p.note, STYLE.note),
      ];
    }),
    [],
    [
      T(
        'Distances are formulas over the Links tab: edit lengths there. Map angles only place the schematic map.',
        STYLE.note,
      ),
    ],
  ],
};

// ---------- Route ----------
const routeSheet: Sheet = {
  name: 'Route',
  widths: [18, 44, 10, 22, 7, 10, 7, 9, 8, 8, 8, 8, 8, 10, 10, 40, 10, 8, 10, 9, 10],
  freeze: { row: 1, col: 1 },
  rows: [
    [
      H('Key'),
      H('Step'),
      H('Slot'),
      H('Place'),
      H('Order'),
      H('Authored play, min (solo)'),
      H('Round trips home'),
      H('Frontier km from hub'),
      H('Train m/s'),
      H('Freight per train'),
      H('Trains'),
      H('Hand carry'),
      H('Harvest ×'),
      H('One-way ride s'),
      H('Remote producers running'),
      H('Note'),
      H('Doubles back to'),
      H('Return trips'),
      H('Return play, min'),
      H('Return km'),
      H('Return one-way s'),
    ],
    ...res.steps.map((st, k) => {
      const row = k + 2;
      const r = ROUTE[k]!;
      const ret = RETURNS[r.key];
      const lad = (key: string, v: number) =>
        F(`INDEX(${ladderRange(key)},1,1+MIN(3,COUNTIFS(Recipes!$U:$U,"${key}",Recipes!$R:$R,"<="&E${row})))`, v);
      const remote = (['S', 'Fi', 'U', 'X'] as const)
        .map((m) => `IF(COUNTIFS(Producers!$B:$B,"${m}",Producers!$R:$R,"<="&E${row})>0,1,0)`)
        .join('+');
      return [
        T(r.key, STYLE.bold),
        T(r.name),
        T(r.slot),
        F(`INDEX(World!$C:$C,MATCH(C${row},World!$A:$A,0))`, st.place, STYLE.none),
        F(`ROW()-1`, st.order, STYLE.int),
        I(r.activityMin),
        I(r.rides),
        F(kmF(`C${row}`, `E${row}`), r1(st.km), STYLE.num),
        lad('speed', st.speed),
        lad('wagon', st.wagon),
        lad('trains', st.trains),
        lad('carry', st.carry),
        lad('tool', st.tool),
        F(rideF(`H${row}`, `I${row}`), r1(st.rideS)),
        F(remote, st.remote, STYLE.int),
        T(ret ? `${r.note}. Return: ${ret.note}` : r.note, STYLE.note),
        I(ret?.slot ?? ''),
        I(ret?.trips ?? 0),
        I(ret?.activityMin ?? 0),
        F(`IF(Q${row}="",0,${kmF(`Q${row}`, `E${row}`)})`, r1(st.back.km), STYLE.num),
        F(`IF(Q${row}="",0,${rideF(`T${row}`, `I${row}`)})`, r1(st.back.rideS)),
      ];
    }),
  ],
};

// ---------- Producers, Storage, Recipes ----------
const branchMilestoneF = (placeCol: string, r: number) =>
  `IF(AND(OR(${placeCol}${r}="canopy",${placeCol}${r}="gorge"),${placeCol}${r}<>${FIRST}),P${r},O${r})`;
const orderF = (r: number) => `IFERROR(MATCH(Q${r},Route!$A:$A,0)-1,${NEVER})`;
const tail = (r: number, bill: Bill, ms: string) => [
  F(`SUM(G${r}:N${r})`, billTotal(bill), STYLE.int),
  F(`COUNTIF(G${r}:N${r},">0")`, billDistinct(bill), STYLE.int),
  ms,
];
const producersSheet: Sheet = {
  name: 'Producers',
  widths: [8, 5, 10, 6, 9, 8, ...MATERIALS.map(() => 5), 18, 18, 18, 7, 7, 7, 44, 56],
  freeze: { row: 1, col: 1 },
  rows: [
    [
      H('ID'),
      H('Makes'),
      H('Place'),
      H('Level'),
      H('Rate, units/h'),
      H('Own yard cap'),
      ...costHeaders,
      H('Bought at (first branch)'),
      H('Bought at (second branch)'),
      H('Milestone'),
      H('Order'),
      H('Units'),
      H('Kinds'),
      H('What you see'),
      H('Source'),
    ],
    ...PRODUCERS.map((p, k) => {
      const row = k + 2;
      const ms = milestoneOf(p, set);
      const [total, kinds] = tail(row, p.bill, ms);
      return [
        T(p.id, STYLE.bold),
        T(p.res),
        T(p.place),
        I(p.level),
        I(p.rate),
        I(p.cap),
        ...billCells(p.bill),
        I(p.first),
        I(p.second),
        F(branchMilestoneF('C', row), ms, STYLE.none),
        F(orderF(row), orderOf(ms), STYLE.int),
        total,
        kinds,
        T(p.look),
        T(p.source, STYLE.note),
      ];
    }),
    [],
    [
      T(
        'Milestone "endgame" means after the ending (see Endgame); "anytime" means an optional cosmetic sink.',
        STYLE.note,
      ),
    ],
  ],
};
const storageSheet: Sheet = {
  name: 'Storage',
  widths: [6, 8, 6, 9, 6, 50, ...MATERIALS.map(() => 5), 18, 18, 18, 7, 7, 7, 30],
  freeze: { row: 1, col: 1 },
  rows: [
    [
      H('ID'),
      H('Place'),
      H('Level'),
      H('Bay cap per material'),
      H('Bays'),
      H('What you see'),
      ...costHeaders,
      H('Built at (first branch)'),
      H('Built at (second branch)'),
      H('Milestone'),
      H('Order'),
      H('Units'),
      H('Kinds'),
      H('Source'),
    ],
    ...STORAGE.map((y, k) => {
      const row = k + 2;
      const ms = milestoneOf(y, set);
      const [total, kinds] = tail(row, y.bill, ms);
      return [
        T(y.id, STYLE.bold),
        T(y.place),
        I(y.level),
        I(y.bay),
        I(y.bays),
        T(y.look),
        ...billCells(y.bill),
        I(y.first),
        I(y.second),
        F(branchMilestoneF('B', row), ms, STYLE.none),
        F(orderF(row), orderOf(ms), STYLE.int),
        total,
        kinds,
        T(y.source, STYLE.note),
      ];
    }),
    [],
    [
      T(
        'Each producer keeps its own yard; the Home Yard bay adds to it. A full yard sells its surplus to the town for Bucks.',
        STYLE.note,
      ),
    ],
  ],
};
const recipesSheet: Sheet = {
  name: 'Recipes',
  widths: [8, 40, 8, 6, 9, 10, ...MATERIALS.map(() => 5), 18, 18, 18, 7, 7, 7, 8, 32, 40, 9],
  freeze: { row: 1, col: 2 },
  rows: [
    [
      H('ID'),
      H('Recipe'),
      H('Kind'),
      H('Upgrade kind'),
      H('Main or optional'),
      H('Place'),
      ...costHeaders,
      H('At (first branch or picked first)'),
      H('At (second branch or picked second)'),
      H('Milestone'),
      H('Order'),
      H('Units'),
      H('Kinds'),
      H('Ladder'),
      H('Effect'),
      H('Source'),
      H('Upgrade pick'),
    ],
    ...RECIPES.map((r, k) => {
      const row = k + 2;
      const ms = milestoneOf(r, set);
      const [total, kinds] = tail(row, r.bill, ms);
      return [
        T(r.id, STYLE.bold),
        T(r.name),
        T(r.kind),
        T(r.upgrade),
        T(r.required),
        T(r.place),
        ...billCells(r.bill),
        I(r.first),
        I(r.second),
        F(`IF(X${row}<>"",IF(X${row}=${PICK},O${row},P${row}),${branchMilestoneF('F', row)})`, ms, STYLE.none),
        F(orderF(row), orderOf(ms), STYLE.int),
        total,
        kinds,
        T(r.ladder ?? ''),
        T(r.effect),
        T(r.source, STYLE.note),
        I(r.pick ?? ''),
      ];
    }),
    [],
    [
      T(
        'Upgrade kinds: F flat gain, C chore removal, A ability, M new system, R route, E expression (upgrade-economy.md).',
        STYLE.note,
      ),
    ],
  ],
};

// ---------- Flows (one row per step and material, then one block per party) ----------
const PARTIES = res.players;
const NP = PARTIES.length;
const partyLabel = (n: number) => (n === 1 ? 'solo' : `${n} players`);
const playersCell = (b: number) => `Pacing!$${colName(1 + b)}$3`;
const flowRow = (i: number, mi: number) => 2 + (i - 1) * M + mi;
const FB = 16; // first party column on Flows
const FW = 8; // columns per party on Flows
const fcol = (b: number, k: number) => colName(FB + FW * b + k); // 0 start, 1 wait, 2 end, 3 group hand, 4 crossing, 5 first so far, 6 sold, 7 Bucks
const PB = 4; // first party column on Pacing
const PW = 12; // columns per party on Pacing
const pcol = (b: number, k: number) => colName(PB + PW * b + k); // 0 play, 1 labour, 2 commute, 3 work, 4 wait, 5 step, 6 start, 7 end, 8 sittings, 9 waiting on, 10 Bucks, 11 wallet
const route = (col: string, r: number) => `INDEX(Route!$${col}:$${col},$A${r}+1)`;
const pac = (col: string, r: number) => `INDEX(Pacing!$${col}:$${col},$A${r}+4)`;
const resA = (col: string, r: number) => `INDEX(Resources!$${col}:$${col},MATCH($C${r},Resources!$A:$A,0))`;
const flowsRows: Cell[][] = [
  [
    H('Order'),
    H('Step'),
    H('Material'),
    H('Needed this step'),
    H('Producer level'),
    H('Producer rate/h'),
    H('Yard cap'),
    H('Source slot'),
    H('Source km to hub'),
    H('Freight limit/h'),
    H('Automatic to hub/h'),
    H('By hand, one player/h'),
    H('Units by hand'),
    H('Units from stock'),
    H('Hand labour s (solo)'),
    H('Automatic ≥ one player?'),
    ...PARTIES.flatMap((n) => [
      H(`Stock at start (${partyLabel(n)})`),
      H(`Supply wait h (${partyLabel(n)})`),
      H(`Stock at end (${partyLabel(n)})`),
      H(`By hand, whole group/h (${partyLabel(n)})`),
      H(`Machines pass the group at h (${partyLabel(n)})`),
      H(`First pass so far (${partyLabel(n)})`),
      H(`Surplus sold (${partyLabel(n)})`),
      H(`Bucks (${partyLabel(n)})`),
    ]),
  ],
];
const passHour = (mi: number, upTo: number, b: number) => {
  let best = NEVER;
  for (const st of res.steps.slice(0, upTo)) {
    const f = st.flows[mi]!;
    if (f.auto > 0 && f.auto >= f.group[b]!) best = Math.min(best, st.pace[b]!.start);
  }
  return best;
};
res.steps.forEach((st, k) => {
  const i = k + 1;
  st.flows.forEach((f, mi) => {
    const r = flowRow(i, mi);
    const m = f.material;
    const c = costCol(m);
    const harvest = resA('F', r),
      local = resA('G', r),
      manual = resA('H', r);
    const v = route('I', r),
      carry = route('L', r),
      tool = route('M', r);
    const party = PARTIES.flatMap((_, b) => {
      const [s, , e, g, x, fs, sold] = [0, 1, 2, 3, 4, 5, 6].map((q) => fcol(b, q)) as string[];
      const raw = `${s}${r}+K${r}*${pac(pcol(b, 5), r)}-N${r}`;
      const ahead = f.auto > 0 && f.auto >= f.group[b]!;
      return [
        F(i === 1 ? '0' : `${e}${r - M}`, r1(f.start[b]!)),
        F(`IF(K${r}>0,MAX(0,(N${r}-${s}${r}-K${r}*${pac(pcol(b, 3), r)})/K${r}),0)`, r1(f.wait[b]!), STYLE.num),
        F(`MIN(G${r},MAX(0,${raw})+IF(${pac(pcol(b, 8), r)}>0,K${r}*${AWAY},0))`, r1(f.end[b]!)),
        F(
          `L${r}*(1+(${playersCell(b)}-1)*${S('handParallel')}+MAX(0,${S('helperHands')}-(${playersCell(b)}-1)*${S('helperStepAside')}))`,
          r1(f.group[b]!),
          STYLE.int,
        ),
        F(
          `IF(AND(K${r}>0,K${r}>=${g}${r}),${pac(pcol(b, 6), r)},${NEVER})`,
          r1(ahead ? st.pace[b]!.start : NEVER),
          STYLE.num,
        ),
        F(i === 1 ? `${x}${r}` : `MIN(${x}${r},${fs}${r - M})`, r1(passHour(mi, i, b)), STYLE.num),
        F(`MAX(0,${raw}-G${r})`, r1(f.sold[b]!), STYLE.int),
        F(`${sold}${r}*${resA('L', r)}`, r1(f.sold[b]! * PRICES[m]), STYLE.int),
      ];
    });
    flowsRows[r - 1] = [
      { v: i, s: STYLE.int },
      F(`INDEX(Route!$A:$A,$A${r}+1)`, st.key, STYLE.none),
      T(m, STYLE.bold),
      F(
        `SUMIFS(Recipes!$${c}:$${c},Recipes!$R:$R,$A${r})+SUMIFS(Producers!$${c}:$${c},Producers!$R:$R,$A${r})+SUMIFS(Storage!$${c}:$${c},Storage!$R:$R,$A${r})`,
        f.demand,
        STYLE.int,
      ),
      F(`COUNTIFS(Producers!$B:$B,$C${r},Producers!$R:$R,"<="&$A${r})`, f.level, STYLE.int),
      F(
        `IF(E${r}=0,0,SUMIFS(Producers!$E:$E,Producers!$B:$B,$C${r},Producers!$D:$D,E${r}))`,
        f.producerRate,
        STYLE.int,
      ),
      F(
        `IF(E${r}=0,0,SUMIFS(Producers!$F:$F,Producers!$B:$B,$C${r},Producers!$D:$D,E${r})+IF(COUNTIFS(Storage!$R:$R,"<="&$A${r})=0,0,SUMIFS(Storage!$D:$D,Storage!$C:$C,COUNTIFS(Storage!$R:$R,"<="&$A${r}))))`,
        f.cap,
        STYLE.int,
      ),
      F(resA('E', r), slotOfSource(RESOURCES.find((x) => x.id === m)!.source, first), STYLE.none),
      F(kmF(`H${r}`, `$A${r}`), r1(f.km), STYLE.num),
      F(
        `IF(I${r}<${S('walkLimitKm')},1000000000,${route('J', r)}*${route('K', r)}*3600/(2*(${railF(`I${r}`, v)}+${trainF(v, 'dwellS')})+2*${S('transferS')})/MAX(1,${route('O', r)}))`,
        r1(f.freight),
        STYLE.int,
      ),
      F(`MIN(F${r},J${r})`, r1(f.auto), STYLE.int),
      F(
        `IF(${manual}=0,0,${carry}*3600/(${harvest}*${tool}*${carry}+${S('pickupS')}+2*${rideF(`I${r}`, v)}))`,
        r1(f.manual),
        STYLE.int,
      ),
      F(`IF(K${r}=0,D${r},0)`, f.hand, STYLE.int),
      F(`D${r}-M${r}`, f.stock, STYLE.int),
      F(
        `M${r}*IF(${manual}=0,0,(${harvest}*${tool}*${carry}+${S('pickupS')}+2*${local}/${S('walkMps')})/${carry})+N${r}*${S('lastCarryS')}`,
        r1(f.labourS),
      ),
      F(`IF(AND(K${r}>0,K${r}>=L${r}),1,0)`, f.ahead ? 1 : 0, STYLE.int),
      ...party,
    ];
  });
});
const flowsSheet: Sheet = {
  name: 'Flows',
  rows: flowsRows,
  widths: [6, 18, 8, ...Array.from({ length: 13 + FW * NP }, () => 11)],
  freeze: { row: 1, col: 3 },
};

// ---------- Pacing ----------
const block = (i: number, col: string) => `Flows!$${col}$${flowRow(i, 0)}:$${col}$${flowRow(i, M - 1)}`;
const pacRow = (i: number) => i + 4;
const pacingRows: Cell[][] = [
  [T('Pacing: hours to each milestone', STYLE.title)],
  [
    T(
      'One block per party: designed and tuned for 1–3 players (owner, 6 November). Hours are play time: the world is paused while nobody is in it. Progression is shared, so every party has the same tools.',
      STYLE.note,
    ),
  ],
  [T('Players'), ...PARTIES.map((n) => I(n))],
  [
    H('Order'),
    H('Key'),
    H('Step'),
    H('Place'),
    ...PARTIES.flatMap((n) => {
      const l = partyLabel(n);
      return [
        H(`Play min, with returns (${l})`),
        H(`Hand labour min (${l})`),
        H(`Commute min (${l})`),
        H(`Work h (${l})`),
        H(`Supply wait h (${l})`),
        H(`Step h (${l})`),
        H(`Starts at h (${l})`),
        H(`Ends at h (${l})`),
        H(`Sittings crossed (${l})`),
        H(`Waiting on (${l})`),
        H(`Bucks earned (${l})`),
        H(`Wallet (${l})`),
      ];
    }),
  ],
];
res.steps.forEach((st, k) => {
  const i = k + 1,
    r = pacRow(i);
  const half = (b: number) => {
    const pc = st.pace[b]!;
    const pl = playersCell(b);
    const C = (q: number) => pcol(b, q);
    return [
      F(`(INDEX(Route!$F:$F,$A${r}+1)+INDEX(Route!$S:$S,$A${r}+1))/(1+(${pl}-1)*${S('activityParallel')})`, r1(pc.act)),
      F(
        `SUMIFS(Flows!$O:$O,Flows!$A:$A,$A${r})/60/(1+(${pl}-1)*${S('handParallel')}+MAX(0,${S('helperHands')}-(${pl}-1)*${S('helperStepAside')}))`,
        r1(pc.labour),
      ),
      F(
        `(INDEX(Route!$G:$G,$A${r}+1)*2*INDEX(Route!$N:$N,$A${r}+1)+INDEX(Route!$R:$R,$A${r}+1)*2*INDEX(Route!$U:$U,$A${r}+1))/60/(1+(${pl}-1)*${S('travelParallel')})`,
        r1(pc.travel),
      ),
      F(`(${C(0)}${r}+${C(1)}${r}+${C(2)}${r})/60`, r1(pc.work), STYLE.num),
      F(`MAX(${block(i, fcol(b, 1))})`, r1(pc.wait), STYLE.num),
      F(`${C(3)}${r}+${C(4)}${r}`, r1(pc.dur), STYLE.num),
      F(i === 1 ? '0' : `${C(7)}${r - 1}`, r1(pc.start), STYLE.num),
      F(`${C(6)}${r}+${C(5)}${r}`, r1(pc.end), STYLE.bold),
      F(`INT(${C(7)}${r}/${S('sessionHours')})-INT(${C(6)}${r}/${S('sessionHours')})`, pc.breaks, STYLE.int),
      F(
        `IF(${C(4)}${r}=0,"—",INDEX(${block(i, 'C')},MATCH(${C(4)}${r},${block(i, fcol(b, 1))},0)))`,
        pc.limiting,
        STYLE.none,
      ),
      F(`SUM(${block(i, fcol(b, 7))})`, r1(pc.bucks), STYLE.int),
      F(i === 1 ? `${C(10)}${r}` : `${C(11)}${r - 1}+${C(10)}${r}`, r1(pc.wallet), STYLE.int),
    ];
  };
  pacingRows.push([
    { v: i, s: STYLE.int },
    F(`INDEX(Route!$A:$A,$A${r}+1)`, st.key, STYLE.none),
    F(`INDEX(Route!$B:$B,$A${r}+1)`, st.name, STYLE.none),
    F(`INDEX(Route!$D:$D,$A${r}+1)`, st.place, STYLE.none),
    ...PARTIES.flatMap((_, b) => half(b)),
  ]);
});
const lastPac = pacRow(N);
const TOTAL_ROW = lastPac + 2;
const sum = (b: number, key: 'act' | 'labour' | 'travel' | 'wait') =>
  res.steps.reduce((n, st) => n + st.pace[b]![key], 0);
const lastStep = res.steps[N - 1]!;
pacingRows.push(
  [],
  [
    T('Total', STYLE.bold),
    T(''),
    T(''),
    T(''),
    ...PARTIES.flatMap((_, b) => {
      const C = (q: number) => pcol(b, q);
      return [
        F(`SUM(${C(0)}5:${C(0)}${lastPac})`, r1(sum(b, 'act'))),
        F(`SUM(${C(1)}5:${C(1)}${lastPac})`, r1(sum(b, 'labour'))),
        F(`SUM(${C(2)}5:${C(2)}${lastPac})`, r1(sum(b, 'travel'))),
        T(''),
        F(`SUM(${C(4)}5:${C(4)}${lastPac})`, r1(sum(b, 'wait'))),
        T(''),
        T(''),
        F(`${C(7)}${lastPac}`, r1(lastStep.pace[b]!.end), STYLE.bold),
        T(''),
        T(''),
        T(''),
        F(`${C(11)}${lastPac}`, r1(lastStep.pace[b]!.wallet), STYLE.int),
      ];
    }),
  ],
);
const pacingSheet: Sheet = {
  name: 'Pacing',
  rows: pacingRows,
  widths: [6, 18, 44, 20, ...Array.from({ length: PW * NP }, () => 9)],
  freeze: { row: 4, col: 3 },
};
const soloWallet = `Pacing!$${pcol(0, 11)}$${lastPac}`;

// ---------- Endgame ----------
const MATS = MATERIALS.map((m) => m);
const matCol = (k: number, base: number) => colName(base + k); // base column index for an 8-material block
const endRows: Cell[][] = [
  [T('The end-game tier: everything automated, then new goals', STYLE.title)],
  [
    T(
      'Bought in order after the ending. A goal waits for its scarcest material and for the wallet; its materials cannot also be sold. More players do not speed producers, so these hours are about the same for one, two or three.',
      STYLE.note,
    ),
  ],
  [T(''), T(''), T(''), ...MATS.map((m) => H(m))],
  [
    T('Rate at the ending, units/h', STYLE.bold),
    T(''),
    T(''),
    ...MATS.map((m, k) => F(`Flows!$K$${flowRow(N, k)}`, r1(res.endRates[m]), STYLE.int)),
  ],
  [T('Town price, Bucks/unit', STYLE.bold), T(''), T(''), ...MATS.map((m) => F(price(m), PRICES[m], STYLE.int))],
  [T('Wallet at the ending (solo)', STYLE.bold), F(soloWallet, r1(lastStep.pace[0]!.wallet), STYLE.int)],
  [],
  [
    H('ID'),
    H('Goal'),
    H('Kind'),
    ...MATS.map((m) => H(m)),
    H('Bucks'),
    H('Value in Bucks'),
    ...MATS.map((m) => H(`${m} rate`)),
    H('Bucks/h if all sold'),
    H('Wallet at start'),
    H('Hours'),
    H('Wallet after'),
    H('Hours after the ending'),
    ...MATS.map((m) => H(`Sets ${m} rate`)),
    H('Note'),
  ],
];
const G0 = endRows.length + 1; // first goal row
let rates = { ...res.endRates };
let walletStart = lastStep.pace[0]!.wallet;
GOALS.forEach((g, k) => {
  const r = G0 + k;
  const gr = res.goals[k]!;
  const bill = MATS.map((_, j) => matCol(j, 3)); // D..K
  const rateCols = MATS.map((_, j) => matCol(j, 13)); // N..U
  const setCols = MATS.map((_, j) => matCol(j, 26)); // AA..AH
  const rateCells = MATS.map((m, j) =>
    F(
      k === 0 ? `${matCol(j, 3)}$4` : `IF(${setCols[j]}${r - 1}>0,${setCols[j]}${r - 1},${rateCols[j]}${r - 1})`,
      r1(rates[m]),
      STYLE.int,
    ),
  );
  const byMat = MATS.map(
    (_, j) => `IF(${bill[j]}${r}>0,IF(${rateCols[j]}${r}>0,${bill[j]}${r}/${rateCols[j]}${r},${NEVER}),0)`,
  ).join(',');
  endRows.push([
    T(g.id, STYLE.bold),
    T(g.name),
    T(g.kind),
    ...MATS.map((m) => I(g.bill[m] ?? 0)),
    I(g.bucks),
    F(`L${r}+SUMPRODUCT(D${r}:K${r},$D$5:$K$5)`, r1(gr.value), STYLE.int),
    ...rateCells,
    F(`SUMPRODUCT(N${r}:U${r},$D$5:$K$5)`, r1(gr.valueRate), STYLE.int),
    F(k === 0 ? `$B$6` : `Y${r - 1}`, r1(walletStart), STYLE.int),
    F(`MAX(MAX(${byMat}),MAX(0,(M${r}-W${r})/V${r}))`, r1(gr.hours), STYLE.num),
    F(`MAX(0,W${r}+V${r}*X${r}-M${r})`, r1(gr.wallet), STYLE.int),
    F(k === 0 ? `X${r}` : `Z${r - 1}+X${r}`, r1(gr.total), STYLE.bold),
    ...MATS.map((m) => I(g.rates?.[m] ?? 0)),
    T(g.note, STYLE.note),
  ]);
  walletStart = gr.wallet;
  for (const m of MATS) if (g.rates?.[m]) rates = { ...rates, [m]: g.rates[m]! };
});
const lastGoal = G0 + GOALS.length - 1;
const endSheet: Sheet = {
  name: 'Endgame',
  rows: endRows,
  widths: [8, 44, 11, ...MATS.map(() => 7), 9, 10, ...MATS.map(() => 8), 10, 10, 8, 10, 10, ...MATS.map(() => 8), 50],
  freeze: { row: 8, col: 2 },
};

// ---------- Crossover ----------
const crossRows: Cell[][] = [
  [T('Hands versus machines, per tier', STYLE.title)],
  [
    T(
      "Each tier starts by hand. A producer starts slower than one player hauling, then its upgrades pass the player, then the group. Each party's hours are on its own timeline. 999 = not before the ending.",
      STYLE.note,
    ),
  ],
  [
    H('Material'),
    H('Name'),
    H('Tier'),
    H('Producer level 1 at step'),
    H('Automatic starts at h (solo)'),
    H('One player by hand then, /h'),
    H('Automatic level 1, /h'),
    ...PARTIES.map((n) => H(`Machines pass the hands at h (${partyLabel(n)})`)),
    H('Automatic at the end, /h'),
    H('One player by hand at the end, /h'),
    H(`Group of ${PARTIES[NP - 1]} by hand at the end, /h`),
  ],
];
MATERIALS.forEach((m, mi) => {
  const r = crossRows.length + 1;
  const resource = RESOURCES.find((x) => x.id === m)!;
  const p1 = PRODUCERS.find((p) => p.res === m && p.level === 1);
  const l1 = p1 ? orderOf(milestoneOf(p1, set)) : 0;
  const at = (col: string, ord: string) => `INDEX(Flows!$${col}:$${col},2+(${ord}-1)*${M}+${mi})`;
  const stL1 = l1 && l1 < NEVER ? res.steps[l1 - 1]! : null;
  const end = lastStep.flows[mi]!;
  crossRows.push([
    T(m, STYLE.bold),
    T(resource.name),
    T(String(resource.tier)),
    F(`SUMIFS(Producers!$R:$R,Producers!$B:$B,"${m}",Producers!$D:$D,1)`, l1, STYLE.int),
    F(
      `IF(OR(D${r}=0,D${r}>=${NEVER}),${NEVER},INDEX(Pacing!$${pcol(0, 6)}:$${pcol(0, 6)},D${r}+4))`,
      stL1 ? r1(stL1.pace[0]!.start) : NEVER,
    ),
    F(`IF(OR(D${r}=0,D${r}>=${NEVER}),0,${at('L', `D${r}`)})`, stL1 ? r1(stL1.flows[mi]!.manual) : 0, STYLE.int),
    F(`IF(OR(D${r}=0,D${r}>=${NEVER}),0,${at('K', `D${r}`)})`, stL1 ? r1(stL1.flows[mi]!.auto) : 0, STYLE.int),
    ...PARTIES.map((_, b) => F(`Flows!$${fcol(b, 5)}$${flowRow(N, mi)}`, r1(crossover(res, m, b)), STYLE.bold)),
    F(`Flows!$K$${flowRow(N, mi)}`, r1(end.auto), STYLE.int),
    F(`Flows!$L$${flowRow(N, mi)}`, r1(end.manual), STYLE.int),
    F(`Flows!$${fcol(NP - 1, 3)}$${flowRow(N, mi)}`, r1(end.group[NP - 1]!), STYLE.int),
  ]);
});
crossRows.push(
  [],
  [
    T(
      "Manual assists (carry frame, fibre sling, proper axe, powered pick) are shared progression: they raise every player's hand line. Spokes shorten it; producer, wagon and engine upgrades raise the automatic line. The end-game cranes retire the last manual carry.",
      STYLE.note,
    ),
  ],
);
const crossSheet: Sheet = {
  name: 'Crossover',
  rows: crossRows,
  widths: [9, 18, 6, 12, 14, 14, 14, ...PARTIES.map(() => 16), 14, 14, 14],
  freeze: { row: 3, col: 1 },
};

// ---------- Summary ----------
const MILESTONES = [
  'home.line2',
  'splitrock.connect',
  'ring.connect',
  'hub.roundhouse',
  'b1.connect',
  'spoke1',
  'port.connect',
  'b2.connect',
  'ring.close',
  'final',
];
const TRAIN_IDS = ['R1', 'B1', 'S1', 'ENG2', 'R2', 'WAG2', 'ENG3', 'WAG3', 'LOOP', 'ENG4'];
const AWAY_SAMPLES = [1, 4, 8, 22, 72];
const four = simulate(
  firstArg || pickArg
    ? { ...(firstArg ? { branchFirst: firstArg } : {}), ...(pickArg ? { trainFirst: pickArg } : {}) }
    : {},
  [4],
);
const fourEnd = four.steps[N - 1]!.pace[0]!;
const totalCol = (b: number, q: number) => `Pacing!$${pcol(b, q)}$${TOTAL_ROW}`;
const sumRows: Cell[][] = [
  [T('Summary', STYLE.title)],
  [
    T(
      'Everything here is a formula over the other tabs, except the four-player footnote. Inputs are yellow on Settings, Links, Resources, World, Route, Producers, Storage, Recipes and Endgame.',
      STYLE.note,
    ),
  ],
  [H('Measure'), ...PARTIES.map((n) => H(partyLabel(n))), H('Note')],
  [
    T('Hours to the ending'),
    ...PARTIES.map((_, b) => F(`Pacing!$${pcol(b, 7)}$${lastPac}`, r1(lastStep.pace[b]!.end), STYLE.bold)),
    F(`"Rough target "&${S('targetHours')}&" h"`, `Rough target ${set.targetHours} h`, STYLE.note),
  ],
  [
    T('Authored play incl. returns, h'),
    ...PARTIES.map((_, b) => F(`${totalCol(b, 0)}/60`, r1(sum(b, 'act') / 60))),
    T('Content that has to exist', STYLE.note),
  ],
  [
    T('Hand labour, h'),
    ...PARTIES.map((_, b) => F(`${totalCol(b, 1)}/60`, r1(sum(b, 'labour') / 60))),
    T('Chopping, carrying, placing', STYLE.note),
  ],
  [
    T('Commuting incl. returns, h'),
    ...PARTIES.map((_, b) => F(`${totalCol(b, 2)}/60`, r1(sum(b, 'travel') / 60))),
    T('Spokes and faster engines shrink this', STYLE.note),
  ],
  [
    T('Waiting for shared stock, h'),
    ...PARTIES.map((_, b) => F(totalCol(b, 4), r1(sum(b, 'wait')))),
    T('Producer and storage upgrades shrink this', STYLE.note),
  ],
  [
    T('Shared wallet at the ending, Bucks'),
    ...PARTIES.map((_, b) => F(`Pacing!$${pcol(b, 11)}$${lastPac}`, r1(lastStep.pace[b]!.wallet), STYLE.int)),
    T('Surplus sold from full yards', STYLE.note),
  ],
  [
    T('End-game goals, h after the ending'),
    F(`Endgame!$Z$${lastGoal}`, r1(res.goals.at(-1)!.total), STYLE.bold),
    T(''),
    T(''),
    T('Production-bound: about the same for every party', STYLE.note),
  ],
  [
    T('Footnote: four players, hours to the ending'),
    { v: r1(fourEnd.end), s: STYLE.num },
    T(''),
    T(''),
    T(
      `Not designed for; computed by the script, not a formula. Waits ${Math.round(four.steps.reduce((n, st) => n + st.pace[0]!.wait, 0) * 60)} min for stock.`,
      STYLE.note,
    ),
  ],
  [],
  [H('Milestone'), ...PARTIES.map((n) => H(`Ends at h (${partyLabel(n)})`)), H('Step')],
  ...MILESTONES.map((key) => {
    const st = res.steps[orderOf(key) - 1]!;
    return [
      T(key, STYLE.bold),
      ...PARTIES.map((_, b) =>
        F(`INDEX(Pacing!$${pcol(b, 7)}:$${pcol(b, 7)},MATCH("${key}",Pacing!$B:$B,0))`, r1(st.pace[b]!.end)),
      ),
      F(`INDEX(Pacing!$C:$C,MATCH("${key}",Pacing!$B:$B,0))`, st.name, STYLE.none),
    ];
  }),
  [],
  [
    H('Time away, h'),
    H('Credited, hours of output'),
    T(''),
    T(''),
    H('Paused world: nothing runs while the room is empty'),
  ],
];
for (const t of AWAY_SAMPLES) {
  const r = sumRows.length + 1;
  sumRows.push([
    I(t),
    F(`${S('awayFill')}*${S('awayHorizonHours')}*(1-EXP(-A${r}/${S('awayHorizonHours')}))`, r1(awayCredit(set, t))),
    T(''),
    T(''),
    T('Credited to every producer yard on the next join, never past the yard', STYLE.note),
  ]);
}
sumRows.push([], [H('Material'), H('Main-route units'), H('By hand'), H('From shared stock'), H('Share by hand')]);
MATERIALS.forEach((m, mi) => {
  const r = sumRows.length + 1;
  const tot = (key: 'demand' | 'hand' | 'stock') => res.steps.reduce((n, st) => n + st.flows[mi]![key], 0);
  sumRows.push([
    T(m, STYLE.bold),
    F(`SUMIFS(Flows!$D:$D,Flows!$C:$C,"${m}")`, tot('demand'), STYLE.int),
    F(`SUMIFS(Flows!$M:$M,Flows!$C:$C,"${m}")`, tot('hand'), STYLE.int),
    F(`SUMIFS(Flows!$N:$N,Flows!$C:$C,"${m}")`, tot('stock'), STYLE.int),
    F(`IF(B${r}=0,0,C${r}/B${r})`, tot('demand') ? r1(tot('hand') / tot('demand')) : 0, STYLE.pct),
  ]);
});
sumRows.push([], [H('Train upgrade'), H('Units'), H('Kinds of material'), H('Milestone'), H('Recipe')]);
for (const id of TRAIN_IDS) {
  const rec = RECIPES.find((r) => r.id === id)!;
  const at = (col: string) => `INDEX(Recipes!$${col}:$${col},MATCH("${id}",Recipes!$A:$A,0))`;
  sumRows.push([
    T(id, STYLE.bold),
    F(at('S'), billTotal(rec.bill), STYLE.int),
    F(at('T'), billDistinct(rec.bill), STYLE.int),
    F(at('Q'), milestoneOf(rec, set), STYLE.none),
    F(at('B'), rec.name, STYLE.none),
  ]);
}
const summarySheet: Sheet = { name: 'Summary', rows: sumRows, widths: [34, 16, 16, 16, 44] };

// ---------- Readme ----------
const readme: Sheet = {
  name: 'Readme',
  widths: [120],
  rows: [
    [T('Boogle ring economy model (proposed, revised 6 November 2026)', STYLE.title)],
    [
      T(
        'A paper model of the ring-and-hub world: what each place makes, how fast by hand and by machine, what it costs, the shared wallet, and how long the main game and the end-game tier take for one player and for four.',
      ),
    ],
    [
      T(
        'Yellow cells are inputs. Everything else is a formula, so changing a rate, bill, distance or setting updates every tab. Excel and Numbers recalculate on open.',
      ),
    ],
    [],
    [T('Tabs', STYLE.bold)],
    [
      T(
        'Settings: global numbers, the two choices (which branch first, which Roundhouse upgrade first), the away credit and the ladders that upgrades climb.',
      ),
    ],
    [T('Links: every travel distance. A new map layout only changes this table.')],
    [
      T(
        'Resources: the materials by tier, how fast a person gathers each by hand, when it becomes shared stock, and its town price in Bucks.',
      ),
    ],
    [
      T(
        'World: the hub, the ring, its spokes and small stops; distances to the Home Yard before and after each shortcut, as formulas over Links.',
      ),
    ],
    [
      T(
        'Route: the main route in order, with authored play, round trips, returns to earlier places and the ladder values in effect.',
      ),
    ],
    [T("Producers: each place's producer by level: rate, its own yard capacity, upgrade bill and when it is bought.")],
    [T("Storage: the Home Yard's levels.")],
    [T('Recipes: rail segments, spokes, sites, train upgrades, manual assists, abilities and cosmetic sinks.')],
    [
      T(
        'Flows: one row per route step and material: demand, automatic and hand rates, stock, waits and surplus sold. The engine room.',
      ),
    ],
    [
      T(
        'Pacing: hours to each milestone and the wallet, one block per party: 1, 2 and 3 players (owner, 6 November: tune for 1–3, tolerate 4). Change the counts on row 3.',
      ),
    ],
    [T('Endgame: the tier of goals after the ending, when everything is automated.')],
    [T("Crossover: when machines overtake hands for each tier, against each party's hands.")],
    [T('Summary: totals, milestones, the away credit, material use and the rising complexity of train upgrades.')],
    [],
    [T('Rules of the model', STYLE.bold)],
    [
      T(
        'The world is paused while nobody is in it. On the next join, each producer is credited H × (1 − e^(−away/H)) hours of output into its own yard, never past the yard (H = the away horizon).',
      ),
    ],
    [
      T(
        'A material needed before its producer runs is carried by hand from where it is found. After that it comes from shared stock, and hands carry each unit from the rack to the frame until the end-game cranes.',
      ),
    ],
    [
      T(
        "Shared stock accumulates while a step is played, up to the producer's yard plus the Home Yard bay. A full yard's surplus is sold to the town; the Bucks go into one shared wallet anyone may spend.",
      ),
    ],
    [
      T(
        'Automatic supply to the hub is the producer rate, limited by freight: trains × freight per train ÷ round trip, shared between remote producers.',
      ),
    ],
    [
      T(
        'Hand rate to the hub is one player harvesting a full carry and bringing it home, walking on the hub island and riding trains beyond it.',
      ),
    ],
    [
      T(
        'Players speed up hauling a lot, commuting a little and authored play barely. Waits for shared stock and the end-game goals do not shrink with more players.',
      ),
    ],
    [],
    [
      T(
        'Generated by dev/economy/build-model.ts from dev/economy/ring-data.ts. Regenerate after editing the data; edits made only in this file are not kept.',
        STYLE.note,
      ),
    ],
    [
      T(
        'Design brief: docs/brainstorms/ring-and-economy.md. Principles audit: docs/research/economy-principles-audit.md. Visual page: docs/world/ring-economy.html.',
        STYLE.note,
      ),
    ],
  ],
};

const sheets = [
  readme,
  settingsSheet,
  linksSheet,
  resourcesSheet,
  worldSheet,
  routeSheet,
  producersSheet,
  storageSheet,
  recipesSheet,
  flowsSheet,
  pacingSheet,
  endSheet,
  crossSheet,
  summarySheet,
];

// ---------- CSVs ----------
const csv = (rows: (string | number)[][]) =>
  rows
    .map((row) =>
      row
        .map((v) => {
          const s = typeof v === 'number' ? String(r1(v)) : v;
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n') + '\n';
const billCols = (b: Bill) => MATERIALS.map((m) => b[m] ?? 0);
const both = (['canopy', 'gorge'] as const).map((b) => simulate({ branchFirst: b }));
const csvs: Record<string, string> = {
  'settings.csv': csv([
    ['key', 'label', 'value', 'unit', 'note'],
    ...SETTINGS.map((s) => [s.key, s.label, s.value, s.unit, s.note]),
    ...LADDERS.map((l) => [`ladder.${l.key}`, l.label, l.steps.join(' / '), l.unit, l.note]),
  ]),
  'links.csv': csv([['id', 'from', 'to', 'km', 'note'], ...LINKS.map((l) => [l.id, l.from, l.to, l.km, l.note])]),
  'resources.csv': csv([
    [
      'id',
      'name',
      'tier',
      'source',
      'harvest_s_per_unit',
      'local_haul_m',
      'by_hand',
      'becomes_shared',
      'price_bucks',
      'note',
    ],
    ...RESOURCES.map((r) => [
      r.id,
      r.name,
      r.tier,
      r.source,
      r.harvestS,
      r.localM,
      r.manual,
      r.shared,
      PRICES[r.id],
      r.note,
    ]),
  ]),
  'world.csv': csv([
    [
      'slot',
      'name',
      'kind',
      'map_angle',
      'resources',
      'abilities',
      'own_spoke_at',
      'km_before_if_canopy_first',
      'km_after_spoke1',
      'km_after_close',
      'km_own_spoke',
      'note',
    ],
    ...PLACES.map((p) => {
      const km = placeKm(p.slot, 'canopy');
      return [
        p.slot,
        p.name,
        p.kind,
        p.angle ?? '',
        p.resources,
        p.abilities,
        p.ownSpoke,
        km.before,
        km.spoke1,
        km.closed,
        km.own,
        p.note,
      ];
    }),
  ]),
  'route.csv': csv([
    [
      'order',
      'key',
      'name',
      'slot',
      'activity_min_solo',
      'round_trips',
      'returns_to',
      'return_trips',
      'return_min',
      'note',
    ],
    ...ROUTE.map((r, k) => {
      const ret = RETURNS[r.key];
      return [
        k + 1,
        r.key,
        r.name,
        r.slot,
        r.activityMin,
        r.rides,
        ret?.slot ?? '',
        ret?.trips ?? 0,
        ret?.activityMin ?? 0,
        ret ? `${r.note}. Return: ${ret.note}` : r.note,
      ];
    }),
  ]),
  'producers.csv': csv([
    [
      'id',
      'makes',
      'place',
      'level',
      'rate_per_h',
      'yard_cap',
      ...MATERIALS,
      'at_if_first',
      'at_if_second',
      'look',
      'source',
    ],
    ...PRODUCERS.map((p) => [
      p.id,
      p.res,
      p.place,
      p.level,
      p.rate,
      p.cap,
      ...billCols(p.bill),
      p.first,
      p.second,
      p.look,
      p.source,
    ]),
  ]),
  'storage.csv': csv([
    ['id', 'place', 'level', 'bay_cap', 'bays', ...MATERIALS, 'at_if_first', 'at_if_second', 'look', 'source'],
    ...STORAGE.map((y) => [
      y.id,
      y.place,
      y.level,
      y.bay,
      y.bays,
      ...billCols(y.bill),
      y.first,
      y.second,
      y.look,
      y.source,
    ]),
  ]),
  'recipes.csv': csv([
    [
      'id',
      'name',
      'kind',
      'upgrade_kind',
      'required',
      'place',
      ...MATERIALS,
      'at_if_first',
      'at_if_second',
      'pick',
      'ladder',
      'effect',
      'source',
    ],
    ...RECIPES.map((r) => [
      r.id,
      r.name,
      r.kind,
      r.upgrade,
      r.required,
      r.place,
      ...billCols(r.bill),
      r.first,
      r.second,
      r.pick ?? '',
      r.ladder ?? '',
      r.effect,
      r.source,
    ]),
  ]),
  'goals.csv': csv([
    ['id', 'name', 'kind', ...MATERIALS, 'bucks', 'sets_rates', 'note'],
    ...GOALS.map((g) => [
      g.id,
      g.name,
      g.kind,
      ...billCols(g.bill),
      g.bucks,
      Object.entries(g.rates ?? {})
        .map(([m, v]) => `${m}=${v}`)
        .join(' '),
      g.note,
    ]),
  ]),
  'pacing.csv': csv([
    ['first_branch', 'players', 'order', 'key', 'place', 'start_h', 'end_h', 'wait_h', 'waiting_on', 'wallet'],
    ...both.flatMap((r) =>
      r.players.flatMap((n, b) =>
        r.steps.map((st) => {
          const pc = st.pace[b]!;
          return [r.first, n, st.order, st.key, st.place, pc.start, pc.end, pc.wait, pc.limiting, pc.wallet];
        }),
      ),
    ),
  ]),
  'endgame.csv': csv([
    ['first_branch', 'id', 'name', 'value_bucks', 'hours', 'hours_after_ending', 'wallet_after'],
    ...both.flatMap((r) => r.goals.map((g) => [r.first, g.id, g.name, g.value, g.hours, g.total, g.wallet])),
  ]),
  'crossover.csv': csv([
    [
      'first_branch',
      'players',
      'order',
      'key',
      'material',
      'start_h',
      'automatic_per_h',
      'one_player_by_hand_per_h',
      'group_by_hand_per_h',
    ],
    ...both.flatMap((r) =>
      r.players.flatMap((n, b) =>
        r.steps.flatMap((st) =>
          st.flows.map((f) => [
            r.first,
            n,
            st.order,
            st.key,
            f.material,
            st.pace[b]!.start,
            f.auto,
            f.manual,
            f.group[b]!,
          ]),
        ),
      ),
    ),
  ]),
};

// ---------- page data ----------
const pageRoute = (r: Result) => {
  const four = simulate({ branchFirst: r.first }, [4]);
  return {
    first: r.first,
    players: r.players,
    steps: r.steps.map((st) => ({
      key: st.key,
      name: st.name,
      place: st.place,
      t: st.pace.map((pc) => [r1(pc.start), r1(pc.end)]),
      wait: st.pace.map((pc) => r1(pc.wait * 60)),
      on: st.pace.map((pc) => pc.limiting),
      back: st.back.trips ? placeName(st.back.slot, r.first) : '',
    })),
    cross: Object.fromEntries(
      MATERIALS.filter((m) => m !== 'St' && m !== 'R').map((m) => [
        m,
        {
          pass: r.players.map((_, b) => r1(crossover(r, m, b))),
          series: r.steps.map((st) => {
            const f = st.flows.find((x) => x.material === m)!;
            return [r1(st.pace[0]!.start), Math.round(f.manual), Math.round(f.auto)];
          }),
        },
      ]),
    ),
    goals: r.goals.map((g) => ({ id: g.id, name: g.name, hours: r1(g.hours), total: r1(g.total) })),
    totals: {
      end: r.players.map((_, b) => r1(r.steps[N - 1]!.pace[b]!.end)),
      wait: r.players.map((_, b) => r1(r.steps.reduce((n, st) => n + st.pace[b]!.wait, 0) * 60)),
      wallet: r.players.map((_, b) => Math.round(r.steps[N - 1]!.pace[b]!.wallet)),
      act: r1(r.steps.reduce((n, st) => n + st.pace[0]!.act, 0) / 60),
      labour: r1(r.steps.reduce((n, st) => n + st.pace[0]!.labour, 0) / 60),
      travel: r1(r.steps.reduce((n, st) => n + st.pace[0]!.travel, 0) / 60),
      endgame: r1(r.goals.at(-1)!.total),
      four: r1(four.steps[N - 1]!.pace[0]!.end),
      fourWait: r1(four.steps.reduce((n, st) => n + st.pace[0]!.wait, 0) * 60),
    },
  };
};
const placeName = (slot: string, b: Branch) =>
  slot === 'b1'
    ? b === 'canopy'
      ? 'Canopy Town'
      : 'High Gorge'
    : slot === 'b2'
      ? b === 'canopy'
        ? 'High Gorge'
        : 'Canopy Town'
      : PLACES.find((p) => p.slot === slot)!.name;
const pageData = {
  generatedBy: 'dev/economy/build-model.ts',
  target: Number(set.targetHours),
  horizon: Number(set.awayHorizonHours),
  away: [0, 1, 2, 4, 8, 12, 22, 48, 72].map((t) => [t, r1(awayCredit(set, t))]),
  routes: both.map(pageRoute),
  resources: RESOURCES.map((r) => ({ id: r.id, name: r.name, tier: r.tier })),
};

// ---------- write ----------
const xlsx = workbook(sheets);
const page = readFileSync(PAGE, 'utf8');
const json = JSON.stringify(pageData);
const marker = /(<script type="application\/json" id="economy-data">)[\s\S]*?(<\/script>)/;
if (!marker.test(page)) throw new Error('ring-economy.html has no economy-data block');
const prettier = await import('prettier');
const nextPage = await prettier.format(page.replace(marker, `$1${json}$2`), {
  ...(await prettier.resolveConfig(PAGE)),
  filepath: PAGE,
});
if (bare) {
  mkdirSync(bare, { recursive: true });
  writeFileSync(join(bare, 'economy-model-bare.xlsx'), xlsx);
  writeFileSync(join(bare, 'expected.json'), JSON.stringify(res, null, 1));
  console.log(`wrote ${bare}/economy-model-bare.xlsx`);
} else if (check) {
  const stale: string[] = [];
  const same = (path: string, data: Buffer | string) => {
    try {
      if (!readFileSync(path).equals(Buffer.isBuffer(data) ? data : Buffer.from(data))) stale.push(path);
    } catch {
      stale.push(path);
    }
  };
  same(join(OUT, 'economy-model.xlsx'), xlsx);
  for (const [name, text] of Object.entries(csvs)) same(join(OUT, name), text);
  same(PAGE, nextPage);
  if (stale.length) throw new Error(`stale, run node dev/economy/build-model.ts:\n${stale.join('\n')}`);
  console.log('economy model outputs are current');
} else {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'economy-model.xlsx'), xlsx);
  for (const [name, text] of Object.entries(csvs)) writeFileSync(join(OUT, name), text);
  writeFileSync(PAGE, nextPage);
  const ends = res.players.map((n, b) => `${n}p ${lastStep.pace[b]!.end.toFixed(2)} h`).join(', ');
  console.log(`economy model: ${ends}, end-game ${res.goals.at(-1)!.total.toFixed(1)} h (first branch ${first})`);
}
