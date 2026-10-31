// The right-hand inspector: a card for whatever is selected. ctx = { S, M, N, select, render, kc, esc }.
import { KINDS, LAYERS, VIEWS } from '../layout.ts';
import { fileAt, hooks, layerById, layerDirs, layerOf, registrations, resolveCite, sumLoc, wireOf } from '../model.ts';
import { parseChanges, renderChanges } from '../changes.ts';
import { conceptCard, howIntro } from './how.ts';
import type { Cite, Ctx, ModelFile } from '../types.ts';

const sentences = (t: string): string => {
  if (!t) return '';
  const i = t.lastIndexOf('. ');
  return i > 60 ? t.slice(0, i + 1) : t.length >= 255 ? t + '…' : t;
};

export function legend({ kc }: Pick<Ctx, 'kc'>): string {
  return `<div class="legend">${Object.entries(KINDS)
    .map(([k, v]) => `<span class="pill" style="--c:${kc(k)}"><i></i>${v.name}</span>`)
    .join('')}</div>`;
}

export function stackBar({ kc }: Pick<Ctx, 'kc'>, list: ModelFile[]): string {
  const n: Record<string, number> = {};
  for (const f of list) n[f.kind] = (n[f.kind] || 0) + f.loc;
  return `<span class="stack">${Object.keys(KINDS)
    .filter((k) => n[k])
    .map((k) => `<i style="flex:${n[k]};--c:${kc(k)}"></i>`)
    .join('')}</span>`;
}

export function fileList({ kc, esc }: Pick<Ctx, 'kc' | 'esc'>, list: ModelFile[], max = 8): string {
  return `<div class="list">${list
    .slice(0, max)
    .map(
      (f) =>
        `<button data-file="${esc(f.f)}" style="--c:${kc(f.kind)}"><i></i>${esc(f.name)}<span>${f.loc}</span></button>`,
    )
    .join('')}${list.length > max ? `<p>+ ${list.length - max} more</p>` : ''}</div>`;
}

// A cite as a chip under a story step or a concept card. A cite that no longer resolves is a grey, unclickable chip.
export function citeChip({ M, esc }: Pick<Ctx, 'M' | 'esc'>, cite: Cite): string {
  const r = resolveCite(cite, M);
  const key = cite && typeof cite === 'object' ? Object.keys(cite).find((k) => k !== 'symbol') : null;
  const v = key ? String((cite as Record<string, unknown>)[key]) : '?';
  const base =
    key === 'file'
      ? v.split('/').pop()! + (cite.symbol ? ` · ${cite.symbol}` : '')
      : key === 'dir'
        ? v + '/'
        : `${key ?? 'cite'} ${v}`;
  if (r.error) return `<span class="chip stale" title="${esc(r.error)}">${esc(base)} <small>stale</small></span>`;
  const attr = key === 'dir' ? `data-dir="${esc(M.byPath.get(r.files[0])?.dir)}"` : `data-file="${esc(r.files[0])}"`;
  return `<button class="chip" ${attr} title="${esc(r.files.join(', '))}">${esc(base)}</button>`;
}

