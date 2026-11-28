// Local unread-conversation cue, owned by the railway greeters and the town residents.
import type { Vector3 } from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { camera, toScreen, view } from '../../render/scene.ts';

/** One bubble, two contents. Forward `show` from the Talk target, then `update` after prompts and the camera. */
export function createSpeechCue(owner: OwnedView, at: Vector3, line?: string) {
  const el = document.createElement('div');
  el.className = 'speech-cue';
  el.hidden = true;
  const inner = document.createElement('div');
  inner.className = 'prompt-in';
  const chip = document.createElement('span');
  chip.className = 'prompt-chip';
  inner.append(chip);
  if (line) {
    const words = document.createElement('span');
    words.className = 'speech-line';
    words.textContent = line;
    inner.prepend(words);
  }
  el.append(inner);
  (document.querySelector('.hud') ?? document.body).append(el);
  owner.cleanup(() => el.remove());
  const screen = { x: 0, y: 0, behind: false };
  let prompt = '';
  let shown = '';
  const markup = document.createElement('template');
  return {
    // The prompt feature supplies the actual keyboard/pad/touch markup, and clears it on losing the pick.
    show(html: string) {
      prompt = html;
    },
    update(unread: boolean) {
      const html = prompt || (unread ? line || '…' : '');
      if (html !== shown) {
        shown = html;
        if (prompt) {
          markup.innerHTML = prompt;
          // Keep the bubble itself: only its glyph and label children change.
          chip.replaceChildren(...markup.content.firstElementChild!.childNodes);
        } else chip.textContent = line ? '' : html;
        chip.hidden = !!line && !prompt;
        el.classList.toggle('unread', !prompt);
        el.setAttribute('aria-label', line || (prompt ? 'Talk' : 'Something to say'));
      }
      toScreen(at, screen);
      el.hidden = !(
        html &&
        !screen.behind &&
        screen.x > 0 &&
        screen.x < view.w &&
        screen.y > 0 &&
        screen.y < view.h &&
        (prompt || camera.position.distanceToSquared(at) < (line ? 9 * 9 : 24 * 24))
      );
      if (!el.hidden) el.style.transform = `translate(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px)`;
    },
  };
}
