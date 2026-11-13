// Talking to an NPC: the input every talk box shares (The Boogler's, src/boogler/dialogue.ts; every NPC after him plugs
// in the same way, docs/game-design/npcs.md). One conversation at a time. Not a modal: the island keeps running and the
// right stick or mouse still looks, but the player stands still (move and jump are held) while the camera eases round
// to frame the NPC. Local input only: no sim or network state. Serves DESIGN.md 7 (telegraph everything: the box always
// shows which button does what) and 8 (drop-in: the same talk works on a pad, a keyboard or a touch screen).
//
//   openConversation(talk)   false if one is open, or a modal (the pause view) is up. talk:
//     box        the talk box element; a tap in it that hits no button skips the typing, then goes on when there
//                is only one answer
//     typing()   whether the line is still typing out
//     skip()     show the whole line now
//     choices()  the answer buttons shown now ([] while typing); saying one clicks it
//     close()    the player backs out (pad B, Esc, losing the pointer lock): end the talk your way, which calls
//                closeConversation()
//     focus      optional () => world point or null: where the NPC is, for the camera
//     hints      optional element the button hints are drawn in (talkHints), kept up to date
//   closeConversation()      hands the input back; call it however the talk ends
//   conversation.open
//   talkHints()              HTML for the hint row, with the glyphs of the input in use: confirm is Next while the line
//                            types or there is only one way on, Answer when there are choices; Pick; Leave always.
//                            On touch only "Tap to go on", when the one answer can be said by tapping the box
//
// Controls: confirm (pad A / ✕; E, Space, Enter) skips the typing, then says the selected answer. All four directions (D-pad,
// left stick, arrow keys, W and S) move the selection, repeating while held; number keys say an answer at once. Back
// (pad B / ○, Esc) leaves. Pad X / □ (interact, which opened the talk) does nothing in one. A Switch pad swaps confirm
// and back (menuSlot in src/player/controls.ts). Touch: tap the box to skip; with one answer, tap anywhere on the box
// to say it; with more, tap an answer. For TAP_GUARD_MS after the answers appear, taps on them or the box do nothing,
// so a second tap meant for the typing does not answer by accident. The selected answer has the
// class talk-sel, shown while a pad or keyboard plays (body.gamepad, or not body.touch: an iPad keeps body.touch while
// its pad plays).
import './conversation.css';
import { defineKind, spawn } from '../entity/entity.ts';
import { angleLerp } from '../math.ts';
import { setPadGrab, menuSlot, describeControl, onMenuKey, type MenuKey } from './controls.ts';
import { devInputBlocked } from './dev-input.ts';
import { modalOpen } from './modal.ts';
import { inputState } from './input.ts';
import { me, cam, camConstraints } from './player.ts';
import { camera } from '../render/scene.ts';
import { glyph, inputKind, padGlyph, keyGlyph } from './glyphs.ts';

type Point = { x: number; y: number; z: number };
export type Talk = {
  box: HTMLElement;
  typing: () => boolean;
  skip: () => void;
  choices: () => HTMLButtonElement[];
  close: () => void;
  focus?: () => Point | null;
  hints?: HTMLElement;
};

const FRAME_MS = 1400; // the camera eases toward the NPC this long after the talk opens, then leaves it to you
const FRAME_RATE = 3; // 1/s, the ease
const SIDE = 0.55; // rad: the camera looks a little past the NPC, so you and they share the shot
const LIFT_RATE = 4; // 1/s, how fast the shot lifts above the talk box (and settles back after)
const TAP_GUARD_MS = 350; // taps that land this soon after the answers appear were meant for the typing

export const conversation = { open: false };
let cur: Talk | null = null;
let sel = 0;
let selFirst: HTMLButtonElement | null = null; // the first answer button when sel was set: new buttons, new selection
let readyAt = 0; // when the answers shown now appeared
let openedAt = 0;
let hintHtml = '';
const tapped = new WeakSet<HTMLElement>();
const shot = { k: 0, lift: 0 }; // k: 0..1 eased in while talking; lift: radians the view tilts down, at k = 1

