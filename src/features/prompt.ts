// The interact prompt: what E (pad X, the touch action button) would act on, marked where it is with the button and the
// verb, "[E] Pick up" floating over the can, or "[E] Talk" in The Boogler's name tag (a target with show() draws it
// itself; see registerInteractable in src/player/hands.ts). A blocked target greys it and says so. Hidden while you wind up a
// throw, talk or have the pause view open. Serves DESIGN.md 7 (telegraph everything): you see what a press does before you press.
// It pops in with a sound and squashes when pressed (a head-shake and a deny when the press can't act);
// docs/research/ui-patterns.md, recs 1-2.
import '../ui/ui-kit.css';
import './prompt.css';
import { defineKind, spawn } from '../entity/entity.ts';
import { toScreen, view } from '../render/scene.ts';
import { me } from '../player/player.ts';
import { interactTarget, onInteractPress, type Interactable } from '../player/hands.ts';
import { uiSound, replay } from '../ui/ui-sound.ts';
import { conversation } from '../player/conversation.ts';
import { momentBusy } from '../render/buddy-frame.ts';
import { glyph } from '../player/glyphs.ts';

const onScreen = { x: 0, y: 0, behind: false };
const ui = {
  root: null as HTMLElement | null,
  html: '',
  id: '',
  since: 0,
  show: null as ((html: string) => void) | null,
  showId: '',
};

const chip = (t: Interactable) =>
  `<span class="prompt-chip${t.blocked ? ' blocked' : ''}">${glyph('interact')}<span>${t.verb}</span></span>` +
  (t.blocked ? `<span class="prompt-why">${t.blocked}</span>` : '') +
  // A second control (hands.ts, `also`), small, over the chip; on touch its button carries the word (prompt.css).
  (t.also ? `<span class="prompt-chip prompt-also">${glyph(t.also.action)}<span>${t.also.verb}</span></span>` : '');

function build() {
  const root = (ui.root = document.createElement('div'));
  root.className = 'prompt';
  root.hidden = true;
  root.innerHTML = '<div class="prompt-in"></div>';
  document.querySelector('.hud')?.append(root);
  return root;
}

defineKind('prompt', { lateUpdate: 0 });
spawn({
  kind: 'prompt',
  lateUpdate() {
    const root = ui.root ?? build();
    // Nothing in the world is offered behind an open menu (Pause, in momentBusy) or anything full-screen (an act card, a shot, a reward card, a banner): its prompts would draw over the picture it frames.
    const t = me.entered && !me.charging && !conversation.open && !momentBusy() ? interactTarget() : null;
    const html = t ? chip(t) : '';
    // A target that draws its own prompt gets the markup each frame, and '' once when it stops being the one.
    if (ui.show && (ui.showId !== t?.id || ui.show !== t.show)) ui.show('');
    ui.show = t?.show ?? null;
    ui.showId = ui.show ? t!.id : '';
    ui.show?.(html);
    const id = t && !t.show ? t.id : '';
    if (!id || !t) {
      root.hidden = true;
      ui.id = '';
      return;
    }
    const inner = root.firstChild as HTMLElement;
    if (html !== ui.html) {
      ui.html = html;
      inner.innerHTML = html;
    }
    if (id !== ui.id) {
      ui.id = id;
      ui.since = performance.now();
      inner.classList.remove('pop');
      void inner.offsetWidth; // restart the pop-in animation
      inner.classList.add('pop');
      uiSound('pop');
    }
    root.style.opacity = String(
      t.fadeAfter === undefined
        ? 1
        : Math.max(0, Math.min(1, 1 - (performance.now() - ui.since - t.fadeAfter * 1000) / 350)),
    );
    const { x, y, behind } = toScreen(t.at, onScreen);
    const visible = !behind && x > 0 && x < view.w && y > 0 && y < view.h;
    root.hidden = !visible;
    if (!visible) return;
    root.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  },
});

// A press answers within the frame, before the host does: squash and thunk, or shake and deny.
onInteractPress((t, ran) => {
  if (!t) return;
  uiSound(ran ? 'thunk' : 'deny');
  if (t.id === ui.id) replay(ui.root?.querySelector('.prompt-chip'), ran ? 'ui-press' : 'ui-nope');
});
