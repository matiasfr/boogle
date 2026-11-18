// One modal at a time (the pause view, the garage): it takes this player's keys and gamepad, the game
// keeps running behind it. Local input only: no sim or network state.
//
//   openModal({ onKey, onPad, passKeys })
//                                 false if another modal is open. Otherwise it takes ownership: held keys are released,
//                                 the pointer lock is dropped, keydown goes to onKey(press: a MenuPress, see controls.ts) (the game's own key handlers
//                                 never see it) and new pad presses go to onPad(slot). passKeys: the view reads its own
//                                 keys (onMenuKey, wrapped actions, as the garage does), so they go on as without a modal;
//                                 it is still the one modal, and Pause does not open over it or when it drops the lock.
//   closeModal()                  hands the keys and the pad back
//   modalOpen()                   whether one is open
import { releaseInput } from './input.ts';
import { setPadModal, onMenuKey } from './controls.ts';
import type { MenuPress } from './controls.ts';

type Modal = { onKey?: (press: MenuPress) => void; passKeys: boolean };
let cur: Modal | null = null;

export const modalOpen = () => cur !== null;

export function openModal({
  onKey,
  onPad,
  passKeys = false,
}: {
  onKey?: (press: MenuPress) => void;
  onPad?: ((slot: string) => void) | null;
  passKeys?: boolean;
}) {
  if (cur) return false;
  cur = { onKey, passKeys };
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
onMenuKey((press) => {
  if (!cur || cur.passKeys) return;
  press.stop(); // nothing after this sees the key, not even the other listeners on window
  cur.onKey?.(press);
});
onMenuKey((press) => cur && !cur.passKeys && press.stop(), { edge: 'up' });