// The camera always centres you; a talk box across the middle of the screen would hide you and the NPC. Tilting the
// view down by `lift` puts you both in the middle of the space above the box (none when the box sits to one side).
function liftFor(box: HTMLElement) {
  const r = box.getBoundingClientRect();
  const w = innerWidth,
    h = innerHeight;
  if (r.left > w / 2 || r.right < w / 2 || r.top < h * 0.3) return 0;
  const frac = Math.min(0.7, (h / 2 - r.top / 2) / (h / 2));
  return Math.atan(frac * Math.tan((camera.fov * Math.PI) / 360));
}
camConstraints.push((look) => {
  if (shot.k > 0.001) look.y -= Math.tan(shot.lift * shot.k) * (cam.dist + 8); // the camera looks 8 m past `look`
  return false;
});

function sync() {
  const list = cur?.choices() ?? [];
  if (list[0] !== selFirst) {
    selFirst = list[0] ?? null;
    sel = 0;
    readyAt = performance.now();
  }
  if (sel >= list.length) sel = Math.max(0, list.length - 1);
  list.forEach((b, i) => b.classList.toggle('talk-sel', i === sel));
  return list;
}

function move(dir: number) {
  const list = sync();
  if (!list.length || cur?.typing()) return;
  sel = (sel + dir + list.length) % list.length;
  sync();
}

function say(i: number) {
  if (!cur) return;
  if (cur.typing()) return cur.skip(); // skipping the typing never also answers
  sync()[i]?.click();
}

const confirm = () => (cur?.typing() ? cur.skip() : say(sel));

function padPress(slot: string) {
  if (!cur) return;
  if (slot === menuSlot('back')) cur.close();
  else if (slot === menuSlot('confirm')) confirm();
  else if (slot === 'up' || slot === 'down' || slot === 'left' || slot === 'right')
    move(slot === 'down' || slot === 'right' ? 1 : -1);
  // x: taken so interact does nothing mid-talk (it would leave)
}

// Esc with the pointer locked only ends the lock (the page never sees the key): that ends the talk. Added on the first
// talk, after src/features/pause.ts's own listener, which skips the pause view while a talk is open.
let lockWatch = false;
function watchLock() {
  if (lockWatch) return;
  lockWatch = true;
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && inputKind() !== 'touch') cur?.close();
  });
}

export function openConversation(talk: Talk) {
  if (cur || modalOpen()) return false;
  cur = talk;
  conversation.open = true;
  document.body.classList.add('talking');
  inputState.held = true;
  openedAt = performance.now();
  selFirst = null;
  hintHtml = '';
  watchLock();
  setPadGrab(padPress, ['a', 'b', 'x', 'up', 'down', 'left', 'right'], { stick: true });
  if (!tapped.has(talk.box)) {
    tapped.add(talk.box);
    const box = talk.box;
    // Capture: runs before the answer's own click. Only real taps; say() clicks the answer itself.
    box.addEventListener(
      'click',
      (e) => {
        if (cur?.box !== box || !e.isTrusted) return;
        const list = sync(); // now, not next frame: answers a tap ago showed are new (readyAt)
        const onButton = (e.target as Element | null)?.closest('button');
        if (onButton && !list.includes(onButton as HTMLButtonElement)) return; // the close button
        if (!cur.typing() && performance.now() - readyAt < TAP_GUARD_MS) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (onButton) return;
        if (cur.typing()) cur.skip();
        else if (list.length === 1) say(0);
      },
      { capture: true },
    );
  }
  sync();
  return true;
}

export function closeConversation() {
  if (!cur) return;
  for (const b of cur.choices()) b.classList.remove('talk-sel');
  cur = null;
  conversation.open = false;
  document.body.classList.remove('talking');
  inputState.held = false;
  setPadGrab(null);
}

