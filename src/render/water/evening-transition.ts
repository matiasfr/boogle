// Local visual proof only. A future accepted milestone may call setEveningLook after T1.
// No clock, save, room message or gameplay availability belongs here.
import { smoothstep } from '../../math-pure.ts';

let request: ((evening: boolean) => boolean) | undefined;

/** Returns false when the opt-in sea is unavailable or a fade is already running. */
export function setEveningLook(evening = true): boolean {
  return request?.(evening) ?? false;
}

export function createEveningTransition(initial: boolean, select: (evening: boolean) => void) {
  const veil = document.createElement('div');
  veil.setAttribute('aria-hidden', 'true');
  veil.style.cssText = 'position:fixed;inset:0;background:#17151d;pointer-events:none;z-index:9999;display:none';
  document.body.append(veil);
  let current = initial,
    target = initial,
    elapsed = 0,
    phase: 'idle' | 'out' | 'covered' | 'in' = 'idle';
  const start = (evening: boolean) => {
    if (phase !== 'idle') return false;
    if (evening === current) return true;
    target = evening;
    elapsed = 0;
    phase = 'out';
    veil.style.opacity = '0';
    veil.style.display = 'block';
    return true;
  };
  request = start;
  return {
    update(dt: number) {
      if (phase === 'idle') return;
      elapsed += dt;
      if (phase === 'out') {
        const t = Math.min(elapsed / 0.45, 1);
        veil.style.opacity = String(smoothstep(0, 1, t));
        if (t === 1) phase = 'covered';
      } else if (phase === 'covered') {
        // Keep the veil opaque across the update that exchanges the whole lighting package.
        select(target);
        current = target;
        elapsed = 0;
        phase = 'in';
      } else {
        const t = Math.min(elapsed / 0.65, 1);
        veil.style.opacity = String(1 - smoothstep(0, 1, t));
        if (t === 1) {
          phase = 'idle';
          veil.style.display = 'none';
        }
      }
    },
    inspect: () => ({ current: current ? 'evening' : 'day', target: target ? 'evening' : 'day', phase }),
    dispose() {
      if (request === start) request = undefined;
      veil.remove();
    },
  };
}
