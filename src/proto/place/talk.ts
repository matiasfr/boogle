// Talking to a little guy in ?proto=place: a small card low on the screen, typed out with their own babble, through the shared
// talk input (src/player/conversation.ts), so it works on a pad, a keyboard and a touch screen. You stand still and the world
// keeps going. It gives no `focus`: that steers the camera for its first 1.4 s, and indoors the shot stays yours. You turn to
// face them, and the view eases round once unless you look around first. Local: two people can talk to the same one at once.
import { reducedMotion } from '../../constants.ts';
import { angleLerp } from '../../math.ts';
import { closeConversation, openConversation } from '../../player/conversation.ts';
import { cam, me } from '../../player/player.ts';
import { speak, type LineSpeech, type VoiceSpec } from '../../render/npc-voice.ts';

export type Answer = { label: string; then: () => Beat | null };
export type Beat = { say: string; answers: Answer[] };
export type Who = { name: string; voice: VoiceSpec; x: number; z: number; color: string };

const root = document.createElement('div');
root.className = 'place-talk';
root.hidden = true;
root.innerHTML = `<div class="place-talk-name"></div><p class="place-talk-say" aria-live="polite"></p><div class="place-talk-opts"></div><div class="talk-hints place-talk-hints" hidden></div>`;
document.body.append(root);
const nameEl = root.querySelector('.place-talk-name') as HTMLElement,
  sayEl = root.querySelector('.place-talk-say') as HTMLElement,
  optsEl = root.querySelector('.place-talk-opts') as HTMLElement,
  hintsEl = root.querySelector('.place-talk-hints') as HTMLElement;
root.addEventListener('pointerdown', (e) => e.stopPropagation());

let who: Who | null = null;
let onEnd: (() => void) | null = null;
const cur = { text: '', at: 0, typing: false, shown: 0 };
let speech: LineSpeech | null = null;
function hush() {
  speech?.stop();
  speech = null;
}
function finish() {
  hush();
  cur.typing = false;
  sayEl.textContent = cur.text;
  optsEl.hidden = false;
}
function show(b: Beat) {
  cur.text = b.say;
  cur.at = performance.now();
  cur.shown = 0;
  cur.typing = !reducedMotion;
  sayEl.textContent = cur.typing ? '' : b.say;
  optsEl.replaceChildren(
    ...b.answers.map((a) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = a.label;
      el.addEventListener('click', () => {
        if (cur.typing) return;
        const next = a.then();
        if (next) show(next);
        else endTalk();
      });
      return el;
    }),
  );
  optsEl.hidden = cur.typing;
  hush();
  if (cur.typing && who) speech = speak(b.say, 'smile', who.voice);
}
export const talking = () => who;
/** Opens the card. False if another talk or the pause view is up. */
export function startTalk(w: Who, first: Beat, ended?: () => void) {
  if (who) return false;
  const ok = openConversation({
    box: root,
    typing: () => cur.typing,
    skip: finish,
    choices: () => (cur.typing ? [] : [...optsEl.querySelectorAll<HTMLButtonElement>('button')]),
    close: endTalk,
    hints: hintsEl,
  });
  if (!ok) return false;
  who = w;
  onEnd = ended ?? null;
  nameEl.textContent = w.name;
  nameEl.style.setProperty('--who', w.color);
  root.hidden = false;
  framing.t = 0;
  framing.yaw = cam.yaw;
  framing.on = true;
  show(first);
  return true;
}
export function endTalk() {
  if (!who) return;
  who = null;
  hush();
  root.hidden = true;
  closeConversation();
  onEnd?.();
  onEnd = null;
}
const framing = { on: false, t: 0, yaw: 0 };
export function updateTalkCard(dt: number) {
  const w = who,
    b = me.body;
  if (!w) return;
  if (!b || Math.hypot(b.position.x - w.x, b.position.z - w.z) > 6) return endTalk();
  const face = Math.atan2(-(w.x - b.position.x), -(w.z - b.position.z));
  me.yaw = angleLerp(me.yaw, face, 1 - Math.exp(-dt * 8));
  // The view comes round once, about a second, to see them over your shoulder; your own look ends it.
  if (framing.on) {
    framing.t += dt;
    if (Math.abs(cam.yaw - framing.yaw) > 1e-4 || framing.t > 1.1) framing.on = false;
    else cam.yaw = framing.yaw = angleLerp(cam.yaw, face + 0.7, 1 - Math.exp(-dt * 3));
  }
  if (cur.typing) {
    const ms = performance.now() - cur.at;
    speech?.update(ms);
    const n = speech?.shownAt(ms) ?? cur.text.length;
    if (n !== cur.shown) {
      cur.shown = n;
      sayEl.textContent = cur.text.slice(0, n);
    }
    if (n >= cur.text.length) finish();
  }
}
