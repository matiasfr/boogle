// The economy prototype page's controls and drawing (docs/world/economy-prototype.html). build-prototype.ts bundles
// this with play-sim.ts into the page; all game logic lives in play-sim.ts, so the Node test plays the same sim.
import { GOALS, MATERIALS, ROUTE, type Branch, type Material } from './ring-data.ts';
import {
  CHOICES,
  NAMES,
  USES,
  actDone,
  actionsFor,
  buyGoal,
  buyItem,
  choose,
  createWorld,
  goTo,
  leave,
  lineOpen,
  loadSize,
  need,
  placeName,
  placeOpen,
  playerPos,
  rates,
  route,
  seatBlockers,
  step,
  stepDone,
  summarize,
  tick,
  timelineCsv,
  townAt,
  townLabel,
  townPlace,
  type Policy,
  type RunSummary,
  type World,
  type XZ,
} from './play-sim.ts';
import { isCrowd, offered, seatBill, townNumbers, type SeatMode } from './play-trade.ts';
import { nextSeatStep } from './trade-model.ts';
import { TOWNS, type Town } from './trade-data.ts';
import type { PlayMap } from './play-map.ts';

type Reference = { runs: RunSummary[]; model: Record<string, number[]> };
type PageData = { map: PlayMap; reference: Reference };
const data = JSON.parse(document.getElementById('play-data')!.textContent!) as PageData;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const clock = (t: number) => {
  const m = Math.floor(t / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};
const PCOL = ['--p1', '--p2', '--p3'];
/** Sets markup only when it changed, so a button isn't replaced under a press. */
const html = (id: string, markup: string) => {
  const el = $(id);
  if (el.dataset.html !== markup) {
    el.innerHTML = markup;
    el.dataset.html = markup;
  }
};

// ---------------------------------------------------------------- setup
const setup = {
  players: 1,
  fork: '' as '' | Branch,
  policy: 'model' as Policy,
  watch: false,
  seats: 'haul' as SeatMode,
};
let speed = 60;
let paused = false;
let w: World = fresh();
let selected = 0;
function fresh(): World {
  return createWorld(data.map, {
    players: setup.players,
    policy: setup.policy,
    ...(setup.fork ? { branchFirst: setup.fork } : {}),
    auto: [setup.watch, true, true],
    // The page leaves the buying to you; with Watch the bots on, the bots buy the cheapest house, as the model's room.
    trade: { seats: setup.seats, autoBuy: setup.watch },
  });
}
function seg(id: string, on: (v: string) => void) {
  const el = $(id);
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    if (el.children.length === 1) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    else for (const c of el.children) c.setAttribute('aria-pressed', String(c === b));
    on(b.dataset.v ?? '');
  });
}
seg('players', (v) => (setup.players = Number(v)));
seg('fork', (v) => (setup.fork = v as '' | Branch));
seg('policy', (v) => (setup.policy = v as Policy));
seg('seats', (v) => (setup.seats = v as SeatMode));
seg('watch', () => {
  setup.watch = !setup.watch;
  const p = w.players[0];
  if (p) p.auto = setup.watch;
  w.tradeAutoBuy = setup.watch;
});
seg('speed', (v) => (speed = Number(v)));
$('new').addEventListener('click', () => {
  w = fresh();
  fx = [];
  fxMinute = 0;
  logShown = 0;
  html('log', '');
  toast('');
});
$('pause').addEventListener('click', () => setPaused(!paused));
$('leave').addEventListener('click', () => leaveNow());
const setPaused = (v: boolean) => {
  paused = v;
  $('pause').textContent = paused ? 'Play' : 'Pause';
};
function leaveNow() {
  leave(w, Number(w.s.awayHours));
  toast(`The world paused for ${w.s.awayHours} h; the yards got one away credit.`);
}
const toast = (t: string) => ($('toast').textContent = t);
const SPEEDS = [1, 10, 60, 300, 1200];
function setSpeed(k: number) {
  speed = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, SPEEDS.indexOf(speed) + k))]!;
  for (const c of $('speed').children)
    c.setAttribute('aria-pressed', String(Number((c as HTMLElement).dataset.v) === speed));
}

