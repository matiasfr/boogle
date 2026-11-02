// One quiet notification lane (docs/research/ui-patterns.md, rec 5): a single slot just past the hotbar for things only
// you need to know ("Hotbar full", "Boogle was updated"), so notes don't pile up as systems arrive. Shared progress
// belongs in the world instead (the work-site plaque flips its rows, src/features/work-sites.ts). Local and cosmetic.
//
//   notify(text, { kind, ttl, key, action })  -> dismiss()
//     kind    'info' (glass, a pop), 'deny' (coral, a falling two-note and a head-shake) or 'news' (sun edge, a pop)
//     ttl     ms on screen (default 2500); 0 stays until dismiss(), behind anything newer
//     key     de-duplicates (default: the text): the same key again refreshes the one queued or showing
//     action  { label, run }: a button on the notice (a sticker: pressable)
//
// One notice at a time; at most MAX_QUEUED wait (the oldest drops). A 'deny' answers a press, so it goes first and cuts
// the one showing short (that one comes back after it if it had time left). Sticky notices (ttl 0) wait under the queue.
import './ui-kit.css';
import './notify.css';
import { uiSound, replay, type UiSound } from './ui-sound.ts';

export type NotifyKind = 'info' | 'deny' | 'news';
export type NotifyOpts = { kind?: NotifyKind; ttl?: number; key?: string; action?: { label: string; run: () => void } };
type Notice = Required<Pick<NotifyOpts, 'kind' | 'ttl' | 'key'>> &
  Pick<NotifyOpts, 'action'> & {
    text: string;
    left?: number; // ms still to show, when a deny cut it short
    seen?: boolean; // shown once already: coming back (after a deny, or a sticky under a note) stays quiet
  };

const TTL = 2500;
const MAX_QUEUED = 3;
const SOUND: Record<NotifyKind, UiSound> = { info: 'pop', deny: 'deny', news: 'pop' };

const queue: Notice[] = []; // transient, oldest first
const sticky: Notice[] = []; // ttl 0, newest last
let showing: Notice | null = null;
let until = 0; // when the transient showing leaves
let timer = 0;
let lane: HTMLElement | null = null;
let textEl: HTMLElement;
let btn: HTMLButtonElement;

function build(): HTMLElement {
  lane = document.createElement('div');
  lane.className = 'notify';
  lane.setAttribute('role', 'status');
  lane.setAttribute('aria-live', 'polite');
  textEl = document.createElement('span');
  textEl.className = 'notify-text';
  btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'notify-btn';
  btn.addEventListener('click', () => showing?.action?.run());
  lane.append(textEl, btn);
  (document.querySelector('.hud') ?? document.body).append(lane);
  return lane;
}

// Put `n` on screen (or take the lane down when null).
function show(n: Notice | null): void {
  const el = lane ?? build();
  clearTimeout(timer);
  showing = n;
  if (!n) {
    el.classList.remove('shown');
    return;
  }
  if (n.ttl) {
    const ms = n.left ?? n.ttl;
    n.left = undefined;
    until = performance.now() + ms;
    timer = window.setTimeout(next, ms);
  }
  textEl.textContent = n.text;
  btn.hidden = !n.action;
  btn.textContent = n.action?.label ?? '';
  el.dataset.kind = n.kind;
  if (!n.seen) {
    uiSound(SOUND[n.kind]);
    if (n.kind === 'deny') replay(el, 'ui-nope');
  }
  n.seen = true;
  el.classList.add('shown');
}

function next(): void {
  show(queue.shift() ?? sticky.at(-1) ?? null);
}

export function notify(text: string, opts: NotifyOpts = {}): () => void {
  const n: Notice = {
    text,
    kind: opts.kind ?? 'info',
    ttl: opts.ttl ?? TTL,
    key: opts.key ?? text,
    action: opts.action,
  };
  const dismiss = () => {
    for (const list of [queue, sticky]) {
      const i = list.indexOf(n);
      if (i >= 0) list.splice(i, 1);
    }
    if (showing === n) next();
  };
  // Same key: replace it where it waits (or on screen), so a repeated note refreshes instead of stacking.
  for (const list of [queue, sticky]) {
    const i = list.findIndex((o) => o.key === n.key);
    if (i >= 0) list.splice(i, 1);
  }
  if (showing?.key === n.key) {
    if (!n.ttl) sticky.push(n);
    show(n);
    return dismiss;
  }
  if (!n.ttl) {
    sticky.push(n);
    if (!showing || !showing.ttl) show(n);
    return dismiss;
  }
  if (n.kind === 'deny') {
    // It answers a press: now, ahead of anything waiting; the one it cuts short resumes after it.
    const left = showing?.ttl ? until - performance.now() : 0;
    if (showing?.ttl && left > 600) queue.unshift(Object.assign(showing, { left }));
    queue.unshift(n);
    next();
    return dismiss;
  }
  queue.push(n);
  if (queue.length > MAX_QUEUED) queue.shift();
  if (!showing || !showing.ttl) next();
  return dismiss;
}
