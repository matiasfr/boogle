// The atlas page: state, rendering, event delegation, search, keyboard and theme. Facts come from the code
// (virtual:atlas-facts); the words come from docs/atlas/ (read as raw text, so a broken file cannot fail the build).
import './atlas.css';
import facts from 'virtual:atlas-facts';
import conceptsText from '../docs/atlas/concepts.json?raw';
import changesMd from '../docs/atlas/changes.md?raw';
import { KINDS, REFS, VIEWS } from './layout.js';
import { buildModel, esc, layerById, layerOf, searchIndex } from './model.js';
import { parseNarrative } from './narrative.js';
import { howView, stopHow } from './views/how.js';
import { inspector } from './views/inspector.js';
import { focusView } from './views/focus.js';
import { flowView } from './views/flow.js';
import { frameView } from './views/frame.js';
import { mapLayers, mapPack, mapTree, resetPackZoom } from './views/map.js';

const storyTexts = import.meta.glob('../docs/atlas/stories/*.json', { eager: true, query: '?raw', import: 'default' });

const N = parseNarrative({ conceptsText, storyTexts });
const M = buildModel(facts);
const INDEX = searchIndex(M, N);
const $ = (s) => document.querySelector(s);
const kc = (k) => `var(${KINDS[k]?.c ?? '--accent'})`;

// One shared selection: { t: 'root' | 'concept' | 'layer' | 'dir' | 'file' | 'channel' | 'hook', id }.
const S = {
  view: 'how',
  mapStyle: 'layers',
  sel: { t: 'root' },
  openDir: 'features',
  focusFile: M.byPath.has('src/netplay/net.js') ? 'src/netplay/net.js' : (M.files[0]?.f ?? null),
  story: null,
  stepI: 0,
  focusBack: [],
};
const ctx = { S, M, N, changesMd, select, render, kc, esc };

function crumbs() {
  const sel = S.sel;
  const c = [`<button data-root>boogle</button>`];
  const file = sel.t === 'file' ? M.byPath.get(sel.id) : null;
  const dir = sel.t === 'dir' ? sel.id : file ? file.dir : null;
  if (sel.t === 'layer') c.push('/', `<b>${layerById(sel.id).short}</b>`);
  if (dir) {
    const L = layerOf(dir);
    c.push(
      '/',
      `<button data-layer="${L.id}">${L.short}</button>`,
      '/',
      sel.t === 'dir' ? `<b>${esc(dir)}/</b>` : `<button data-dir="${esc(dir)}">${esc(dir)}/</button>`,
    );
  }
  if (file) c.push('/', `<b>${esc(file.name)}</b>`);
  if (sel.t === 'channel') c.push('/', `<b>${esc(N.channels[sel.id]?.name ?? sel.id)}</b>`);
  $('#crumbs').innerHTML =
    S.view === 'how'
      ? '<span style="font-family:var(--sans)">Start here. Then explore the Map, Focus, Network flow and Frame tabs.</span>'
      : c.join(' ');
  $('#seg').innerHTML =
    S.view === 'map'
      ? `Overview ${[
          ['layers', 'Layers'],
          ['pack', 'Circles'],
          ['treemap', 'Treemap'],
        ]
          .map(([k, n]) => `<button data-style="${k}" aria-pressed="${S.mapStyle === k}">${n}</button>`)
          .join('')}`
      : S.view === 'focus'
        ? `<button data-back>Back</button>`
        : '';
}

// Each view draws into the canvas and returns its `update(ctx)` for selection changes, or null when it redraws instead.
// The first three are cheap or animated, so they are rebuilt on every render.
const VIEW_FNS = {
  how: howView,
  layers: mapLayers,
  pack: mapPack,
  treemap: mapTree,
  focus: focusView,
  flow: flowView,
  frame: frameView,
};
const ALWAYS_REBUILD = new Set(['how', 'layers', 'frame']);
let built = null;
let update = null;
function render(rebuild = true) {
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-selected', b.dataset.view === S.view));
  const name = S.view === 'map' ? S.mapStyle : S.view;
  const key = name + (S.view === 'focus' ? S.focusFile : '');
  if (rebuild || built !== key || ALWAYS_REBUILD.has(name)) {
    built = key;
    stopHow();
    update = VIEW_FNS[name](ctx, $('#canvas'));
  } else update?.(ctx);
  inspector(ctx);
  crumbs();
  $('#ref').innerHTML = REFS[name] ?? '';
}

