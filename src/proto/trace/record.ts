// The playtest trace (docs/research/playtest-telemetry.md, recs 1-5 and 9): on any `?proto=` page, one sitting per page
// load with the five signals; on the `?play` island one per stop of the playlist (`startSitting`, from the prototype
// bar: each step, and each live variant switch, starts a new one for that card and variant). Once a second your
// position, rounded to a metre, and what you were doing (walking, riding a deck, driving, carrying, swimming, idle);
// each stretch of standing still for IDLE_S or more; failure marks (`protoMark` from src/proto/mark.ts: wipeouts,
// tumbles, crashes, spills, and a splash when you fall in the water); seconds from the start to the verb (the first
// ride, drive or carry, or the card's own `verb`: a counter, an activity, or `protoMark('verb')`); and where and when it ended. Saved to this
// browser's protos store (protos/store.ts) every few seconds and when the tab hides, the card's last 10 sittings; the
// protos page draws them as heat maps. Loaded by the prototype bar.
// Local: never synced, never sent anywhere. Serves DESIGN.md "How we work".
import { onFrame } from '../../loop.ts';
import { me } from '../../player/player.ts';
import { carry } from '../../physics/platforms.ts';
import { ACTIVITIES, IDLE_S, saveSitting, sittingLine, type Activity, type Sitting } from '../../../protos/store.ts';
import { PROTOS } from '../../../protos/protos.ts';
import { hookActivity, onProtoMark } from '../mark.ts';

const STILL = 0.4; // m/s: slower than this counts as standing still
const SAVE_S = 10; // s between saves while playing
const MAX_SAMPLES = 3600; // an hour at 1 Hz; past it the track halves and samples every 2 s, and so on
const ACTIVE = new Set<Activity>(['riding', 'driving', 'carrying']); // the first of these is the verb (no card `verb`)

let card = '';
let cardVerb: string | undefined; // the card's own `verb` (a counter or an activity): then only it is the verb
let s: Sitting | null = null;
let t0 = 0; // performance.now() when the sitting started
const clock = () => Math.round((performance.now() - t0) / 100) / 10; // s since the sitting started
let step = 1; // s between samples
let acc = 0;
let still = 0; // s standing still
let stillAt = { x: 0, z: 0 };
let swam = false;
let lastSave = 0;

const pos = () => {
  const b = me.body!.position;
  return { x: Math.round(b.x), z: Math.round(b.z) };
};
const verb = () => {
  if (s && s.verb === null) s.verb = clock();
};
const mark = (k: string) => {
  if (!s || !me.entered || !me.body) return;
  if (k === 'verb') return verb();
  s.marks.push({ k, t: clock(), ...pos() });
};
onProtoMark(mark);

const activity = (): Activity => {
  const hook = hookActivity();
  if (hook) return hook;
  if (carry.on) return 'riding';
  if (me.holding) return 'carrying';
  if (me.swimming) return 'swimming';
  return still >= IDLE_S ? 'idle' : 'walking';
};

const endIdle = () => {
  if (s && still >= IDLE_S) s.idle.push(Math.round(clock() - still), stillAt.x, stillAt.z, Math.round(still));
  still = 0;
};

const save = (stoodStill = still) => {
  if (!s || !s.p.length) return;
  if (me.body) s.end = { t: clock(), ...pos(), idle: Math.round(stoodStill) };
  saveSitting(card, s);
  lastSave = clock();
};

function leave() {
  if (!s) return;
  const stoodStill = still || (s.end?.idle ?? 0); // hidden, then pagehide: keep what the first one saw
  endIdle();
  save(stoodStill);
}

/** Ends the sitting being recorded (saved) and starts one for card `id` playing variant `v` ('' for the default),
 * timed from now, or from the page load (`fromLoad`: a page's first sitting, so time-to-verb includes the load). */
export function startSitting(id: string, v: string, fromLoad = false) {
  leave();
  card = id;
  cardVerb = PROTOS.find((p) => p.id === id)?.verb;
  s = { id: Date.now(), v, p: [], idle: [], marks: [], verb: null, end: null };
  t0 = fromLoad ? 0 : performance.now();
  step = 1;
  acc = still = lastSave = 0;
}

onFrame(
  ({ dt }) => {
    if (!s || !me.entered || !me.body || document.hidden || !(dt > 0) || dt > 1) return;
    const b = me.body;
    // Standing still, on your own feet (a deck or a cart carrying you is the ride, not idling).
    const v = b.velocity;
    const moving = Math.hypot(v.x, v.z) > STILL || !!carry.on || hookActivity() === 'driving';
    if (moving) endIdle();
    else {
      if (still === 0) stillAt = pos();
      still += dt;
    }
    if (me.swimming && !swam) mark('splash');
    swam = me.swimming;

    acc += dt;
    if (acc < step) return;
    acc -= step;
    const a = activity();
    if (cardVerb ? a === cardVerb : ACTIVE.has(a)) verb();
    const { x, z } = pos();
    s.p.push(Math.round(clock()), x, z, ACTIVITIES.indexOf(a));
    if (s.p.length / 4 > MAX_SAMPLES) {
      s.p = s.p.filter((_, i) => (i >> 2) % 2 === 0);
      step *= 2;
    }
    if (clock() - lastSave > SAVE_S) save();
  },
  { phase: 'world', order: 41 },
);

addEventListener('pagehide', () => {
  leave();
  if (s) console.info(`[trace] ${card}: ${s.p.length / 4} samples; ${sittingLine(s)}`);
});
document.addEventListener('visibilitychange', () => document.hidden && leave());
