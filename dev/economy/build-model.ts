// Builds docs/economy/economy-model.xlsx (live formulas), the same data as CSVs, and the data block of
// docs/world/ring-economy.html. Cached values come from ring-sim.ts, which mirrors every formula.
//   node dev/economy/build-model.ts            write everything
//   node dev/economy/build-model.ts --check    fail if any committed output is stale
//   node dev/economy/build-model.ts --bare=DIR [--first=gorge]  a copy without cached values, to check the formulas in a spreadsheet app
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LADDERS,
  MATERIALS,
  PLACES,
  PRODUCERS,
  RECIPES,
  RESOURCES,
  RING,
  ROUTE,
  SETTINGS,
  STORAGE,
  type Bill,
  type Branch,
  type Material,
} from './ring-data.ts';
import { NEVER, crossover, milestoneOf, orderOf, simulate, slotOfSource } from './ring-sim.ts';
import { STYLE, colName, workbook, type Cell, type Sheet } from './xlsx.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/economy');
const PAGE = join(ROOT, 'docs/world/ring-economy.html');
const args = process.argv.slice(2);
const check = args.includes('--check');
const bare = args.find((a) => a.startsWith('--bare='))?.slice(7);

const firstArg = args.find((a) => a.startsWith('--first='))?.slice(8);
if (firstArg && !bare)
  throw new Error('--first only applies with --bare: the committed model starts from the data defaults');
const res = simulate(firstArg ? { branchFirst: firstArg } : {});
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

// ---------- Settings ----------
const SET_ROW0 = 4; // Excel row of the first setting
const setRef = (key: string) => {
  const k = SETTINGS.findIndex((s) => s.key === key);
  if (k < 0) throw new Error(key);
  return `Settings!$B$${SET_ROW0 + k}`;
};
const LAD_ROW0 = SET_ROW0 + SETTINGS.length + 2;
const ladderRange = (key: string) => {
  const k = LADDERS.findIndex((l) => l.key === key);
  return `Settings!$C$${LAD_ROW0 + k}:$F$${LAD_ROW0 + k}`;
};
const FIRST = setRef('branchFirst');
const S = (key: string) => setRef(key);

const settingsSheet: Sheet = {
  name: 'Settings',
  widths: [36, 12, 18, 60, 16],
  freeze: { row: 3, col: 0 },
  rows: [
    [T('Settings: edit the yellow cells', STYLE.title)],
    [T('Every other tab reads these. Change the first branch to "gorge" to play the other order.', STYLE.note)],
    [H('Setting'), H('Value'), H('Unit'), H('Note'), H('Key')],
    ...SETTINGS.map((s) => [
      T(s.label),
      I(res.settings[s.key]!),
      T(s.unit),
      T(s.note, STYLE.note),
      T(s.key, STYLE.note),
    ]),
    [],
    [H('Ladder'), H('Label'), H('Step 0'), H('Step 1'), H('Step 2'), H('Step 3'), H('Unit'), H('Note')],
    ...LADDERS.map((l) => [
      T(l.key),
      T(l.label),
      ...l.steps.map((n) => I(n)),
      T(l.unit),
      T(`${l.note}. Each recipe that names this ladder moves it one step.`, STYLE.note),
    ]),
  ],
};
settingsSheet.widths = [36, 22, 10, 10, 10, 10, 18, 60];

// ---------- column maps ----------
const COST0 = 6; // column G
const costCol = (m: Material) => colName(COST0 + MATERIALS.indexOf(m));
const billCells = (bill: Bill) => MATERIALS.map((m) => (bill[m] ? I(bill[m]!) : I(0)));
const milestoneF = (placeCol: string, r: number) =>
  `IF(AND(OR(${placeCol}${r}="canopy",${placeCol}${r}="gorge"),${placeCol}${r}<>${FIRST}),P${r},O${r})`;
const orderF = (r: number) => `IFERROR(MATCH(Q${r},Route!$A:$A,0)-1,${NEVER})`;
const totalF = (r: number) => `SUM(G${r}:N${r})`;
const distinctF = (r: number) => `COUNTIF(G${r}:N${r},">0")`;
const billTotal = (b: Bill) => MATERIALS.reduce((n, m) => n + (b[m] ?? 0), 0);
const billDistinct = (b: Bill) => MATERIALS.filter((m) => (b[m] ?? 0) > 0).length;
const costHeaders = MATERIALS.map((m) => H(m));

// ---------- Resources ----------
const resourcesSheet: Sheet = {
  name: 'Resources',
  widths: [6, 18, 6, 16, 12, 12, 12, 9, 36, 60, 16],
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
      ];
    }),
  ],
};