// ---------------------------------------------------------------- the map
const canvas = $<HTMLCanvasElement>('map');
const ctx = canvas.getContext('2d')!;
const walk = data.map.land.filter((l) => l.walk);
const pts = [...walk.flatMap((l) => l.outline), ...data.map.places.map((p) => p.at)];
const pad = 140;
const box = {
  x0: Math.min(...pts.map((p) => p[0])) - pad,
  x1: Math.max(...pts.map((p) => p[0])) + pad,
  z0: Math.min(...pts.map((p) => p[1])) - pad,
  z1: Math.max(...pts.map((p) => p[1])) + pad,
};
let view = { s: 1, ox: 0, oz: 0, w: 0, h: 0, dpr: 1 };
function fit() {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  const s = Math.min(r.width / (box.x1 - box.x0), r.height / (box.z1 - box.z0));
  view = {
    s,
    ox: (r.width - s * (box.x1 - box.x0)) / 2 - s * box.x0,
    oz: (r.height - s * (box.z1 - box.z0)) / 2 - s * box.z0,
    w: r.width,
    h: r.height,
    dpr,
  };
}
const toScreen = (p: XZ): [number, number] => [view.ox + p[0] * view.s, view.oz + p[1] * view.s];
window.addEventListener('resize', fit);
fit();
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left,
    y = e.clientY - r.top;
  let best: string | null = null,
    bestD = 34;
  for (const p of data.map.places) {
    const [px, py] = toScreen(p.at);
    // Reachable places win a close call: Home's cluster is tight on a phone.
    const d = Math.hypot(px - x, py - y) + (placeOpen(w, p.id) ? 0 : 14);
    if (d < bestD) [best, bestD] = [p.id, d];
  }
  if (best) {
    selected = data.map.places.findIndex((p) => p.id === best);
    go(best);
  }
});
function go(id: string) {
  if (w.players[0]!.auto) return toast('Player 1 is on the bot: turn off Watch the bots to steer.');
  const err = goTo(w, 0, id);
  toast(err ?? `Heading to ${placeName(w, id)}`);
}
// ---------------------------------------------------------------- the trade, drawn
// Little guys wait on a platform at each town (a dot each), a train carries them to Home when four or more wait (a
// moving block with its riders), and the fares drop into the box at the ticket window by Home. A coin is a prop: the
// number in the strongbox is the sim's, not the picture's.
type Fx = { tw: Town; n: number; born: number; life: number; pts: XZ[] };
let fx: Fx[] = [];
let fxMinute = 0;
const homeXZ = (): XZ => data.map.places.find((p) => p.id === data.map.slots.home!)!.at;
function along(pts: XZ[], f: number): XZ {
  let len = 0;
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
  for (const s of seg) len += s;
  let goal = Math.max(0, Math.min(1, f)) * len;
  for (let i = 0; i < seg.length; i++) {
    if (goal <= seg[i]! || i === seg.length - 1) {
      const k = seg[i]! ? Math.min(1, goal / seg[i]!) : 1;
      const a = pts[i]!,
        b = pts[i + 1]!;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    goal -= seg[i]!;
  }
  return pts[0]!;
}
function pathFor(tw: Town): XZ[] | null {
  const at = townAt(w, tw);
  const p = townPlace(w, tw);
  if (!at || !p) return null;
  if (tw === 'village') return [at, homeXZ()];
  return route(w, p, data.map.slots.home!)?.pts ?? [at, homeXZ()];
}
function spawnFx(now: number) {
  const tr = w.trade;
  if (!tr?.last) return;
  if (tr.minute < fxMinute) fxMinute = 0;
  if (tr.minute === fxMinute) return;
  fxMinute = tr.minute;
  for (const tw of TOWNS) {
    const m = tr.last.towns[tw];
    const pts = m && m.served > 0 ? pathFor(tw) : null;
    if (pts && fx.length < 80) fx.push({ tw, n: m!.served, born: now, life: 1700, pts });
  }
}
function drawTrade(now: number) {
  const tr = w.trade;
  if (!tr) return;
  const c = ctx;
  const [hx, hy] = toScreen(homeXZ());
  // The ticket window: a box by Home that fills with the strongbox.
  const bx = hx - 28,
    by = hy - 20,
    fill = tr.cap > 0 ? Math.min(1, tr.wallet / tr.cap) : 0;
  c.strokeStyle = css('--boogle');
  c.lineWidth = 1.5;
  c.strokeRect(bx, by, 12, 16);
  c.fillStyle = css(fill >= 1 ? '--crowd' : '--boogle');
  c.fillRect(bx + 1, by + 15 - 14 * fill, 10, 14 * fill);
  const small = view.w < 500;
  for (const tw of TOWNS) {
    const at = townAt(w, tw);
    if (!at) continue;
    const [x, y] = toScreen(at);
    const r = tr.rt[tw];
    if (tw === 'village') {
      c.fillStyle = css(r.open ? '--boogle' : '--ink-3');
      c.fillRect(x - 4, y - 4, 8, 8);
      c.fillStyle = css(r.open ? '--ink' : '--ink-3');
      c.font = `${small ? 10 : 12}px system-ui, sans-serif`;
      c.textAlign = 'right';
      c.fillText(r.open ? 'The Village' : 'The Village (no line yet)', x - 7, y - 9);
      c.textAlign = 'left';
    }
    if (!r.open) continue;
    // Cottages: filled stand, outlined build, dashed plots still empty ground.
    const plots = tr.items.filter((it) => it.kind === 'house' && it.town === tw).length;
    const standing = (tr.t['riders.startBuildings'] ?? 0) + r.houses;
    for (let i = 0; i < standing + plots; i++) {
      const cx = x - 6 + i * 7,
        cy = y + 12;
      if (i < standing) {
        c.fillStyle = css('--ink');
        c.fillRect(cx, cy, 5, 5);
      } else {
        c.strokeStyle = css(i < standing + r.due.length ? '--boogle' : '--ink-3');
        c.lineWidth = 1.2;
        c.setLineDash(i < standing + r.due.length ? [] : [2, 2]);
        c.strokeRect(cx + 0.5, cy + 0.5, 4, 4);
        c.setLineDash([]);
      }
    }
    // The platform: a dot for each little guy waiting; four or more stop a train.
    const n = Math.min(r.waiting, 24);
    const stop = isCrowd(tr, tw);
    for (let i = 0; i < n; i++) {
      c.beginPath();
      c.arc(x + 12 + (i % 12) * 6, y + 3 + Math.floor(i / 12) * 7, 2.5, 0, Math.PI * 2);
      c.fillStyle = css(stop ? '--crowd' : '--ink-2');
      c.fill();
    }
    if (stop) {
      c.beginPath();
      c.arc(x, y, 12 + 2 * Math.sin(now / 160), 0, Math.PI * 2);
      c.strokeStyle = css('--crowd');
      c.lineWidth = 2;
      c.stroke();
    }
  }
  // Trains on their way to Home with what they carry, then the fares dropping into the box.
  fx = fx.filter((f) => now - f.born < f.life + 900);
  for (const f of fx) {
    const age = now - f.born;
    if (age < f.life) {
      const [x, y] = toScreen(along(f.pts, age / f.life));
      c.fillStyle = css('--auto');
      c.beginPath();
      c.roundRect(x - 9, y - 6, 18, 12, 3);
      c.fill();
      c.fillStyle = '#fff';
      c.font = 'bold 9px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText(String(f.n), x, y + 0.5);
      c.textAlign = 'left';
    } else {
      const k = (age - f.life) / 900;
      c.globalAlpha = 1 - k;
      for (let i = 0; i < Math.min(3, 1 + Math.floor(f.n / 3)); i++) {
        c.beginPath();
        c.arc(bx + 6 + (i - 1) * 5, by - 4 - 16 * k - i * 2, 3, 0, Math.PI * 2);
        c.fillStyle = css('--boogle');
        c.fill();
      }
      c.globalAlpha = 1;
    }
  }
}
function draw(now = performance.now()) {
  const c = ctx;
  c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  c.fillStyle = css('--sea');
  c.fillRect(0, 0, view.w, view.h);
  const poly = (outline: XZ[]) => {
    c.beginPath();
    outline.forEach((p, i) => (i ? c.lineTo(...toScreen(p)) : c.moveTo(...toScreen(p))));
    c.closePath();
  };
  for (const l of data.map.land) {
    poly(l.outline);
    c.fillStyle = css(l.walk ? '--land' : '--backdrop');
    c.fill();
  }
  // Lines: open ones solid, the rest faint and dashed.
  for (const l of data.map.lines) {
    const open = lineOpen(w, l);
    c.beginPath();
    l.pts.forEach((p, i) => (i ? c.lineTo(...toScreen(p)) : c.moveTo(...toScreen(p))));
    c.setLineDash(open ? [] : [5, 5]);
    c.strokeStyle = css(open ? '--rail' : '--future');
    c.lineWidth = open ? 2.5 : 1.5;
    c.stroke();
  }
  c.setLineDash([]);
  const st = step(w);
  const font = view.w < 500 ? 10 : 12;
  c.font = `${font}px system-ui, sans-serif`;
  c.textBaseline = 'middle';
  data.map.places.forEach((p, i) => {
    const [x, y] = toScreen(p.at);
    const open = placeOpen(w, p.id);
    const site = st?.place === p.id;
    c.beginPath();
    c.arc(x, y, p.minor ? 3.5 : 5.5, 0, Math.PI * 2);
    c.fillStyle = css(open ? '--ink' : '--ink-3');
    c.fill();
    if (site) {
      c.beginPath();
      c.arc(x, y, 11, 0, Math.PI * 2);
      c.strokeStyle = css('--hand');
      c.lineWidth = 2;
      c.stroke();
    }
    if (i === selected && !w.players[0]!.auto) {
      c.beginPath();
      c.arc(x, y, 15, 0, Math.PI * 2);
      c.strokeStyle = css('--auto');
      c.setLineDash([3, 3]);
      c.stroke();
      c.setLineDash([]);
    }
    if (p.minor && view.w < 500 && !site) return;
    c.fillStyle = css(open ? '--ink' : '--ink-3');
    // Keep labels on the canvas: flip to the left of the dot near the right edge.
    const right = x + 9 + c.measureText(p.name).width > view.w - 4;
    c.textAlign = right ? 'right' : 'left';
    c.fillText(p.name, right ? x - 9 : x + 9, y - 9);
    c.textAlign = 'left';
  });
  drawTrade(now);
  for (const p of [...w.players].reverse()) {
    const [x, y] = toScreen(playerPos(w, p));
    c.beginPath();
    c.arc(x, y, 8, 0, Math.PI * 2);
    c.fillStyle = css(PCOL[p.id]!);
    c.fill();
    c.strokeStyle = css('--surface');
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.font = `bold 10px system-ui, sans-serif`;
    c.fillText(String(p.id + 1), x, y + 0.5);
    if (p.load) {
      c.fillStyle = css('--hand');
      c.fillRect(x + 6, y - 13, 7, 7);
    }
    c.textAlign = 'left';
    c.font = `${font}px system-ui, sans-serif`;
  }
  $('maphint').textContent = w.players[0]!.auto
    ? 'Watching the bots'
    : `Selected: ${data.map.places[selected]!.name} (Enter to go)`;
}

// ---------------------------------------------------------------- panels
let logShown = 0;
let actionList: { label: string; run: () => void }[] = [];
const fmt = (n: number) => (n >= 1e6 ? '∞' : Math.round(n).toLocaleString('en'));
function panels() {
  const st = step(w);
  const r = rates(w);
  $('clock').textContent = `${clock(w.t)} of play`;
  $('sitting').textContent = w.sittings
    ? `Sitting ${w.sitting}: ${clock(Math.max(0, Number(w.s.sessionHours) * 3600 - w.sittingT))} left`
    : '';
  $('k-wallet').textContent = fmt(w.wallet);
  $('k-step').textContent = w.mainDoneAt === null ? `${w.cur + 1} / ${w.route.length}` : 'Ending';
  $('k-load').textContent = String(loadSize(w));
  if (st) {
    $('step-name').textContent = `${st.name} · ${placeName(w, st.place)}`;
    $('step-note').textContent = `Model note: ${st.act.what}`;
    const act = (a: typeof st.act, label: string) =>
      `<div style="font-size:13px">${label}: ${esc(placeName(w, a.place))}, ${Math.round(a.doneS / 60)} of ${Math.round(a.needS / 60)} min${actDone(a) ? ' ✓' : ''}</div><div class="meter"><i style="width:${(100 * a.doneS) / Math.max(1, a.needS)}%"></i></div>`;
    html('step-act', act(st.act, 'Explore') + (st.back ? act(st.back, `Return (${st.back.what})`) : ''));
    html(
      'jobs',
      st.jobs
        .map((j) => {
          const mats = Object.entries(j.bill)
            .map(
              ([m, n]) =>
                `<span>${esc(NAMES[m as keyof typeof NAMES])} ${Math.round(j.got[m as keyof typeof j.got] ?? 0)}/${n}</span>`,
            )
            .join('');
          return `<li class="${j.done ? 'done' : ''}">${j.done ? '✓ ' : ''}${esc(j.name)}<div class="mats">${mats || '<span>no materials</span>'}</div></li>`;
        })
        .join(''),
    );
  } else {
    $('step-name').textContent = w.pending
      ? 'Waiting on your choice'
      : w.done
        ? 'Every end-game goal bought'
        : 'After the ending: the end-game tier';
    $('step-note').textContent = w.pending
      ? 'The world is paused until you pick.'
      : 'Producers now feed the next goal; the wallet pays for it.';
    html('step-act', '');
    html('jobs', '');
  }
  // You.
  const me = w.players[0]!;
  $('you').textContent =
    `At ${placeName(w, me.at)}. ${me.doing}${me.load ? ` · carrying ${me.load.n} ${NAMES[me.load.m]}` : ''}`;
  actionList = me.auto ? [] : actionsFor(w, 0);
  html(
    'actions',
    actionList.map((a, i) => `<button class="btn" data-i="${i}"><kbd>${i + 1}</kbd> ${esc(a.label)}</button>`).join(''),
  );
  // Party.
  html(
    'party',
    w.players
      .map((p) => {
        const tot = USES.reduce((t, u) => t + p.time[u], 0) || 1;
        const bar = USES.map(
          (u) => `<i style="width:${(100 * p.time[u]) / tot}%;background:var(--${u === 'haul' ? 'hand' : u})"></i>`,
        ).join('');
        const txt = USES.map(
          (u) => `${u === 'haul' ? 'hauling' : u === 'explore' ? 'exploring' : 'waiting'} ${clock(p.time[u])}`,
        ).join(' · ');
        return `<div class="who"><span class="dot" style="background:var(${PCOL[p.id]})">${p.id + 1}</span><span>${esc(p.doing)}</span><span></span><span><span class="split">${bar}</span><small style="color:var(--ink-2)">${txt}${p.auto ? ' · bot' : ' · you'}</small></span></div>`;
      })
      .join(''),
  );
  // Producers.
  const cross = new Map(
    w.events.filter((e) => e.kind === 'crossover').map((e) => [e.text.split(': ')[1]!.split(',')[0]!, e.t]),
  );
  html(
    'producers',
    '<tr><th>Material</th><th class="num">Level</th><th class="num">Machine /h</th><th class="num">Freight cap /h</th><th class="num">Hands /h</th><th class="num">Yard</th><th class="num">Needed now</th><th>Overtook hands</th></tr>' +
      MATERIALS.map((m) => {
        const ahead = r.auto[m] > 0 && r.party[m] > 0 && r.auto[m] >= r.party[m];
        const c = cross.get(NAMES[m]);
        return `<tr class="${ahead ? 'ahead' : ''}"><td>${esc(NAMES[m])}</td><td class="num">${r.level[m] || '—'}</td><td class="num">${r.auto[m] ? fmt(r.auto[m]) : '—'}</td><td class="num">${r.level[m] ? fmt(r.freight[m]) : '—'}</td><td class="num">${r.party[m] ? fmt(r.party[m]) : 'machines only'}</td><td class="num">${Math.floor(w.yard[m])} / ${fmt(r.cap[m])}</td><td class="num">${Math.round(need(w, m)) || ''}</td><td>${c !== undefined ? clock(c) : ''}</td></tr>`;
      }).join(''),
  );
  // Log.
  const log = $('log');
  for (; logShown < w.events.length; logShown++) {
    const e = w.events[logShown]!;
    if (e.kind === 'built') continue;
    const li = document.createElement('li');
    li.className = e.kind;
    li.innerHTML = `<b>${clock(e.t)}</b>${esc(e.text)}`;
    log.prepend(li);
  }
  tradePanel();
  goals();
  timeline();
  modal();
}
const STEP_NAME = {
  six: 'Six fit-out (more seats a car)',
  car: 'Second passenger car',
  express: "The express's passenger set",
};
function tradePanel() {
  const tr = w.trade;
  if (!tr) return;
  const done = stepDone(w);
  const line2 = ROUTE.find((r) => r.key === 'home.line2')?.name ?? 'Line 2';
  $('trade-wait').textContent = tr.started
    ? `Minute ${tr.minute} of riding. ${tr.seats === 'haul' ? 'Seats are hauled for: no Boogle is spent on them.' : 'Seats are bought with Boogles: the variant to compare.'}`
    : `The line to the Village opens when the step "${line2}" is done; then the first riders come.`;
  $('t-wallet').textContent = Math.round(tr.wallet).toLocaleString('en');
  $('t-cap').textContent = tr.started ? `of ${Math.round(tr.cap).toLocaleString('en')} (the box's mark)` : '';
  const full = tr.started && tr.wallet >= tr.cap - 1e-6;
  $('t-fill').style.width = `${tr.cap > 0 ? Math.min(100, (100 * tr.wallet) / tr.cap) : 0}%`;
  $('t-meter').classList.toggle('full', full);
  const last = tr.last;
  $('t-flow').textContent = !last
    ? ''
    : full
      ? `Box full: fares stop landing. ${Math.round(tr.capped).toLocaleString('en')} Boogles of fares have been lost so far.`
      : `+${Math.round(last.landed)} last minute from ${last.carried} riders. ${Math.round(tr.earned).toLocaleString('en')} earned, ${Math.round(tr.spent).toLocaleString('en')} spent.`;
  const rows = TOWNS.filter((tw) => tr.rt[tw].open).map((tw) => {
    const r = tr.rt[tw];
    const nums = townNumbers(tr, tw);
    const stop = isCrowd(tr, tw);
    const dots = '●'.repeat(Math.min(r.waiting, 24));
    const house = offered(tr, done).find((it) => it.kind === 'house' && it.town === tw);
    const houseBtn = house
      ? `<button class="btn" data-buy="${house.id}" ${tr.wallet >= house.price ? '' : 'disabled'}>${tw === 'village' && house.id.endsWith('.1') ? "Build the third cottage's house" : 'Build a house'}: ${house.price.toLocaleString('en')} Boogles</button>`
      : `<small>No more house plots on offer here yet.</small>`;
    let seat: string;
    const next = nextSeatStep(tw, r);
    if (!next) seat = 'All seats built.';
    else if (tr.seats === 'haul') {
      const j = tr.job;
      if (j && j.town === tw) {
        const parts = (Object.keys(j.bill) as Material[]).map(
          (m) => `${NAMES[m]} ${Math.floor(j.got[m] ?? 0)}/${j.bill[m]}`,
        );
        const blocked = seatBlockers(w);
        seat = `Hauling for ${STEP_NAME[j.step]}: ${parts.join(', ')}. Bring it to Home; the seats go in when the bill is stacked.${blocked.length ? ` <b>Waiting on ${blocked.map((m) => NAMES[m]).join(', ')}: its source is not on the line yet.</b>` : ''}`;
      } else {
        const b = seatBill(tr, tw, next);
        seat = `Next seats: ${STEP_NAME[next]}, ${Object.entries(b)
          .map(([m, n]) => `${n} ${NAMES[m as Material]}`)
          .join(', ')} hauled${stop ? ' (another town is being served first)' : ' once a crowd of four waits'}.`;
      }
    } else {
      const it = tr.items.find((x) => x.id === `seat.${tw}.${next}`);
      seat = it
        ? `<button class="btn" data-buy="${it.id}" ${stop && tr.wallet >= it.price ? '' : 'disabled'}>${STEP_NAME[next]}: ${it.price.toLocaleString('en')} Boogles</button> ${stop ? '' : '<small>(for a crowd of four or more)</small>'}`
        : '';
    }
    return `<div class="town${stop ? ' crowd' : ''}"><div class="head"><b>${esc(townLabel(w, tw).replace(/^./, (c) => c.toUpperCase()))}</b><small>${nums.riders.toFixed(1)} riders a minute each way · ${nums.seats} seats · fare ${nums.fare} · ${r.houses} bought house${r.houses === 1 ? '' : 's'}${nums.building ? ` · ${nums.building} going up` : ''}</small></div><div class="riders">${dots || '<small>nobody waiting</small>'} <span>${r.waiting} waiting${stop ? ': the train stops' : ''}</span></div><div class="buys">${houseBtn}</div><div class="seat">${seat}</div></div>`;
  });
  html('towns', rows.join(''));
}
$('towns').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-buy]');
  if (b) toast(buyItem(w, b.dataset.buy!) ?? 'Bought.');
});
function goals() {
  html(
    'goals',
    GOALS.map((g, i) => {
      const state = i < w.goal ? '✓ bought' : i === w.goal && w.mainDoneAt !== null ? 'next' : '';
      const bill = Object.entries(g.bill)
        .map(([m, n]) => `${n} ${NAMES[m as keyof typeof NAMES]}`)
        .join(', ');
      const buy =
        i === w.goal && w.mainDoneAt !== null && !w.players[0]!.auto
          ? ` <button class="btn" data-goal="1">Spend ${g.bucks.toLocaleString('en')} Bucks</button>`
          : '';
      return `<div style="font-size:13px;padding:3px 0;border-bottom:1px solid var(--line)">${esc(g.name)}: ${esc(bill || 'no materials')} + ${g.bucks.toLocaleString('en')} Bucks <b>${state}</b>${buy}</div>`;
    }).join(''),
  );
}
$('goals').addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('[data-goal]')) return;
  toast(buyGoal(w) ?? 'Bought.');
});
$('actions').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
  if (b) actionList[Number(b.dataset.i)]?.run();
});
function timeline() {
  const svg = $('timeline');
  const end = Math.max(3600, w.t);
  const H = 150,
    W = 600;
  const lanes = w.players.length;
  const laneH = (H - 10) / lanes;
  let out = '';
  w.players.forEach((p, k) => {
    const y0 = 5 + k * laneH;
    // Stacked area of the running split as shares of time so far.
    const pts = w.samples.map((s) => {
      const u = s.use[k]!;
      const tot = u.reduce((a, b) => a + b, 0) || 1;
      return { x: (s.t / end) * W, h: u[0]! / tot, e: u[1]! / tot };
    });
    if (pts.length > 1) {
      const area = (lo: (q: (typeof pts)[number]) => number, hi: (q: (typeof pts)[number]) => number, col: string) =>
        `<path fill="var(${col})" d="M${pts.map((q) => `${q.x.toFixed(1)},${(y0 + laneH * (1 - hi(q))).toFixed(1)}`).join('L')}L${[
          ...pts,
        ]
          .reverse()
          .map((q) => `${q.x.toFixed(1)},${(y0 + laneH * (1 - lo(q))).toFixed(1)}`)
          .join('L')}Z"/>`;
      out += area(
        () => 0,
        (q) => q.h,
        '--hand',
      );
      out += area(
        (q) => q.h,
        (q) => q.h + q.e,
        '--explore',
      );
      out += area(
        (q) => q.h + q.e,
        () => 1,
        '--wait',
      );
    }
    out += `<text x="4" y="${y0 + 12}" font-size="11" fill="#fff">P${p.id + 1}</text>`;
  });
  for (const s of w.steps)
    if (s?.doneAt) out += `<circle cx="${((s.doneAt / end) * W).toFixed(1)}" cy="${H - 3}" r="2.5" fill="var(--ink)"/>`;
  svg.innerHTML = out;
}
function modal() {
  const el = $('modal');
  if (!w.pending) {
    el.classList.remove('open');
    return;
  }
  if (el.classList.contains('open')) return;
  const c = CHOICES[w.pending];
  $('modal-title').textContent = c.label;
  $('modal-text').textContent =
    w.pending === 'branchFirst'
      ? 'Both work with steel and footings. The other branch comes later, before High Port.'
      : 'The other upgrade comes at High Port.';
  html(
    'modal-actions',
    c.options
      .map((o, i) => `<button class="btn${i ? '' : ' primary'}" data-o="${o}">${esc(c.names[i]!)}</button>`)
      .join(''),
  );
  el.classList.add('open');
}
$('modal-actions').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-o]');
  if (b && w.pending) choose(w, w.pending, b.dataset.o!);
  $('modal').classList.remove('open');
});

