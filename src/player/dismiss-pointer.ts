// Local pointer dismissal for the reward card, and the one skip of a celebration camera's shot (skipInput).
// Each owner installs its listeners in place and keeps its own touch, timing gate and reset.
import { onMenuKey, padGrab, setPadGrab, slotFor } from './controls.ts';

export function dismissPointer(active: () => boolean, ready: () => boolean, press: () => void, signal?: AbortSignal) {
  let touch: { id: number; x: number; y: number; moved: boolean } | null = null;
  const reset = () => {
    touch = null;
  };
  const dismiss = (e: PointerEvent) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    press();
  };
  addEventListener(
    'pointerdown',
    (e) => {
      if (!active()) return;
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        const target = e.target instanceof Element ? e.target : null;
        if (target?.closest('.tbtn, #stick') || (target?.closest('#touch') && e.clientX < innerWidth * 0.45)) return;
        if (!ready()) return;
        touch = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      } else dismiss(e);
    },
    { capture: true, signal },
  );
  addEventListener(
    'pointermove',
    (e) => {
      if (touch?.id === e.pointerId && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > 10) touch.moved = true;
    },
    { capture: true, signal },
  );
  addEventListener(
    'pointerup',
    (e) => {
      if (touch?.id !== e.pointerId) return;
      const tap = !touch.moved;
      reset();
      if (active() && tap) dismiss(e);
    },
    { capture: true, signal },
  );
  addEventListener('pointercancel', reset, { capture: true, signal });
  return reset;
}

/** A cinematic plays to its end: no key, click, tap, wheel, mouse move, pad button or stick ends it (owner, 9 November).
 * The one way out is Interact while `ready()` (its glyph is on screen): E, its pad slot, or the touch Grab button. That
 * press skips and goes no further, so it never also acts in the world; before `ready()` Interact is ordinary. */
export function skipInput(ready: () => boolean, press: () => void, signal: AbortSignal) {
  let upToo = false; // the release of a press that skipped is the skip's as well
  onMenuKey(
    (e) => {
      if (e.key !== 'interact' || e.repeat || e.modified || e.typing || !ready()) return;
      e.preventDefault();
      e.stop();
      upToo = true;
      press();
    },
    { signal },
  );
  onMenuKey(
    (e) => {
      if (e.key !== 'interact' || !upToo) return;
      upToo = false;
      e.stop();
    },
    { edge: 'up', signal },
  );
  let touch: number | null = null;
  const grabButton = (e: PointerEvent) => e.target instanceof Element && !!e.target.closest('#btn-grab');
  addEventListener(
    'pointerdown',
    (e) => {
      if (!ready() || !grabButton(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      touch = e.pointerId;
      press();
    },
    { capture: true, signal },
  );
  for (const event of ['pointerup', 'pointercancel'])
    addEventListener(
      event,
      (e) => {
        if ((e as PointerEvent).pointerId !== touch) return;
        touch = null;
        e.stopImmediatePropagation();
      },
      { capture: true, signal },
    );
  // The pad: Interact's slot, taken through the controls' grab only while the skip is offered.
  let mine: ReturnType<typeof setPadGrab> = null;
  const release = () => {
    if (mine && padGrab() === mine) setPadGrab(null);
    mine = null;
  };
  signal.addEventListener('abort', release);
  return {
    /** Each frame: hold Interact's pad slot while the skip is offered, and let go when it isn't. */
    update() {
      if (!ready()) return release();
      if (padGrab() === mine && mine) return;
      if (padGrab()) return; // a talk box or card has the pad; it gives it back when it closes
      mine = setPadGrab(() => {
        if (ready()) press();
      }, [slotFor('interact') ?? 'x']);
    },
    release,
  };
}
