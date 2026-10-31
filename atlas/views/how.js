// "How it works": the concept diagram, with stories that walk one action through it. ctx = { S, M, N, ... }.
// Every reference to the narrative or the code tolerates being out of date (see docs/plans/atlas.md, "Never fail the
// build, never crash the page").
import { line, curveCatmullRom } from 'd3-shape';
import { BOX, KINDS, LANES, ROUTE_VIA } from '../layout.js';
import { citeChip } from './inspector.js';

let raf = 0;
export const stopHow = () => cancelAnimationFrame(raf);

const boxC = (b) => [b.x + b.w / 2, b.y + b.h / 2];
const laneP = (k) => [645, LANES[k].y];
const validRef = (id) => (typeof id === 'string' && id.startsWith('lane:') ? id.slice(5) in LANES : id in BOX);

function edgeToward(b, [tx, ty]) {
  const [cx, cy] = boxC(b);
  const dx = tx - cx;
  const dy = ty - cy;
  const s = Math.min(
    Math.abs(dx) ? b.w / 2 / Math.abs(dx) : Infinity,
    Math.abs(dy) ? b.h / 2 / Math.abs(dy) : Infinity,
  );
  return [cx + dx * s, cy + dy * s];
}

// Box and lane ids -> points. A route between ROUTE_VIA's two ends bends through its waypoint (both directions).
export function routePts(ids) {
  const items = [];
  ids.forEach((id, i) => {
    if (i)
      for (const v of ROUTE_VIA)
        if ((v.a === ids[i - 1] && v.b === id) || (v.a === id && v.b === ids[i - 1])) items.push({ pt: v.via });
    items.push({ id });
  });
  const raw = items.map((it) => (it.pt ? it.pt : it.id.startsWith('lane:') ? laneP(it.id.slice(5)) : boxC(BOX[it.id])));
  return items.map((it, i) => {
    if (it.pt || it.id.startsWith('lane:')) return raw[i];
    if (i === 0) return edgeToward(BOX[it.id], raw[1]);
    if (i === items.length - 1) return edgeToward(BOX[it.id], raw[i - 1]);
    return raw[i];
  });
}

const subtitle = (ctx, id) => (ctx.N.boxes[id] ?? '').replace('{features}', String(ctx.M.featureCount));
const titleOf = (ctx, b) => ctx.N.concepts.find((c) => c.id === b.c)?.title ?? b.c;