function problemsNote({ N, M, esc }: Pick<Ctx, 'N' | 'M' | 'esc'>): string {
  const list = [...N.loadProblems, ...(M.facts?.error ? [`Code facts: ${M.facts.error}`] : [])];
  if (!list.length) return '';
  return `<div class="problems"><h3>Atlas problems</h3><p>These do not break the page. The daily agent fixes them, or run <code>npm run atlas -- --check</code>.</p><ul>${list.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
}

export function inspector(ctx: Ctx): void {
  const { S, M, N, kc, esc } = ctx;
  const el = document.querySelector('#insp')!;
  const sel = S.sel;
  if (sel.t === 'changes') {
    const known = {
      stories: new Set(N.stories.map((x) => x.id)),
      concepts: new Set(N.concepts.map((x) => x.id)),
      views: new Set(VIEWS),
    };
    const entries = parseChanges(ctx.changesMd).slice(0, 8);
    el.innerHTML = `<div><h2>What changed</h2></div>${entries.length ? renderChanges(entries, known) : '<p>Nothing recorded yet.</p>'}`;
    return;
  }
  if (sel.t === 'concept') {
    el.innerHTML = conceptCard(ctx, sel.id);
    return;
  }
  if (S.view === 'how' && sel.t === 'root') {
    el.innerHTML = howIntro(ctx) + problemsNote(ctx);
    return;
  }
  if (sel.t === 'file') {
    const f = fileAt(M, sel.id);
    if (!f) {
      el.innerHTML = '<p>That file is not in the code any more.</p>';
      return;
    }
    const regs = registrations(f);
    const uses = [...f.uses].map((p) => M.byPath.get(p)).filter((x): x is ModelFile => !!x);
    const by = f.users.map((p) => M.byPath.get(p)).filter((x): x is ModelFile => !!x);
    el.innerHTML = `<div><h2>${esc(f.name)}</h2><div class="path">${esc(f.f)}</div></div>
      <div class="pills"><span class="pill" style="--c:${kc(f.kind)}"><i></i>${KINDS[f.kind].name}</span><span class="pill">${f.loc} lines</span></div>
      <p>${esc(sentences(f.head) || N.kinds[f.kind] || '')}</p>
      ${regs.length ? `<div><h3>Registers</h3><dl class="kv">${regs.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>` : ''}
      <div><h3 style="color:var(--usedby)">Used by · ${by.length}</h3>${by.length ? fileList(ctx, by, 6) : '<p>Nothing imports it.' + (f.dir === 'features' ? ' Features are auto-loaded by main.' : '') + '</p>'}</div>
      <div><h3 style="color:var(--uses)">Uses · ${uses.length}</h3>${fileList(ctx, uses, 6)}</div>
      ${S.view !== 'focus' ? `<button class="cta" data-focus="${esc(f.f)}">Open in Focus</button>` : ''}`;
  } else if (sel.t === 'dir') {
    const list = M.dirs[sel.id] ?? [];
    const n: Record<string, number> = {};
    for (const f of list) n[f.kind] = (n[f.kind] || 0) + 1;
    el.innerHTML = `<div><h2>${esc(sel.id)}/</h2><div class="path">${esc(layerOf(sel.id).name)}</div></div><p>${esc(N.folders[sel.id] ?? '')}</p>
      <div><h3>Sync kinds</h3>${stackBar(ctx, list)}<div class="pills" style="margin-top:8px">${Object.keys(KINDS)
        .filter((k) => n[k])
        .map((k) => `<span class="pill" style="--c:${kc(k)}"><i></i>${KINDS[k].name} ${n[k]}</span>`)
        .join('')}</div></div>
      <div><h3>Largest files · ${list.length}</h3>${fileList(ctx, list)}</div>`;
  } else if (sel.t === 'layer') {
    const L = layerById(sel.id);
    const ds = layerDirs(M, L);
    el.innerHTML = `<div><h2>${L.name}</h2></div><p>${L.note}</p><div><h3>Folders</h3><div class="list">${ds
      .map(
        (d) =>
          `<button data-dir="${esc(d)}" style="--c:var(--faint)"><i></i>${esc(d)}/<span>${M.dirs[d].length} files</span></button>`,
      )
      .join('')}</div></div>`;
  } else if (sel.t === 'channel') {
    const ch = N.channels[sel.id] ?? {};
    const src = M.files.filter((f) => wireOf(f).some(([k]) => k === sel.id));
    el.innerHTML = `<div><h2>${esc(ch.name ?? KINDS[sel.id]?.name ?? sel.id)}</h2></div><span class="pill" style="--c:${kc(sel.id)}"><i></i>${KINDS[sel.id]?.name ?? sel.id}</span><p>${esc(ch.d ?? '')}</p>
      <div><h3>Keys on this channel</h3><dl class="kv">${src
        .map(
          (f) =>
            `<dt>${esc(f.name.replace(/\.[jt]s$/, ''))}</dt><dd>${esc(
              wireOf(f)
                .find(([k]) => k === sel.id)?.[1]
                .join(', '),
            )}</dd>`,
        )
        .join('')}</dl></div>
      <p>Old tabs stay in rooms for a while after a deploy, so these names never change meaning. Add new ones instead.</p>`;
  } else if (sel.t === 'hook') {
    const h = hooks(M).find((x) => x.id === sel.id);
    const f = h && fileAt(M, h.file);
    el.innerHTML = h
      ? `<div><h2>${esc(h.name)}</h2><div class="path">${h.phase === 'pre' || h.phase === 'render' ? `step ${(h.order ?? 0) + 1} in ${h.file}` : `${h.phase} · order ${h.order}`}</div></div><p>${h.core ? 'A core hook: its order is reserved in the comment at the top of src/loop.' : 'A feature hook. It runs after every lower order in the same phase.'}</p>${f ? `<div><h3>Owner</h3>${fileList(ctx, [f])}</div>` : ''}`
      : '<p>That hook is not in the code any more.</p>';
  } else {
    const since = M.facts?.git?.first
      ? new Date(M.facts.git.first).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      : '';
    const commits = M.facts?.git?.commits;
    el.innerHTML = `<div><h2>${M.files.length} files · ${sumLoc(M.files).toLocaleString()} lines</h2>${commits ? `<div class="path">${commits} commits${since ? ` since ${since}` : ''}</div>` : ''}</div>
      <p>Five layers, top to bottom: from what a player touches to the wire. Click anything to see it here; press <b>/</b> to search.</p>
      <div><h3>Colour is the sync kind</h3>${legend(ctx)}</div>
      <div><h3>Layers</h3><div class="list">${LAYERS.map((L) => `<button data-layer="${L.id}" style="--c:var(${L.c})"><i style="outline:1px solid var(--faint)"></i>${L.name}<span>${layerDirs(M, L).length}</span></button>`).join('')}</div></div>
      ${problemsNote(ctx)}`;
  }
}
