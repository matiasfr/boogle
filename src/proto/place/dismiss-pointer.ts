// Local pointer dismissal shared by the reward card and celebration camera.
// Each owner installs its listeners in place and keeps its own touch, timing gate and reset.
export function dismissPointer(active: () => boolean, ready: () => boolean, press: () => void) {
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
    { capture: true },
  );
  addEventListener(
    'pointermove',
    (e) => {
      if (touch?.id === e.pointerId && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > 10) touch.moved = true;
    },
    { capture: true },
  );
  addEventListener(
    'pointerup',
    (e) => {
      if (touch?.id !== e.pointerId) return;
      const tap = !touch.moved;
      reset();
      if (active() && tap) dismiss(e);
    },
    { capture: true },
  );
  addEventListener('pointercancel', reset, { capture: true });
  return reset;
}