// ---------------------------------------------------------------- keys
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
  const n = data.map.places.length;
  if (e.key === ' ') setPaused(!paused);
  else if (e.key === '[') setSpeed(-1);
  else if (e.key === ']') setSpeed(1);
  else if (e.key === 'l' || e.key === 'L') leaveNow();
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') selected = (selected + 1) % n;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') selected = (selected - 1 + n) % n;
  else if (e.key === 'Enter') go(data.map.places[selected]!.id);
  else if (/^[1-9]$/.test(e.key)) actionList[Number(e.key) - 1]?.run();
  else return;
  e.preventDefault();
});

// ---------------------------------------------------------------- export
function download(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('csv').addEventListener('click', () => download(`economy-timeline-${w.n}p.csv`, timelineCsv(w), 'text/csv'));
$('json').addEventListener('click', () =>
  download(
    `economy-run-${w.n}p.json`,
    JSON.stringify({ summary: summarize(w), events: w.events, samples: w.samples }, null, 1),
    'application/json',
  ),
);

// ---------------------------------------------------------------- reference table
{
  const h = (x: number) => x.toFixed(2);
  const rows = data.reference.runs.map((s) => {
    const split = s.use.map((u, i) => `P${i + 1} ${h(u.haul)} / ${h(u.explore)} / ${h(u.wait)}`).join('<br>');
    const model = data.reference.model[s.branchFirst]?.[s.players - 1];
    return `<tr><td>${s.players}</td><td>${s.branchFirst === 'gorge' ? 'High Gorge' : 'Canopy Town'}</td><td>${s.policy === 'model' ? 'model rule' : 'when faster'}</td><td class="num">${h(s.mainH)}</td><td class="num">${model !== undefined ? h(model) : ''}</td><td class="num">${s.endH !== null ? h(s.endH) : ''}</td><td>${split}</td><td>${s.crossovers.map((c) => `${c.m} ${h(c.h)}`).join(', ')}</td></tr>`;
  });
  html(
    'reference',
    '<tr><th>Players</th><th>First branch</th><th>Bots haul</th><th class="num">Ending, h</th><th class="num">Closed-form model, h</th><th class="num">All goals, h</th><th>To the ending: hauling / exploring / waiting, h</th><th>Machines overtake hands, h</th></tr>' +
      rows.join(''),
  );
}

// ---------------------------------------------------------------- the loop
let last = performance.now();
let uiAt = 0;
function frame(now: number) {
  const real = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (!paused && !w.pending) {
    acc += real * speed;
    let k = 0;
    while (acc >= 1 && k++ < 4000) {
      tick(w, 1);
      acc -= 1;
    }
    if (acc > 1) acc = 0;
  }
  spawnFx(now);
  draw(now);
  if (now - uiAt > 200) {
    uiAt = now;
    panels();
  }
  requestAnimationFrame(frame);
}
let acc = 0;
requestAnimationFrame(frame);