function select(s, rebuild = true) {
  S.sel = s;
  if (s.t === 'dir' && S.view === 'map') S.openDir = s.id;
  if (s.t === 'file' && S.view === 'map') S.openDir = M.byPath.get(s.id)?.dir;
  if (s.t === 'file' && S.view === 'focus' && s.id !== S.focusFile) {
    S.focusBack.push(S.focusFile);
    S.focusFile = s.id;
    rebuild = true;
  }
  render(rebuild);
}

const storyOf = () => N.stories.find((x) => x.id === S.story);

document.addEventListener('click', (e) => {
  const t = e.target.closest(
    '[data-changes],[data-view],[data-style],[data-dir],[data-file],[data-layer],[data-root],[data-focus],[data-back],[data-hook],[data-res],[data-concept],[data-story],[data-step],[data-nav],[data-lane]',
  );
  if (!t) {
    if (!e.target.closest('.search')) $('#results').hidden = true;
    return;
  }
  const d = t.dataset;
  if (d.changes !== undefined) {
    S.sel = { t: 'changes' };
    render();
  } else if (d.view) {
    S.view = d.view;
    writeHash(`view/${S.view}`);
    if (S.view === 'focus' && S.sel.t === 'file') S.focusFile = S.sel.id;
    render();
  } else if (d.style) {
    S.mapStyle = d.style;
    render();
  } else if (d.focus) {
    if (S.view === 'focus') S.focusBack.push(S.focusFile);
    S.focusFile = d.focus;
    S.view = 'focus';
    S.sel = { t: 'file', id: d.focus };
    render();
  } else if (d.back !== undefined) {
    if (S.focusBack.length) {
      S.focusFile = S.focusBack.pop();
      S.sel = { t: 'file', id: S.focusFile };
      render();
    }
  } else if (d.file) select({ t: 'file', id: d.file }, false);
  else if (d.dir) {
    S.view = 'map';
    select({ t: 'dir', id: d.dir });
  } else if (d.layer) select({ t: 'layer', id: d.layer }, false);
  else if (d.root !== undefined) {
    S.openDir = null;
    resetPackZoom();
    select({ t: 'root' });
  } else if (d.hook) {
    S.sel = { t: 'hook', id: d.hook };
    render();
  } else if (d.res) pick(d.res);
  else if (d.concept) {
    S.sel = S.sel.t === 'concept' && S.sel.id === d.concept ? { t: 'root' } : { t: 'concept', id: d.concept };
    render();
  } else if (d.story) {
    S.story = S.story === d.story ? null : d.story;
    S.stepI = 0;
    writeHash(S.story ? `story/${S.story}` : 'view/how');
    render();
  } else if (d.step) {
    S.stepI = +d.step;
    render();
  } else if (d.nav) {
    const st = storyOf();
    S.stepI += +d.nav;
    if (!st || S.stepI >= st.steps.length) {
      S.story = null;
      S.stepI = 0;
    }
    render();
  } else if (d.lane) {
    S.sel = { t: 'channel', id: d.lane };
    render();
  }
  $('#results').hidden = true;
});

