// Local unread-conversation cue, owned by the railway greeters and the town residents.
import { Vector3 } from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { camera, toScreen } from '../../render/scene.ts';

export function createSpeechCue(owner: OwnedView) {
  const el = document.createElement('div');
  el.className = 'place-bark';
  el.textContent = '•••';
  el.setAttribute('aria-label', 'Something to say');
  (document.querySelector('.hud') ?? document.body).append(el);
  owner.cleanup(() => el.remove());
  const at = new Vector3();
  const screen = { x: 0, y: 0, behind: false };
  return (x: number, y: number, z: number, unread: boolean) => {
    at.set(x, y + 2.4, z);
    toScreen(at, screen);
    const on = unread && !screen.behind && camera.position.distanceToSquared(at) < 24 * 24;
    el.classList.toggle('on', on);
    if (on) el.style.transform = `translate(-50%, -100%) translate(${screen.x}px, ${screen.y}px)`;
  };
}