export function howView(ctx, el) {
  const { S, N, css, kc, esc } = ctx;
  stopHow();
  const st = S.story ? N.stories.find((s) => s.id === S.story) : null;
  const step = st?.steps?.[S.stepI];
  const goRoutes = Array.isArray(step?.go) ? step.go : [];
  const drawable = goRoutes.filter((r) => Array.isArray(r) && r.length >= 2 && r.every(validRef));
  const hlIds = (Array.isArray(step?.hl) ? step.hl : []).filter((id) => id in BOX);
  const outdated =
    !!step && (drawable.length < goRoutes.length || hlIds.length < (Array.isArray(step.hl) ? step.hl.length : 0));
  const active = new Set([...hlIds, ...drawable.flat()]);
  const conceptSel = S.sel.t === 'concept' ? S.sel.id : null;
  const on = (id) => !step || active.has(id);
  const frame = (
    x,
    w,
    title,
    host,
  ) => `<g><rect x="${x}" y="20" width="${w}" height="420" rx="14" fill="var(--sunk)" stroke="var(--line)"/>
    <circle cx="${x + 16}" cy="38" r="4" fill="var(--line)"/><circle cx="${x + 29}" cy="38" r="4" fill="var(--line)"/><circle cx="${x + 42}" cy="38" r="4" fill="var(--line)"/>
    <text x="${x + 56}" y="42" style="font:600 13px var(--sans)">${title}</text>${host ? `<rect x="${x + w - 62}" y="29" width="48" height="18" rx="9" fill="${kc('host')}"/><text x="${x + w - 38}" y="42" text-anchor="middle" style="font:600 10px var(--sans);fill:#fff;letter-spacing:.06em">HOST</text>` : ''}</g>`;
  let s = frame(20, 560, 'Your browser tab') + frame(710, 270, 'A friend’s tab', true);
  s += `<text x="645" y="42" text-anchor="middle" style="font:600 13px var(--sans)">The room</text><text x="645" y="60" text-anchor="middle" style="font:11px var(--sans);fill:var(--mute)">tab to tab</text>`;
  s += `<line x1="645" x2="645" y1="72" y2="420" stroke="var(--line)" stroke-dasharray="3 4"/>`;
  for (const [k, L] of Object.entries(LANES)) {
    const lit = !step || drawable.some((r) => r.includes('lane:' + k));
    const name = N.channels[k]?.name ?? KINDS[k]?.name ?? k;
    s += `<g data-lane="${k}" style="cursor:pointer" opacity="${lit ? 1 : 0.3}"><rect x="594" y="${L.y - 15}" width="102" height="30" rx="15" fill="${kc(k)}" fill-opacity=".16" stroke="${kc(k)}"/><text x="645" y="${L.y + 4}" text-anchor="middle" style="font:500 11px var(--sans)">${esc(name)}</text></g>`;
  }
  for (const [id, b] of Object.entries(BOX)) {
    const isSel = conceptSel === b.c;
    const lit = on(id);
    const title = titleOf(ctx, b);
    const sub = subtitle(ctx, id);
    const marked = isSel || (step && active.has(id));
    s += `<g data-concept="${b.c}" style="cursor:pointer" opacity="${lit ? 1 : 0.3}" tabindex="0" role="button" aria-label="${esc(title)}">
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="var(--panel)" stroke="${marked ? 'var(--accent)' : 'var(--line)'}" stroke-width="${marked ? 2 : 1}"/>
      ${b.lock ? `<rect x="${b.x}" y="${b.y}" width="5" height="${b.h}" rx="2" fill="${kc('lock')}"/>` : ''}
      <text x="${b.x + 14}" y="${b.y + 24}" style="font:600 14px var(--sans)">${esc(title)}</text>
      ${
        b.h >= 100
          ? sub
              .split(' · ')
              .map(
                (l, i) =>
                  `<text x="${b.x + 14}" y="${b.y + 44 + i * 18}" style="font:12px var(--sans);fill:var(--mute)">${esc(l)}</text>`,
              )
              .join('')
          : `<text x="${b.x + 14}" y="${b.y + 42}" style="font:12px var(--sans);fill:var(--mute)">${esc(sub.length > b.w / 6.4 ? sub.slice(0, Math.floor(b.w / 6.4) - 1) + '…' : sub)}</text>`
      }</g>`;
  }
  s += `<line x1="200" x2="215" y1="170" y2="170" stroke="var(--line)"/>`;
  const color = css(KINDS[st?.kind]?.c ?? '--accent');
  const curve = line().curve(curveCatmullRom.alpha(0.5));
  const routes = drawable.map((r) => curve(routePts(r)));
  s += routes
    .map(
      (d, i) =>
        `<path id="rt${i}" d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" marker-end="url(#arr)"/>`,
    )
    .join('');
  s += routes
    .map((_, i) => `<circle id="dot${i}" r="6" fill="${color}" stroke="var(--panel)" stroke-width="2"/>`)
    .join('');
  const pips = st
    ? st.steps
        .map(
          (_, i) =>
            `<button class="pip${i === S.stepI ? ' on' : ''}" data-step="${i}" aria-label="Step ${i + 1}"></button>`,
        )
        .join('')
    : '';
  const last = st && S.stepI === st.steps.length - 1;
  el.innerHTML = `<div class="how">
    <div class="stories"><span>Follow a story</span>${N.stories
      .map(
        (x) =>
          `<button data-story="${esc(x.id)}" aria-pressed="${S.story === x.id}">${KINDS[x.kind] ? `<i style="background:${kc(x.kind)}"></i>` : ''}${esc(x.title ?? x.id)}</button>`,
      )
      .join('')}</div>
    <div class="diagram"><svg viewBox="0 0 1000 545" role="img" aria-label="How Boogle fits together"><defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="${color}"/></marker></defs>${s}</svg></div>
    <div class="caption">${
      st && step
        ? `<div class="cap-top"><b>${esc(st.title ?? st.id)}</b><span>Step ${S.stepI + 1} of ${st.steps.length}</span><div class="pips">${pips}</div>
      <button data-nav="-1" ${S.stepI === 0 ? 'disabled' : ''}>← Back</button><button data-nav="1" class="next">${last ? 'Done' : 'Next →'}</button></div>
      <p>${esc(step.text ?? '')}</p>${step.code ? `<code>${esc(step.code)}</code>` : ''}
      ${Array.isArray(step.cite) && step.cite.length ? `<div class="chips">${step.cite.map((c) => citeChip(ctx, c)).join('')}</div>` : ''}
      ${outdated ? '<span class="oldnote">Part of this picture is out of date.</span>' : ''}`
        : `<p>Each player runs the whole game in their own browser tab, and tabs talk to each other directly. Pick a story above to watch one action travel through the system, or click any box to learn what it is.</p>`
    }</div></div>`;
  const at = (i, p, L) => {
    const q = p.getPointAtLength(L);
    const dot = el.querySelector('#dot' + i);
    dot.setAttribute('cx', q.x);
    dot.setAttribute('cy', q.y);
    return dot;
  };
  if (!routes.length) return;
  const paths = routes.map((_, i) => el.querySelector('#rt' + i));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paths.forEach((p, i) => at(i, p, p.getTotalLength()));
    return;
  }
  const t0 = performance.now();
  const tick = (now) => {
    const u = ((now - t0) % 1600) / 1600;
    paths.forEach((p, i) =>
      at(i, p, p.getTotalLength() * Math.min(1, u * 1.15)).setAttribute('opacity', u > 0.92 ? 0 : 1),
    );
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

export function conceptCard(ctx, id) {
  const { N, esc } = ctx;
  const c = N.concepts.find((x) => x.id === id);
  if (!c) return `<div><h2>${esc(id)}</h2></div><p>No description yet.</p>`;
  const code = (Array.isArray(c.code) ? c.code : []).map((x) => citeChip(ctx, x)).join('');
  const rules = Array.isArray(c.rules) ? c.rules : [];
  const views = { frame: 'Frame', flow: 'Network flow', map: 'Map', focus: 'Focus' };
  return `<div><h2>${esc(c.title ?? id)}</h2></div><p style="color:var(--fg);font-size:14px">${esc(c.one ?? '')}</p>${c.like ? `<p class="like">${esc(c.like)}</p>` : ''}
    ${rules.length ? `<div><h3>Rules of thumb</h3><ul class="rules">${rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
    ${code ? `<div><h3>In the code</h3><div class="chips">${code}</div></div>` : ''}${views[c.view] ? `<button class="cta" data-view="${c.view}">Open the ${views[c.view]} view</button>` : ''}`;
}

export function howIntro(ctx) {
  const { N, kc, esc } = ctx;
  const i = N.intro;
  if (!i)
    return '<div><h2>Boogle in one picture</h2></div><p>The explanations are not available right now. The Map, Focus, Network flow and Frame views still work.</p>';
  const ways = (Array.isArray(i.ways) ? i.ways : []).filter((w) => KINDS[w?.kind]);
  return `<div><h2>${esc(i.title ?? 'Boogle in one picture')}</h2></div><p style="color:var(--fg);font-size:14px">${esc(i.lead ?? '')}</p>
    <p>${esc(i.question ?? '')}</p>
    <div class="ways">${ways.map((w) => `<div style="--c:${kc(w.kind)}"><i></i><b>${KINDS[w.kind].name}</b><span>${esc(w.says ?? '')}</span><small>${esc(w.eg ?? '')}</small></div>`).join('')}</div>
    <p>${esc(i.foot ?? '')}</p>`;
}
