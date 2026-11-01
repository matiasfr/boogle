// One modal at a time (the pause view): it takes this player's keys and gamepad, the game
// keeps running behind it. Local input only: no sim or network state.
//
//   openModal({ onKey, onPad })   false if another modal is open. Otherwise it takes ownership: held keys are released,
//                                 the pointer lock is dropped, keydown goes to onKey(e) (the game's own key handlers
//                                 never see it) and new pad presses go to onPad(slot).
//   closeModal()                  hands the keys and the pad back
//   modalOpen()                   whether one is open
import { releaseInput } from './input.ts';
import { setPadModal } from './controls.ts';

type Modal = { onKey?: (e: KeyboardEvent) => void };
let cur: Modal | null = null;

export const modalOpen = () => cur !== null;

export function openModal({
  onKey,
  onPad,
}: {
  onKey?: (e: KeyboardEvent) => void;
  onPad?: ((slot: string) => void) | null;
}) {
  if (cur) return false;
  cur = { onKey };
  releaseInput();
  setPadModal(onPad ?? null);
  if (document.pointerLockElement) document.exitPointerLock();
  return true;
}

export function closeModal() {
  if (!cur) return;
  cur = null;
  setPadModal(null);
}

// Capture phase on window: runs before the game's own key handlers and stops them while a modal is open.
addEventListener(
  'keydown',
  (e) => {
    if (!cur) return;
    e.stopImmediatePropagation(); // nothing after this sees the key, not even the other listeners on window
    cur.onKey?.(e);
  },
  { capture: true },
);
addEventListener('keyup', (e) => cur && e.stopImmediatePropagation(), { capture: true });