// ---------- World ----------
const spoke1Order = `(MATCH("spoke1",Route!$A:$A,0)-1)`;
const closeOrder = `(MATCH("ring.close",Route!$A:$A,0)-1)`;
const kmF = (slot: string, i: string) => {
  const at = (col: string) => `INDEX(World!$${col}:$${col},MATCH(${slot},World!$A:$A,0))`;
  return `MIN(IF(${spoke1Order}<${i},${at('I')},${at('H')}),IF(${closeOrder}<${i},${at('J')},${NEVER}),IF(${at('M')}<${i},${at('K')},${NEVER}))`;
};
const v0 = `INDEX(${ladderRange('speed')},1,1)`;
const rideF = (km: string, v: string, wait: string) =>
  `IF(${km}<${S('walkLimitKm')},${km}*1000/${S('walkMps')},${km}*1000/${v}+${v}/${S('accel')}+${S('dwellS')}+${wait})`;
const set = res.settings;
const rideTS = (km: number, v: number, wait: number) =>
  km < Number(set.walkLimitKm)
    ? (km * 1000) / Number(set.walkMps)
    : (km * 1000) / v + v / Number(set.accel) + Number(set.dwellS) + wait;
const placeKey = (slot: string, b: Branch) =>
  slot === 'b1' ? b : slot === 'b2' ? (b === 'canopy' ? 'gorge' : 'canopy') : slot.startsWith('stop') ? 'stops' : slot;
const billHere = (key: string) =>
  RECIPES.filter((r) => r.place === key && r.required === 'main').reduce((n, r) => n + billTotal(r.bill), 0);
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
      H('Ring angle°'),
      H('Resources'),
      H('Abilities and finds'),
      H('km to hub, ring open'),
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
      const longMin = rideTS(p.kmBefore, 20, Number(set.boardWaitS)) / 60;
      const ownMin = rideTS(p.kmOwnSpoke, 20, Number(set.boardWaitS)) / 60;
      return [
        T(p.slot, STYLE.bold),
        key,
        name,
        T(p.kind),
        p.angle === null ? T('') : T(String(p.angle)),
        T(p.resources),
        T(p.abilities),
        I(p.kmBefore),
        I(p.kmSpoke1),
        I(p.kmClosed),
        I(p.kmOwnSpoke),
        I(p.ownSpoke),
        F(`IFERROR(MATCH(L${row},Route!$A:$A,0)-1,${NEVER})`, orderOf(p.ownSpoke), STYLE.int),
        F(`${rideF(`H${row}`, v0, S('boardWaitS'))}/60`, r1(longMin)),
        F(`${rideF(`K${row}`, v0, S('boardWaitS'))}/60`, r1(ownMin)),
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
        `Ring radius ${RING.radiusKm} km (a one-minute crossing at 20 m/s); a quarter of the ring is ${RING.arcKm} km.`,
        STYLE.note,
      ),
    ],
  ],
};

// ---------- Route ----------
const routeSheet: Sheet = {
  name: 'Route',
  widths: [18, 44, 10, 22, 7, 10, 7, 9, 8, 8, 8, 8, 8, 10, 10, 40],
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
    ],
    ...res.steps.map((st, k) => {
      const row = k + 2;
      const r = ROUTE[k]!;
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
        F(kmF(`C${row}`, `E${row}`), st.km, STYLE.num),
        lad('speed', st.speed),
        lad('wagon', st.wagon),
        lad('trains', st.trains),
        lad('carry', st.carry),
        lad('tool', st.tool),
        F(rideF(`H${row}`, `I${row}`, S('boardWaitS')), r1(st.rideS)),
        F(remote, st.remote, STYLE.int),
        T(r.note, STYLE.note),
      ];
    }),
  ],
};

