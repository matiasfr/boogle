// Local pointer dismissal shared by the reward card and celebration camera.
// Each owner installs its listeners in place and keeps its own touch, timing gate and reset.
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

/** A cinematic yields to any new input. Observe without swallowing it, so that same input resumes play. */
export function dismissInput(active: () => boolean, press: () => void, signal: AbortSignal) {
  const dismiss = () => {
    if (active()) press();
  };
  addEventListener(
    'keydown',
    (e) => {
      if (!e.repeat) dismiss();
    },
    { capture: true, signal },
  );
  for (const event of ['pointerdown', 'pointermove', 'wheel'])
    addEventListener(event, dismiss, { capture: true, passive: true, signal });
  const buttons = () =>
    [...(navigator.getGamepads?.() ?? [])].flatMap((pad) =>
      pad ? pad.buttons.map((b) => b.pressed || b.value > 0.2) : [],
    );
  let previous: boolean[] = [];
  return {
    reset: () => {
      previous = buttons();
    },
    update() {
      if (!active()) return;
      const next = buttons();
      const moved = [...(navigator.getGamepads?.() ?? [])].some((pad) =>
        pad?.axes.some((axis) => Math.abs(axis) > 0.2),
      );
      if (moved || next.some((down, k) => down && !previous[k])) press();
      previous = next;
    },
  };
}