/* ---------- Search ---------- */
let act = 0;
let hits = [];
function pick(key) {
  const t = key.slice(0, 1);
  const id = key.slice(2);
  $('#q').value = '';
  $('#results').hidden = true;
  $('#q').blur();
  if (t === 'd') {
    S.view = 'map';
    select({ t: 'dir', id });
  } else if (t === 'c') {
    S.view = 'how';
    select({ t: 'concept', id });
  } else if (t === 's') {
    S.view = 'how';
    S.story = id;
    S.stepI = 0;
    S.sel = { t: 'root' };
    render();
  } else select({ t: 'file', id }, S.view === 'focus');
}
$('#q').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const r = $('#results');
  if (!q) {
    r.hidden = true;
    return;
  }
  hits = INDEX.filter((x) => x.text.toLowerCase().includes(q) || x.label.toLowerCase().includes(q))
    .sort((a, b) => a.label.toLowerCase().indexOf(q) - b.label.toLowerCase().indexOf(q))
    .slice(0, 9);
  act = 0;
  r.innerHTML = hits.length
    ? hits
        .map(
          (x, i) =>
            `<button data-res="${esc(x.key)}" class="${i === act ? 'act' : ''}"><span class="pill" style="--c:${x.kind ? kc(x.kind) : 'var(--faint)'};padding:0;background:none"><i></i></span>${esc(x.label)}<span>${esc(x.hint)}</span></button>`,
        )
        .join('')
    : '<p style="margin:6px 8px;color:var(--faint)">No matches</p>';
  r.hidden = false;
});
$('#q').addEventListener('keydown', (e) => {
  const b = [...$('#results').querySelectorAll('button')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!b.length) return;
    act = (act + (e.key === 'ArrowDown' ? 1 : -1) + b.length) % b.length;
    b.forEach((x, i) => x.classList.toggle('act', i === act));
  } else if (e.key === 'Enter' && hits[act]) pick(hits[act].key);
  else if (e.key === 'Escape') {
    $('#results').hidden = true;
    e.target.blur();
  }
});
document.addEventListener('keydown', (e) => {
  const inSearch = document.activeElement === $('#q');
  if (e.key === '/' && !inSearch) {
    e.preventDefault();
    $('#q').focus();
  } else if (S.view === 'how' && S.story && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !inSearch) {
    const st = storyOf();
    if (!st) return;
    S.stepI = Math.max(0, Math.min(st.steps.length - 1, S.stepI + (e.key === 'ArrowRight' ? 1 : -1)));
    render();
  } else if (S.view === 'how' && (e.key === 'Enter' || e.key === ' ') && document.activeElement?.dataset?.concept) {
    e.preventDefault();
    document.activeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } else if (e.key === 'Escape' && !inSearch) {
    if (S.sel.t === 'file') select({ t: 'dir', id: M.byPath.get(S.sel.id)?.dir }, false);
    else if (S.sel.t !== 'root') select({ t: 'root' }, false);
  }
});

/* ---------- Theme: auto, light, dark ---------- */
const THEMES = ['auto', 'light', 'dark'];
const THEME_KEY = 'boogle.atlas.theme';
function applyTheme(mode) {
  if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = mode;
  $('#theme').textContent = `Theme: ${mode}`;
}
let theme = 'auto';
try {
  const saved = localStorage.getItem(THEME_KEY);
  if (THEMES.includes(saved)) theme = saved;
} catch {
  // Storage can be blocked; the page works without remembering the theme.
}
applyTheme(theme);
$('#theme').addEventListener('click', () => {
  theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Not remembered, still applied.
  }
  applyTheme(theme);
});

/* ---------- Hash links: #story/<id>, #concept/<id>, #view/<id>, #file/<path> ---------- */
function writeHash(h) {
  try {
    history.replaceState(null, '', `#${h}`);
  } catch {
    // Some sandboxes block it; the page works without a shareable link.
  }
}
// Reads location.hash; an unknown id is ignored. Returns true when it changed the page.
function applyHash() {
  const m = /^#(story|concept|view|file)\/(.+)$/.exec(decodeURIComponent(location.hash));
  if (!m) return false;
  const [, kind, id] = m;
  if (kind === 'story') {
    if (!N.stories.some((x) => x.id === id)) return false;
    Object.assign(S, { view: 'how', story: id, stepI: 0, sel: { t: 'root' } });
  } else if (kind === 'concept') {
    if (!N.concepts.some((x) => x.id === id)) return false;
    Object.assign(S, { view: 'how', story: null, stepI: 0, sel: { t: 'concept', id } });
  } else if (kind === 'view') {
    if (!VIEWS.includes(id)) return false;
    S.view = id;
  } else {
    if (!M.byPath.has(id)) return false;
    if (S.view === 'how') S.view = 'map';
    S.sel = { t: 'file', id };
    S.openDir = M.byPath.get(id).dir;
    if (S.view === 'focus') S.focusFile = id;
  }
  return true;
}
window.addEventListener('hashchange', () => {
  if (applyHash()) render();
});

/* ---------- Start ---------- */
$('#rev').textContent = facts.git?.head ?? '';
if (facts.error) {
  const b = $('#banner');
  b.hidden = false;
  b.textContent = `The code facts could not be read (${facts.error}). Showing the explanations only.`;
}
applyHash();
render();