const hint = (glyphs: string, word: string) => `<span class="talk-hint">${glyphs}<span>${word}</span></span>`;
function talkHints() {
  const kind = inputKind();
  if (!cur) return '';
  const n = cur.typing() ? 0 : sync().length; // answers shown
  const buttons = cur.choices();
  const across = buttons.length > 1 && Math.abs(buttons[0]!.offsetTop - buttons[1]!.offsetTop) < 4;
  if (kind === 'touch') return n === 1 ? `<span class="talk-hint talk-tap"><span>Tap to go on</span></span>` : '';
  const pick =
    n < 2
      ? ''
      : kind === 'pad'
        ? hint(padGlyph(across ? 'left' : 'up') + padGlyph(across ? 'right' : 'down'), 'Pick')
        : hint(keyGlyph(across ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']), 'Pick');
  return hint(glyph('confirm'), n >= 2 ? 'Answer' : 'Next') + pick + hint(glyph('close'), 'Leave');
}

const NAV_KEYS: ReadonlySet<MenuKey> = new Set<MenuKey>(['up', 'down', 'left', 'right']);
const TALK_KEYS: ReadonlySet<MenuKey> = new Set<MenuKey>([...NAV_KEYS, 'back', 'interact', 'confirm']);

// Capture phase on window, before the game's own key handlers: it stops only the keys it answers with (Space would
// jump) and lets the rest through (H still opens the pause view).
onMenuKey((e) => {
  if (!cur || devInputBlocked() || e.modified || e.typing) return;
  const { key, digit } = e;
  if (!digit && !(key && TALK_KEYS.has(key))) return;
  e.preventDefault();
  e.stop();
  const nav = !!key && NAV_KEYS.has(key);
  if (e.repeat && !nav) return;
  if (key === 'back') cur.close();
  else if (digit) say(digit - 1);
  else if (key === 'up' || key === 'left') move(-1);
  else if (key === 'down' || key === 'right') move(1);
  else if (e.enter && document.activeElement?.closest?.('button') && cur.box.contains(document.activeElement))
    (document.activeElement as HTMLButtonElement).click(); // a button focused with Tab
  else confirm();
});

// Between the core camera (-200) and the features: the camera eases round to frame the NPC, and you turn to face them.
defineKind('conversation', { update: -60 });
spawn({
  kind: 'conversation',
  update({ dt, now }) {
    shot.k += ((cur ? 1 : 0) - shot.k) * (1 - Math.exp(-dt * LIFT_RATE));
    if (!cur) return;
    shot.lift = liftFor(cur.box);
    sync();
    if (cur.hints) {
      const html = talkHints();
      if (html !== hintHtml) {
        hintHtml = html;
        cur.hints.innerHTML = html;
        cur.hints.hidden = !html;
      }
    }
    const at = cur.focus?.();
    const p = me.body?.interpolatedPosition;
    if (!at || !p) return;
    const dx = at.x - p.x,
      dz = at.z - p.z;
    if (dx * dx + dz * dz < 0.01) return;
    const face = Math.atan2(-dx, -dz);
    me.yaw = angleLerp(me.yaw, face, 1 - Math.exp(-dt * 8));
    if (now - openedAt < FRAME_MS && !inputState.seated) {
      const k = 1 - Math.exp(-dt * FRAME_RATE);
      cam.yaw = angleLerp(cam.yaw, face + SIDE, k);
      cam.pitch += (-0.16 - cam.pitch) * k;
    }
  },
});

describeControl('talk-answer', {
  label: 'Answer in a talk',
  detail: {
    kbm: 'E, Space or Enter: next, or say the picked answer; arrow keys or W S pick; Esc leaves',
    pad: '{confirm}: next, or say the picked answer; the left stick picks too; {back} leaves',
  },
  keys: ['Digit1-8', ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']],
  pad: ['up', 'down', 'left', 'right'],
  touch: 'Tap an answer, or the box when there is one',
  group: 'friends',
  context: 'talking',
});