// ---------- Producers, Storage, Recipes ----------
const producersSheet: Sheet = {
  name: 'Producers',
  widths: [8, 5, 10, 6, 9, 8, ...MATERIALS.map(() => 5), 18, 18, 18, 7, 7, 8, 44, 56],
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
      const ms = milestoneOf(p, first);
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
        F(milestoneF('C', row), ms, STYLE.none),
        F(orderF(row), orderOf(ms), STYLE.int),
        F(totalF(row), billTotal(p.bill), STYLE.int),
        F(distinctF(row), billDistinct(p.bill), STYLE.int),
        T(p.look),
        T(p.source, STYLE.note),
      ];
    }),
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
      const ms = milestoneOf(y, first);
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
        F(milestoneF('B', row), ms, STYLE.none),
        F(orderF(row), orderOf(ms), STYLE.int),
        F(totalF(row), billTotal(y.bill), STYLE.int),
        F(distinctF(row), billDistinct(y.bill), STYLE.int),
        T(y.source, STYLE.note),
      ];
    }),
    [],
    [T('Each producer keeps its own yard; the Home Yard bay adds to it. A full yard pauses its producer.', STYLE.note)],
  ],
};
const recipesSheet: Sheet = {
  name: 'Recipes',
  widths: [8, 40, 8, 6, 9, 10, ...MATERIALS.map(() => 5), 18, 18, 18, 7, 7, 7, 8, 32, 40],
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
      H('At (first branch)'),
      H('At (second branch)'),
      H('Milestone'),
      H('Order'),
      H('Units'),
      H('Kinds'),
      H('Ladder'),
      H('Effect'),
      H('Source'),
    ],
    ...RECIPES.map((r, k) => {
      const row = k + 2;
      const ms = milestoneOf(r, first);
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
        F(milestoneF('F', row), ms, STYLE.none),
        F(orderF(row), orderOf(ms), STYLE.int),
        F(totalF(row), billTotal(r.bill), STYLE.int),
        F(distinctF(row), billDistinct(r.bill), STYLE.int),
        T(r.ladder ?? ''),
        T(r.effect),
        T(r.source, STYLE.note),
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

// ---------- Flows (one row per step and material) ----------
const P1 = 'Pacing!$B$3',
  P4 = 'Pacing!$D$3';
const flowRow = (i: number, mi: number) => 2 + (i - 1) * M + mi;
const pacRow = (i: number) => i + 4;
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
    H('By hand, crew/h'),
    H('Units by hand'),
    H('Units from stock'),
    H('Hand labour s (solo)'),
    H('Automatic ≥ one player?'),
    H('Stock at start (left)'),
    H('Supply wait h (left)'),
    H('Stock at end (left)'),
    H('Crossing hour (left)'),
    H('First crossing so far (left)'),
    H('Stock at start (right)'),
    H('Supply wait h (right)'),
    H('Stock at end (right)'),
    H('Crossing vs crew hour (right)'),
    H('First crossing vs crew (right)'),
  ],
];
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
    const prev = (col: string) => `${col}${r - M}`;
    const cross1 = f.ahead ? st.pace[0].start : NEVER;
    const cross4 = f.auto > 0 && f.auto >= f.crew ? st.pace[1].start : NEVER;
    const firstSoFar = (p: 0 | 1) => {
      let best = NEVER;
      for (const s2 of res.steps.slice(0, i)) {
        const g = s2.flows[mi]!;
        if (g.auto > 0 && g.auto >= (p ? g.crew : g.manual)) best = Math.min(best, s2.pace[p].start);
      }
      return best;
    };
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
      F(kmF(`H${r}`, `$A${r}`), f.km, STYLE.num),
      F(
        `IF(I${r}<${S('walkLimitKm')},1000000000,${route('J', r)}*${route('K', r)}*3600/(2*(I${r}*1000/${v}+${v}/${S('accel')}+${S('dwellS')})+2*${S('transferS')})/MAX(1,${route('O', r)}))`,
        r1(f.freight),
        STYLE.int,
      ),
      F(`MIN(F${r},J${r})`, r1(f.auto), STYLE.int),
      F(
        `IF(${manual}=0,0,${carry}*3600/(${harvest}*${tool}*${carry}+${S('pickupS')}+2*${rideF(`I${r}`, v, S('boardWaitS'))}))`,
        r1(f.manual),
        STYLE.int,
      ),
      F(`L${r}*(1+(${P4}-1)*${S('handParallel')})`, r1(f.crew), STYLE.int),
      F(`IF(K${r}=0,D${r},0)`, f.hand, STYLE.int),
      F(`D${r}-N${r}`, f.stock, STYLE.int),
      F(
        `N${r}*IF(${manual}=0,0,(${harvest}*${tool}*${carry}+${S('pickupS')}+2*${local}/${S('walkMps')})/${carry})+O${r}*${S('lastCarryS')}`,
        r1(f.labourS),
      ),
      F(`IF(AND(K${r}>0,K${r}>=L${r}),1,0)`, f.ahead ? 1 : 0, STYLE.int),
      F(i === 1 ? '0' : prev('T'), r1(f.start[0])),
      F(`IF(K${r}>0,MAX(0,(O${r}-R${r}-K${r}*${pac('H', r)})/K${r}),0)`, r1(f.wait[0]), STYLE.num),
      F(
        `MIN(G${r},MAX(0,R${r}+K${r}*${pac('J', r)}-O${r})+IF(${pac('M', r)}>0,${S('offlineFill')}*K${r}*MIN(${S('offlineCapHours')},${S('offlineGapHours')}),0))`,
        r1(f.end[0]),
      ),
      F(`IF(Q${r}=1,${pac('K', r)},${NEVER})`, r1(cross1), STYLE.num),
      F(i === 1 ? `U${r}` : `MIN(U${r},${prev('V')})`, r1(firstSoFar(0)), STYLE.num),
      F(i === 1 ? '0' : prev('Y'), r1(f.start[1])),
      F(`IF(K${r}>0,MAX(0,(O${r}-W${r}-K${r}*${pac('Q', r)})/K${r}),0)`, r1(f.wait[1]), STYLE.num),
      F(
        `MIN(G${r},MAX(0,W${r}+K${r}*${pac('S', r)}-O${r})+IF(${pac('V', r)}>0,${S('offlineFill')}*K${r}*MIN(${S('offlineCapHours')},${S('offlineGapHours')}),0))`,
        r1(f.end[1]),
      ),
      F(`IF(AND(K${r}>0,K${r}>=M${r}),${pac('T', r)},${NEVER})`, r1(cross4), STYLE.num),
      F(i === 1 ? `Z${r}` : `MIN(Z${r},${prev('AA')})`, r1(firstSoFar(1)), STYLE.num),
    ];
  });
});
const flowsSheet: Sheet = {
  name: 'Flows',
  rows: flowsRows,
  widths: [6, 18, 8, ...Array.from({ length: 24 }, () => 11)],
  freeze: { row: 1, col: 3 },
};

