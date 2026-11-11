// The trade economy page's drawing and controls (docs/world/trade-economy.html). build-trade-page.ts bundles this with
// trade-model.ts and trade-data.ts into the page; all the arithmetic is in the model, so the Node tests play the same code.
import { TUNABLES, defaultTunables, headline, playRooms, STAGES, type Headline, type RoomRun } from './trade-model.ts';
import type { RouteSpine } from './trade-route.ts';

const data = JSON.parse(document.getElementById('trade-data')!.textContent!) as { spine: RouteSpine };
const $ = (id: string) => document.getElementById(id)!;
const state = { players: 1, seed: 1, t: defaultTunables() };

const ROOM_COLOR: Record<string, string> = {
  never: 'var(--c-never)',
  houses: 'var(--c-houses)',
  sources: 'var(--c-sources)',
  boogleSeats: 'var(--c-boogle)',
};
const LETTER: Record<string, string> = { never: 'A', houses: 'B', sources: 'C', boogleSeats: 'D' };
const fmt = (n: number, d = 0) =>
  (Math.abs(n) < 0.5 * 10 ** -d ? 0 : n).toLocaleString('en-US', {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
const hrs = (h: number) => `${fmt(h, 2)} h`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

type Line = { ys: number[]; color: string; dash?: string; area?: boolean; label: string };
type ChartOpts = {
  lines: (r: RoomRun) => Line[];
  yMax: number;
  hMax: number;
  title: string;
};
function chart(r: RoomRun, o: ChartOpts) {
  const W = 330,
    H = 118,
    L = 38,
    R = 6,
    T = 8,
    B = 18;
  const x0 = r.tradeStartHour,
    x1 = o.hMax;
  const X = (h: number) => L + ((h - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => T + (1 - Math.min(1, v / o.yMax)) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title)}">`;
  for (let k = 0; k <= 2; k++) {
    const v = (o.yMax * k) / 2;
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="tick" x="${L - 4}" y="${Y(v) + 3}" text-anchor="end">${fmt(v)}</text>`;
  }
  for (let h = Math.ceil(x0); h <= x1; h++)
    s += `<text class="tick" x="${X(h)}" y="${H - 5}" text-anchor="middle">${h}</text>`;
  for (const st of r.stages.slice(1))
    s += `<line class="stage" x1="${X(st.startHour)}" x2="${X(st.startHour)}" y1="${T}" y2="${H - B}"/>`;
  // Hauling for seats: the route stands still for these minutes.
  const hs = r.series.hour;
  r.series.hauling.forEach((on, i) => {
    if (on)
      s += `<rect class="haul" x="${X(hs[i]!)}" y="${T}" width="${Math.max(0.6, X(hs[i]! + 1 / 60) - X(hs[i]!))}" height="${H - T - B}"/>`;
  });
  for (const ln of o.lines(r)) {
    const pts = ln.ys.map((v, i) => `${X(hs[i]!).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    if (ln.area)
      s += `<polygon fill="${ln.color}" opacity="0.14" points="${X(hs[0]!)},${Y(0)} ${pts} ${X(hs.at(-1)!)},${Y(0)}"/>`;
    s += `<polyline fill="none" stroke="${ln.color}" stroke-width="1.6" ${ln.dash ? `stroke-dasharray="${ln.dash}"` : ''} points="${pts}"/>`;
  }
  return `${s}</svg>`;
}

const CHARTS: { title: string; note: string; lines: (r: RoomRun) => Line[]; max: (runs: RoomRun[]) => number }[] = [
  {
    title: 'Strongbox: Boogles in it and its size',
    note: 'solid: Boogles held, dashed: what the box holds',
    lines: (r) => [
      { ys: r.series.cap, color: 'var(--ink-3)', dash: '4 3', label: 'box' },
      { ys: r.series.wallet, color: ROOM_COLOR[r.policy.id]!, area: true, label: 'held' },
    ],
    max: (rs) => Math.max(...rs.map((r) => Math.max(...r.series.cap))),
  },
  {
    title: 'Boogles a minute',
    note: 'what the riders pay a minute when the seats allow',
    lines: (r) => [{ ys: r.series.potential, color: ROOM_COLOR[r.policy.id]!, area: true, label: 'a minute' }],
    max: (rs) => Math.max(...rs.map((r) => Math.max(...r.series.potential))),
  },
  {
    title: 'Houses built and riders a minute',
    note: 'solid: riders a minute (both ways), dashed: houses and town buildings x 10',
    lines: (r) => [
      { ys: r.series.ridersRate, color: ROOM_COLOR[r.policy.id]!, label: 'riders' },
      { ys: r.series.houses.map((h) => h * 10), color: 'var(--ink-3)', dash: '4 3', label: 'houses' },
    ],
    max: (rs) => Math.max(...rs.map((r) => Math.max(...r.series.ridersRate, ...r.series.houses.map((h) => h * 10)))),
  },
  {
    title: 'Crowd on the platforms and seats',
    note: 'solid: riders waiting, dashed: seats on the lines; shaded: the route stands still while the room hauls for seats',
    lines: (r) => [
      { ys: r.series.seats, color: 'var(--ink-3)', dash: '4 3', label: 'seats' },
      { ys: r.series.crowd, color: ROOM_COLOR[r.policy.id]!, area: true, label: 'waiting' },
    ],
    max: (rs) => Math.max(...rs.map((r) => Math.max(...r.series.seats, ...r.series.crowd))),
  },
];

function panel(r: RoomRun, runs: RoomRun[], hMax: number, only?: number[]) {
  const h = headline(r);
  const body = CHARTS.map((c, i) =>
    only && !only.includes(i)
      ? ''
      : `<figure><figcaption>${esc(c.title)}<small>${esc(c.note)}</small></figcaption>${chart(r, { lines: c.lines, yMax: niceMax(c.max(runs)), hMax, title: c.title })}</figure>`,
  ).join('');
  return `<article class="room" style="--room:${ROOM_COLOR[r.policy.id]}"><h3><span class="tag">${LETTER[r.policy.id]}</span> ${esc(r.policy.label)}</h3><p class="big">${hrs(h.routeHours)}<small> to the end of the route (${h.deltaHours >= 0.005 ? '+' : ''}${fmt(h.deltaHours, 2)} h on ${hrs(r.baseRouteHours)})</small></p>${body}</article>`;
}
const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  return Math.ceil(v / p / 2) * 2 * p || 1;
};

const ROWS: [string, (h: Headline) => string, string?][] = [
  ['Route hours', (h) => hrs(h.routeHours), 'Hauling for seats stops the route; source upgrades shorten it'],
  ['Against the base route', (h) => `${h.deltaHours >= 0.0005 ? '+' : ''}${fmt(h.deltaHours, 2)} h`],
  ['Boogles earned (landed)', (h) => fmt(h.earned)],
  ['Boogles spent', (h) => fmt(h.spent)],
  ['Boogles capped (fares past a full box)', (h) => fmt(h.capped)],
  ['Box full, share of the route', (h) => `${fmt(h.boxFullPct)}%`],
  ['Houses and town buildings built', (h) => String(h.houses)],
  ['Boogle buys an hour', (h) => fmt(h.buysPerHour, 1), "About one every ten minutes was the brief's worry"],
  ['Mean minutes waited for a buy', (h) => fmt(h.meanWaitMin, 1)],
  ['Buys with a choice you could not afford both of', (h) => String(h.contestedBuys)],
  ['Share of the route with a crowd of four or more', (h) => `${fmt(h.crowdPct)}%`],
  [
    'Extra hauling for seats',
    (h) => `${fmt(h.seatHaulMin)} min = ${fmt(h.seatHaulPct, 1)}% of the route`,
    'Reported only: the 5% bound is not a rule (owner)',
  ],
  [
    'Route shortened by source upgrades',
    (h) => `${fmt(h.sourceSavedMin, 1)} min = ${fmt(h.sourceSavedPct, 1)}% of the route`,
    'Reported only: the 10% bound is not a rule (owner)',
  ],
  ['Income a minute at the end', (h) => fmt(h.endPerMin)],
  [
    'End-game goals (Boogle-priced) take after the route',
    (h) => (h.goalHours === null ? 'not bought' : hrs(h.goalHours)),
  ],
  ['A night away credits the next join', (h) => `${fmt(h.nightEarns)} (one capped sack)`],
];

function render() {
  const t = state.t;
  const runs = playRooms(data.spine, t, { players: state.players, seed: state.seed });
  const solo = playRooms(data.spine, t, { players: 1, seed: state.seed });
  const trio = playRooms(data.spine, t, { players: 3, seed: state.seed });
  const hMax = Math.ceil(Math.max(...runs.map((r) => r.routeHours)));
  const heads = runs.map(headline);
  $('headline').innerHTML =
    `<table><thead><tr><th></th>${runs.map((r) => `<th style="color:${ROOM_COLOR[r.policy.id]}">${LETTER[r.policy.id]}. ${esc(r.policy.label)}</th>`).join('')}</tr></thead><tbody>${ROWS.map(
      ([label, f, note]) =>
        `<tr><th scope="row">${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</th>${heads.map((h) => `<td>${f(h)}</td>`).join('')}</tr>`,
    ).join(
      '',
    )}<tr><th scope="row">Solo against three players, route hours<small>Existing gap between solo and three: 15%</small></th>${solo
      .map(
        (s, i) =>
          `<td>${hrs(s.routeHours)} / ${hrs(trio[i]!.routeHours)} = ${fmt((100 * (s.routeHours - trio[i]!.routeHours)) / s.routeHours, 1)}% less</td>`,
      )
      .join('')}</tr></tbody></table>`;
  const mats = runs
    .map(
      (r) =>
        `<td>${(['W', 'St', 'Fi', 'Cu'] as const).map((m) => `${m} ${fmt(r.ledger.materials[m])}`).join(', ')}</td>`,
    )
    .join('');
  $('headline')
    .querySelector('tbody')!
    .insertAdjacentHTML(
      'beforeend',
      `<tr><th scope="row">Materials hauled for seats<small>W logs, St steel, Fi fibre, Cu copper</small></th>${mats}</tr>`,
    );

  const [A, B, C, D] = runs as [RoomRun, RoomRun, RoomRun, RoomRun];
  $('both').innerHTML = [B, D].map((r) => panel(r, [B, D], hMax)).join('');
  $('rooms').innerHTML = [A, B, C, D].map((r) => panel(r, runs, hMax)).join('');
  $('stages').innerHTML = runs
    .map(
      (r) =>
        `<h3 style="color:${ROOM_COLOR[r.policy.id]}">${LETTER[r.policy.id]}. ${esc(r.policy.label)}</h3><table><thead><tr><th>Stage</th><th>Hours</th><th>Earned</th><th>Capped</th><th>Prices first on offer</th><th>Earned against prices</th><th>Income a minute at the end</th><th>Box holds</th><th>Houses</th></tr></thead><tbody>${r.stages
          .map(
            (s) =>
              `<tr><th scope="row">${esc(s.label)}</th><td>${fmt(s.startHour, 2)} to ${fmt(s.endHour, 2)}</td><td>${fmt(s.earned)}</td><td>${fmt(s.capped)}</td><td>${fmt(s.offered)}</td><td>${fmt(s.earned / Math.max(1, s.offered), 2)}x</td><td>${fmt(s.endIncomePerMin)}</td><td>${fmt(s.endBoxCap)}</td><td>${s.houses}</td></tr>`,
          )
          .join('')}</tbody></table>`,
    )
    .join('');
  $('buys').innerHTML = runs
    .filter((r) => r.buys.length)
    .map(
      (r) =>
        `<details><summary style="color:${ROOM_COLOR[r.policy.id]}">${LETTER[r.policy.id]}. ${esc(r.policy.label)}: ${r.buys.length} buys</summary><table><thead><tr><th>At</th><th>Bought</th><th>Price</th><th>Waited</th></tr></thead><tbody>${r.buys
          .map(
            (b) =>
              `<tr><td>${fmt((r.tradeStartHour * 60 + b.tick) / 60, 2)} h</td><td>${esc(b.label)}</td><td>${fmt(b.price)}</td><td>${fmt(b.waitMin)} min${b.contested ? ' (a choice)' : ''}</td></tr>`,
          )
          .join('')}</tbody></table></details>`,
    )
    .join('');
}

function tunableTable() {
  let group = '';
  let html = '';
  for (const r of TUNABLES) {
    if (r.group !== group) {
      group = r.group;
      html += `<tr class="grp"><th colspan="4">${esc(group)}</th></tr>`;
    }
    html += `<tr><th scope="row">${esc(r.label)}</th><td><input type="number" step="any" data-key="${r.key}" value="${r.value}" aria-label="${esc(r.label)}"></td><td>${esc(r.unit)}</td><td class="note">${esc(r.note)}</td></tr>`;
  }
  $('tunables').innerHTML = `<table><tbody>${html}</tbody></table>`;
}
let timer = 0;
$('tunables').addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  const v = Number(el.value);
  if (!el.dataset.key || !Number.isFinite(v)) return;
  state.t[el.dataset.key] = v;
  clearTimeout(timer);
  timer = window.setTimeout(render, 120);
});
$('reset').addEventListener('click', () => {
  state.t = defaultTunables();
  tunableTable();
  render();
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-players]'))
  b.addEventListener('click', () => {
    state.players = Number(b.dataset.players);
    for (const o of document.querySelectorAll<HTMLButtonElement>('[data-players]'))
      o.setAttribute('aria-pressed', String(o === b));
    render();
  });
($('seed') as HTMLInputElement).addEventListener('change', (e) => {
  state.seed = Number((e.target as HTMLInputElement).value) || 1;
  render();
});
$('stage-list').textContent = STAGES.map((s) => s.label).join(', ');
tunableTable();
render();
