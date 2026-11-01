// Which prototypes this page runs and which variant each plays (docs/plans/find-the-fun.md, "One path"). Every
// prototype's loader asks here instead of reading the address itself, so one page can run many of them:
//   ?proto=<id>[&v=<variant>]   one prototype, as always (standalone; agents' scenarios use these)
//   ?play                        the island: every prototype in ISLAND at once, in the room `proto-play`, each playing
//                                the variant last picked in the playlist (src/proto/bar/), with the playlist bar
//   ?play&proto=<id>             a chapter: a prototype that reshapes the island or clashes with another, alone, with
//                                the playlist bar so Next leads back to the island
// Live variants: a prototype that can change variant without a reload registers `onVariant(id, names, fn)`; the bar
// calls `switchLive` and falls back to a reload when the prototype can't. Panels: `playPanel(id, el)` shows a toy's
// panel on the island only while its step is current. Import-free and cheap: eager modules (the haul's) read it.
// Local only: nothing here is synced. Serves DESIGN.md "How we work".

/** The prototypes that share the island under `?play`, each at its own spot. The rest of the live cards are chapters
 * (protos/protos.ts says why on each). */
export const ISLAND = ['haul', 'wagon', 'lay', 'soapbox', 'build', 'minis', 'assets', 'moves'] as const;

const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
/** The page's `?proto=` ('' for none). */
export const PROTO = q.get('proto') ?? '';
/** The playlist is on: the island or a chapter. */
export const PLAY = q.has('play');
/** The island: `?play` without `?proto=`. */
export const ON_ISLAND = PLAY && !PROTO;

/** Whether prototype `id` runs on this page. */
export const protoOn = (id: string): boolean =>
  PROTO === id || (ON_ISLAND && (ISLAND as readonly string[]).includes(id));

// ---------------------------------------------------------------- the playlist's memory (this browser only)
/** Where the playlist is: the step (a card id) and each card's variant ('' for its default). */
export type PlayState = { step: string; v: Record<string, string> };
export const PLAY_KEY = 'boogle-play-v1';

export function playState(): PlayState {
  try {
    const s = JSON.parse(localStorage.getItem(PLAY_KEY) || '{}');
    return {
      step: typeof s?.step === 'string' ? s.step : '',
      v: s?.v && typeof s.v === 'object' ? s.v : {},
    };
  } catch {
    return { step: '', v: {} };
  }
}
export function savePlay(patch: { step?: string; v?: Record<string, string> }) {
  const s = playState();
  const next = { step: patch.step ?? s.step, v: { ...s.v, ...patch.v } };
  try {
    localStorage.setItem(PLAY_KEY, JSON.stringify(next));
  } catch {
    // private mode: the playlist starts over next time
  }
}

// `?play=<card>` or `?play=<card>:<variant>` (the protos page's Start here links) picks the step and variant before
// anything reads them; the address goes back to a plain `?play` so a reload resumes wherever you got to.
if (PLAY && q.get('play')) {
  const [step, v] = (q.get('play') ?? '').split(':');
  savePlay({ step, ...(v !== undefined ? { v: { [step]: v } } : {}) });
  const rest = new URLSearchParams(q);
  rest.delete('play');
  try {
    history.replaceState(history.state, '', `${location.pathname}?play${rest.size ? `&${rest}` : ''}`);
  } catch {
    // no history (a test): fine
  }
}

// ---------------------------------------------------------------- variants
const loaded = ON_ISLAND ? playState().v : {}; // the island's picks as this page loaded them
const now: Record<string, string> = {};
/** The variant prototype `id` plays now ('' for its default): the address's `v` standalone or in a chapter, the
 * playlist's pick on the island as the page loaded, or what a live switch set since. */
export function protoV(id: string): string {
  if (id in now) return now[id];
  if (PROTO === id) return q.get('v') ?? '';
  return loaded[id] ?? '';
}

const live = new Map<string, { names: Set<string>; fns: ((v: string) => void)[] }>();
/** Prototype `id` can switch between `names` ('' is its default) without a reload: `fn(v)` does it. */
export function onVariant(id: string, names: string[], fn: (v: string) => void) {
  const e = live.get(id) ?? { names: new Set(names), fns: [] };
  for (const n of names) e.names.add(n);
  e.fns.push(fn);
  live.set(id, e);
}
/** Switches `id` to `v` live if its prototype can (both the playing variant and `v` are live ones); false: reload. */
export function switchLive(id: string, v: string): boolean {
  const e = live.get(id);
  if (!e || !e.names.has(protoV(id)) || !e.names.has(v)) return false;
  now[id] = v;
  for (const fn of e.fns) fn(v);
  return true;
}
let chooser: ((id: string, v: string) => void) | null = null;
/** Picks variant `v` of `id` the way the prototype bar does (live if it can, else a reload that keeps your spot);
 * false when there is no bar (it isn't loaded yet). A toy's own panel calls this instead of linking to `&v=`. */
export function chooseVariant(id: string, v: string): boolean {
  if (!chooser) return false;
  chooser(id, v);
  return true;
}
/** The prototype bar hands over how it picks a variant (src/proto/bar/). */
export const setChooser = (fn: (id: string, v: string) => void) => void (chooser = fn);

/** Whether a switch of `id` from its playing variant to `v` would be live. */
export const isLive = (id: string, v: string) => {
  const e = live.get(id);
  return !!e && e.names.has(protoV(id)) && e.names.has(v);
};

// ---------------------------------------------------------------- the current step
let step = ON_ISLAND ? playState().step : PROTO;
const stepFns = new Set<(id: string) => void>();
/** The card the playlist is on (on the island), else the page's prototype. */
export const currentStep = () => step;
/** Called with the new card id when the playlist moves (the bar), and once now. */
export function onStep(fn: (id: string) => void) {
  stepFns.add(fn);
  fn(step);
}
/** The bar moved the playlist to card `id`. */
export function setStep(id: string) {
  if (id === step) return;
  step = id;
  for (const fn of stepFns) fn(id);
}

/** On the island, `el` (a toy's own panel) shows only while its card is the current step; elsewhere it always shows. */
export function playPanel(id: string, el: HTMLElement) {
  if (!ON_ISLAND) return;
  onStep((s) => (el.style.display = s === id ? '' : 'none'));
}