// ---------- Pacing ----------
const block = (i: number, col: string) => `Flows!$${col}$${flowRow(i, 0)}:$${col}$${flowRow(i, M - 1)}`;
const pacingRows: Cell[][] = [
  [T('Pacing: hours to each milestone', STYLE.title)],
  [
    T(
      'Left block = solo by default, right block = four friends. Hours are play time; supply wait is time spent waiting for shared stock.',
      STYLE.note,
    ),
  ],
  [T('Players (left)'), I(res.players[0]), T('Players (right)'), I(res.players[1])],
  [
    H('Order'),
    H('Key'),
    H('Step'),
    H('Place'),
    H('Play min'),
    H('Hand labour min'),
    H('Commute min'),
    H('Work h'),
    H('Supply wait h'),
    H('Step h'),
    H('Starts at h'),
    H('Ends at h'),
    H('Sittings crossed'),
    H('Play min'),
    H('Hand labour min'),
    H('Commute min'),
    H('Work h'),
    H('Supply wait h'),
    H('Step h'),
    H('Starts at h'),
    H('Ends at h'),
    H('Sittings crossed'),
    H('Waiting on (left)'),
    H('Waiting on (right)'),
  ],
];
res.steps.forEach((st, k) => {
  const i = k + 1,
    r = pacRow(i);
  const [a, b] = st.pace;
  const half = (p: 'B' | 'D', c: string[], pc: typeof a, waitCol: string) => {
    const pl = p === 'B' ? P1 : P4;
    const [act, lab, trv, work, wait, dur, start, end] = c as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    return [
      F(`INDEX(Route!$F:$F,$A${r}+1)/(1+(${pl}-1)*${S('activityParallel')})`, r1(pc.act)),
      F(`SUMIFS(Flows!$P:$P,Flows!$A:$A,$A${r})/60/(1+(${pl}-1)*${S('handParallel')})`, r1(pc.labour)),
      F(
        `INDEX(Route!$G:$G,$A${r}+1)*2*INDEX(Route!$N:$N,$A${r}+1)/60/(1+(${pl}-1)*${S('travelParallel')})`,
        r1(pc.travel),
      ),
      F(`(${act}${r}+${lab}${r}+${trv}${r})/60`, r1(pc.work), STYLE.num),
      F(`MAX(${block(i, waitCol)})`, r1(pc.wait), STYLE.num),
      F(`${work}${r}+${wait}${r}`, r1(pc.dur), STYLE.num),
      F(i === 1 ? '0' : `${end}${r - 1}`, r1(pc.start), STYLE.num),
      F(`${start}${r}+${dur}${r}`, r1(pc.end), STYLE.bold),
      F(`INT(${end}${r}/${S('sessionHours')})-INT(${start}${r}/${S('sessionHours')})`, pc.breaks, STYLE.int),
    ];
  };
  pacingRows.push([
    { v: i, s: STYLE.int },
    F(`INDEX(Route!$A:$A,$A${r}+1)`, st.key, STYLE.none),
    F(`INDEX(Route!$B:$B,$A${r}+1)`, st.name, STYLE.none),
    F(`INDEX(Route!$D:$D,$A${r}+1)`, st.place, STYLE.none),
    ...half('B', ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'], a, 'S'),
    ...half('D', ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'], b, 'X'),
    F(`IF(I${r}=0,"—",INDEX(${block(i, 'C')},MATCH(I${r},${block(i, 'S')},0)))`, a.limiting, STYLE.none),
    F(`IF(R${r}=0,"—",INDEX(${block(i, 'C')},MATCH(R${r},${block(i, 'X')},0)))`, b.limiting, STYLE.none),
  ]);
});
const lastPac = pacRow(N);
const sum = (p: 0 | 1, key: 'act' | 'labour' | 'travel' | 'wait') =>
  res.steps.reduce((n, st) => n + st.pace[p][key], 0);
pacingRows.push(
  [],
  [
    T('Total', STYLE.bold),
    T(''),
    T(''),
    T(''),
    F(`SUM(E5:E${lastPac})`, r1(sum(0, 'act'))),
    F(`SUM(F5:F${lastPac})`, r1(sum(0, 'labour'))),
    F(`SUM(G5:G${lastPac})`, r1(sum(0, 'travel'))),
    T(''),
    F(`SUM(I5:I${lastPac})`, r1(sum(0, 'wait'))),
    T(''),
    T(''),
    F(`L${lastPac}`, r1(res.steps[N - 1]!.pace[0].end), STYLE.bold),
    T(''),
    F(`SUM(N5:N${lastPac})`, r1(sum(1, 'act'))),
    F(`SUM(O5:O${lastPac})`, r1(sum(1, 'labour'))),
    F(`SUM(P5:P${lastPac})`, r1(sum(1, 'travel'))),
    T(''),
    F(`SUM(R5:R${lastPac})`, r1(sum(1, 'wait'))),
    T(''),
    T(''),
    F(`U${lastPac}`, r1(res.steps[N - 1]!.pace[1].end), STYLE.bold),
  ],
);
const pacingSheet: Sheet = {
  name: 'Pacing',
  rows: pacingRows,
  widths: [6, 18, 44, 20, ...Array.from({ length: 18 }, () => 9), 10, 10],
  freeze: { row: 4, col: 3 },
};

// ---------- Crossover ----------
const crossRows: Cell[][] = [
  [T('Hands versus machines, per tier', STYLE.title)],
  [
    T(
      'Each tier starts by hand. A producer starts slower than one player hauling, then its upgrades pass one player, then a crew. 999 = not in the main game.',
      STYLE.note,
    ),
  ],
  [
    H('Material'),
    H('Name'),
    H('Tier'),
    H('Producer level 1 at step'),
    H('Automatic starts at h (left)'),
    H('One player by hand then, /h'),
    H('Automatic level 1, /h'),
    H('Automatic passes one player at h (left)'),
    H('Automatic passes the crew at h (right)'),
    H('Automatic at the end, /h'),
    H('One player by hand at the end, /h'),
    H('Crew by hand at the end, /h'),
  ],
];
MATERIALS.forEach((m, mi) => {
  const r = crossRows.length + 1;
  const resource = RESOURCES.find((x) => x.id === m)!;
  const p1 = PRODUCERS.find((p) => p.res === m && p.level === 1);
  const l1 = p1 ? orderOf(milestoneOf(p1, first)) : 0;
  const at = (col: string, ord: string) => `INDEX(Flows!$${col}:$${col},2+(${ord}-1)*${M}+${mi})`;
  const stL1 = l1 && l1 < NEVER ? res.steps[l1 - 1]! : null;
  const end = res.steps[N - 1]!.flows[mi]!;
  crossRows.push([
    T(m, STYLE.bold),
    T(resource.name),
    T(String(resource.tier)),
    F(`SUMIFS(Producers!$R:$R,Producers!$B:$B,"${m}",Producers!$D:$D,1)`, l1, STYLE.int),
    F(`IF(OR(D${r}=0,D${r}>=${NEVER}),${NEVER},INDEX(Pacing!$K:$K,D${r}+4))`, stL1 ? r1(stL1.pace[0].start) : NEVER),
    F(`IF(OR(D${r}=0,D${r}>=${NEVER}),0,${at('L', `D${r}`)})`, stL1 ? r1(stL1.flows[mi]!.manual) : 0, STYLE.int),
    F(`IF(OR(D${r}=0,D${r}>=${NEVER}),0,${at('K', `D${r}`)})`, stL1 ? r1(stL1.flows[mi]!.auto) : 0, STYLE.int),
    F(`Flows!$V$${flowRow(N, mi)}`, r1(crossover(res, m, 0)), STYLE.bold),
    F(`Flows!$AA$${flowRow(N, mi)}`, r1(crossover(res, m, 1)), STYLE.bold),
    F(`Flows!$K$${flowRow(N, mi)}`, r1(end.auto), STYLE.int),
    F(`Flows!$L$${flowRow(N, mi)}`, r1(end.manual), STYLE.int),
    F(`Flows!$M$${flowRow(N, mi)}`, r1(end.crew), STYLE.int),
  ]);
});
crossRows.push(
  [],
  [
    T(
      'Manual assists (carry frame, fibre sling, proper axe, powered pick) raise the hand lines; spokes shorten them; producer, wagon and engine upgrades raise the automatic line.',
      STYLE.note,
    ),
  ],
);
const crossSheet: Sheet = {
  name: 'Crossover',
  rows: crossRows,
  widths: [9, 18, 6, 12, 14, 14, 14, 16, 16, 14, 14, 14],
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
const sumRows: Cell[][] = [
  [T('Summary', STYLE.title)],
  [
    T(
      'Everything here is a formula over the other tabs. Inputs are yellow on Settings, Resources, World, Route, Producers, Storage and Recipes.',
      STYLE.note,
    ),
  ],
  [H('Measure'), H('Left (solo)'), H('Right (four)'), H('Note')],
  [
    T('Hours to the ending'),
    F(`Pacing!$L$${lastPac}`, r1(res.steps[N - 1]!.pace[0].end), STYLE.bold),
    F(`Pacing!$U$${lastPac}`, r1(res.steps[N - 1]!.pace[1].end), STYLE.bold),
    F(`"Target "&${S('targetHours')}&" h"`, `Target ${set.targetHours} h`, STYLE.note),
  ],
  [
    T('Authored play, h'),
    F(`Pacing!$E$${lastPac + 2}/60`, r1(sum(0, 'act') / 60)),
    F(`Pacing!$N$${lastPac + 2}/60`, r1(sum(1, 'act') / 60)),
    T('Content that has to exist', STYLE.note),
  ],
  [
    T('Hand labour, h'),
    F(`Pacing!$F$${lastPac + 2}/60`, r1(sum(0, 'labour') / 60)),
    F(`Pacing!$O$${lastPac + 2}/60`, r1(sum(1, 'labour') / 60)),
    T('Chopping, carrying, placing', STYLE.note),
  ],
  [
    T('Commuting, h'),
    F(`Pacing!$G$${lastPac + 2}/60`, r1(sum(0, 'travel') / 60)),
    F(`Pacing!$P$${lastPac + 2}/60`, r1(sum(1, 'travel') / 60)),
    T('Spokes and faster engines shrink this', STYLE.note),
  ],
  [
    T('Waiting for shared stock, h'),
    F(`Pacing!$I$${lastPac + 2}`, r1(sum(0, 'wait'))),
    F(`Pacing!$R$${lastPac + 2}`, r1(sum(1, 'wait'))),
    T('Producer and storage upgrades shrink this', STYLE.note),
  ],
  [],
  [H('Milestone'), H('Ends at h (left)'), H('Ends at h (right)'), H('Step')],
  ...MILESTONES.map((key) => {
    const st = res.steps[orderOf(key) - 1]!;
    return [
      T(key, STYLE.bold),
      F(`INDEX(Pacing!$L:$L,MATCH("${key}",Pacing!$B:$B,0))`, r1(st.pace[0].end)),
      F(`INDEX(Pacing!$U:$U,MATCH("${key}",Pacing!$B:$B,0))`, r1(st.pace[1].end)),
      F(`INDEX(Pacing!$C:$C,MATCH("${key}",Pacing!$B:$B,0))`, st.name, STYLE.none),
    ];
  }),
  [],
  [H('Material'), H('Main-route units'), H('By hand'), H('From shared stock'), H('Share by hand')],
  ...MATERIALS.map((m, mi) => {
    const tot = (k: 'demand' | 'hand' | 'stock') => res.steps.reduce((n, st) => n + st.flows[mi]![k], 0);
    return [m, tot('demand'), tot('hand'), tot('stock')] as const;
  }).map(([m, d, h, s2]) => [
    T(m, STYLE.bold),
    F(`SUMIFS(Flows!$D:$D,Flows!$C:$C,"${m}")`, d, STYLE.int),
    F(`SUMIFS(Flows!$N:$N,Flows!$C:$C,"${m}")`, h, STYLE.int),
    F(`SUMIFS(Flows!$O:$O,Flows!$C:$C,"${m}")`, s2, STYLE.int),
    { f: '', v: d ? r1(h / d) : 0, s: STYLE.pct },
  ]),
  [],
  [H('Train upgrade'), H('Units'), H('Kinds of material'), H('Milestone'), H('Recipe')],
  ...TRAIN_IDS.map((id) => {
    const rec = RECIPES.find((r) => r.id === id)!;
    const at = (col: string) => `INDEX(Recipes!$${col}:$${col},MATCH("${id}",Recipes!$A:$A,0))`;
    return [
      T(id, STYLE.bold),
      F(at('S'), billTotal(rec.bill), STYLE.int),
      F(at('T'), billDistinct(rec.bill), STYLE.int),
      F(at('Q'), milestoneOf(rec, first), STYLE.none),
      F(at('B'), rec.name, STYLE.none),
    ];
  }),
];
// Share-by-hand formulas need their own row numbers.
sumRows.forEach((row, k) => {
  const cell = row[4];
  if (cell && typeof cell === 'object' && 'f' in cell && cell.f === '')
    row[4] = F(`IF(B${k + 1}=0,0,C${k + 1}/B${k + 1})`, cell.v as number, STYLE.pct);
});
const summarySheet: Sheet = { name: 'Summary', rows: sumRows, widths: [30, 16, 16, 18, 40] };

// ---------- Readme ----------
const readme: Sheet = {
  name: 'Readme',
  widths: [120],
  rows: [
    [T('Boogle ring economy model (proposed, 6 November 2026)', STYLE.title)],
    [
      T(
        'A paper model of the ring-and-hub world: what each place makes, how fast by hand and by machine, what it costs, and how long the main game takes for one player and for four.',
      ),
    ],
    [
      T(
        'Yellow cells are inputs. Everything else is a formula, so changing a rate, bill or setting updates every tab. Excel and Numbers recalculate on open.',
      ),
    ],
    [],
    [T('Tabs', STYLE.bold)],
    [
      T(
        'Settings: global numbers, the first branch (canopy or gorge) and the ladders that upgrades climb (train speed, freight, trains, hand carry, harvest speed).',
      ),
    ],
    [T('Resources: the materials by tier, how fast a person gathers each by hand, and when it becomes shared stock.')],
    [
      T(
        'World: the hub, the ring, its spokes and small stops; distances to the Home Yard before and after each shortcut.',
      ),
    ],
    [T('Route: the main route in order, with authored play minutes, round trips and the ladder values in effect.')],
    [T("Producers: each place's producer by level: rate, its own yard capacity, upgrade bill and when it is bought.")],
    [T("Storage: the Home Yard's levels (shared stock you can see).")],
    [T('Recipes: rail segments, spokes, sites, train upgrades, manual assists, abilities and optional sinks.')],
    [
      T(
        'Flows: one row per route step and material: demand, automatic and hand rates, stock and waits. The engine room.',
      ),
    ],
    [T('Pacing: hours to each milestone, solo (left) and four players (right). Change the player counts on row 3.')],
    [T('Crossover: when machines overtake hands for each tier, against one player and against the crew.')],
    [T('Summary: totals, milestones, material use and the rising complexity of train upgrades.')],
    [],
    [T('Rules of the model', STYLE.bold)],
    [
      T(
        'A material needed before its producer runs is carried by hand from where it is found. After that it comes from shared stock, and hands still carry each unit from the rack to the frame.',
      ),
    ],
    [
      T(
        "Shared stock accumulates while a step is played, up to the producer's yard plus the Home Yard bay. A full yard pauses its producer. Optional: producers fill their yards while everyone is away, up to a cap.",
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
        'Players speed up hauling a lot, commuting a little and authored play barely. Waits for shared stock do not shrink with more players.',
      ),
    ],
    [],
    [
      T(
        'Generated by dev/economy/build-model.ts from dev/economy/ring-data.ts. Regenerate after editing the data; edits made only in this file are not kept.',
        STYLE.note,
      ),
    ],
    [T('Design brief: docs/brainstorms/ring-and-economy.md. Visual page: docs/world/ring-economy.html.', STYLE.note)],
  ],
};

const sheets = [
  readme,
  settingsSheet,
  resourcesSheet,
  worldSheet,
  routeSheet,
  producersSheet,
  storageSheet,
  recipesSheet,
  flowsSheet,
  pacingSheet,
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
  'resources.csv': csv([
    ['id', 'name', 'tier', 'source', 'harvest_s_per_unit', 'local_haul_m', 'by_hand', 'becomes_shared', 'note'],
    ...RESOURCES.map((r) => [r.id, r.name, r.tier, r.source, r.harvestS, r.localM, r.manual, r.shared, r.note]),
  ]),
  'world.csv': csv([
    [
      'slot',
      'name',
      'kind',
      'ring_angle',
      'resources',
      'abilities',
      'km_before',
      'km_after_spoke1',
      'km_after_close',
      'km_own_spoke',
      'own_spoke_at',
      'note',
    ],
    ...PLACES.map((p) => [
      p.slot,
      p.name,
      p.kind,
      p.angle ?? '',
      p.resources,
      p.abilities,
      p.kmBefore,
      p.kmSpoke1,
      p.kmClosed,
      p.kmOwnSpoke,
      p.ownSpoke,
      p.note,
    ]),
  ]),
  'route.csv': csv([
    ['order', 'key', 'name', 'slot', 'activity_min_solo', 'round_trips', 'note'],
    ...ROUTE.map((r, k) => [k + 1, r.key, r.name, r.slot, r.activityMin, r.rides, r.note]),
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
      r.ladder ?? '',
      r.effect,
      r.source,
    ]),
  ]),
  'pacing.csv': csv([
    [
      'first_branch',
      'order',
      'key',
      'place',
      'solo_start_h',
      'solo_end_h',
      'solo_wait_h',
      'four_start_h',
      'four_end_h',
      'four_wait_h',
      'four_waiting_on',
    ],
    ...both.flatMap((r) =>
      r.steps.map((st) => [
        r.first,
        st.order,
        st.key,
        st.place,
        st.pace[0].start,
        st.pace[0].end,
        st.pace[0].wait,
        st.pace[1].start,
        st.pace[1].end,
        st.pace[1].wait,
        st.pace[1].limiting,
      ]),
    ),
  ]),
  'crossover.csv': csv([
    [
      'first_branch',
      'order',
      'key',
      'material',
      'solo_start_h',
      'automatic_per_h',
      'one_player_by_hand_per_h',
      'four_start_h',
      'crew_by_hand_per_h',
    ],
    ...both.flatMap((r) =>
      r.steps.flatMap((st) =>
        st.flows.map((f) => [
          r.first,
          st.order,
          st.key,
          f.material,
          st.pace[0].start,
          f.auto,
          f.manual,
          st.pace[1].start,
          f.crew,
        ]),
      ),
    ),
  ]),
};

// ---------- page data ----------
const pageData = {
  generatedBy: 'dev/economy/build-model.ts',
  ring: RING,
  target: Number(set.targetHours),
  places: PLACES.map((p) => ({
    slot: p.slot,
    name: p.name,
    kind: p.kind,
    angle: p.angle,
    resources: p.resources,
    abilities: p.abilities,
    ownSpoke: p.ownSpoke,
  })),
  routes: both.map((r) => ({
    first: r.first,
    steps: r.steps.map((st) => ({
      key: st.key,
      name: st.name,
      place: st.place,
      solo: [r1(st.pace[0].start), r1(st.pace[0].end)],
      four: [r1(st.pace[1].start), r1(st.pace[1].end)],
      wait4: r1(st.pace[1].wait * 60),
      on4: st.pace[1].limiting,
    })),
    cross: Object.fromEntries(
      MATERIALS.filter((m) => m !== 'St' && m !== 'R').map((m) => [
        m,
        {
          solo: r1(crossover(r, m, 0)),
          crew: r1(crossover(r, m, 1)),
          series: r.steps.map((st) => {
            const f = st.flows.find((x) => x.material === m)!;
            return [r1(st.pace[0].start), Math.round(f.manual), Math.round(f.auto)];
          }),
        },
      ]),
    ),
    totals: {
      solo: r1(r.steps[N - 1]!.pace[0].end),
      four: r1(r.steps[N - 1]!.pace[1].end),
      act: r1(r.steps.reduce((n, st) => n + st.pace[0].act, 0) / 60),
      labour: r1(r.steps.reduce((n, st) => n + st.pace[0].labour, 0) / 60),
      travel: r1(r.steps.reduce((n, st) => n + st.pace[0].travel, 0) / 60),
      wait: r1(r.steps.reduce((n, st) => n + st.pace[0].wait, 0)),
      wait4: r1(r.steps.reduce((n, st) => n + st.pace[1].wait, 0)),
    },
  })),
  resources: RESOURCES.map((r) => ({ id: r.id, name: r.name, tier: r.tier })),
  spokeSaves: PLACES.filter((p) => p.kind === 'branch' || p.slot === 'port').map((p) => ({
    slot: p.slot,
    longMin: r1(rideTS(p.kmBefore, 20, Number(set.boardWaitS)) / 60),
    spokeMin: r1(rideTS(p.kmOwnSpoke, 20, Number(set.boardWaitS)) / 60),
  })),
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
      const old = readFileSync(path);
      if (!old.equals(Buffer.isBuffer(data) ? data : Buffer.from(data))) stale.push(path);
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
  const sol = res.steps[N - 1]!.pace;
  console.log(
    `economy model: solo ${sol[0].end.toFixed(2)} h, four ${sol[1].end.toFixed(2)} h (first branch ${first})`,
  );
}
