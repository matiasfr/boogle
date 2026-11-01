// The prototype bar with a gamepad or keys (docs/plans/find-the-fun.md, "One path"): D-pad down (or P) opens the bar
// as a modal (src/player/modal.ts) the way Menu opens the pause view. The D-pad moves between the bar's buttons row by
// row, A presses (on the note box it opens the keyboard: iOS dictation works there), LB / RB go to the previous / next
// toy, B or Menu closes. Keys: arrows, Enter, [ and ], Esc or P. The game keeps running behind it. Local input only.
import { registerAction, menuSlot } from '../../player/controls.ts';
import { openModal, closeModal } from '../../player/modal.ts';
import { me } from '../../player/player.ts';

/** Puts the bar under the pad: `prev` / `next` move the playlist (no-ops off the playlist). */
export function padBar(bar: HTMLElement, opts: { prev: () => void; next: () => void; unfold: () => void }) {
  let open = false;
  let row = 0;
  let col = 0;

  // The bar's rows of controls, top to bottom, as they are drawn now (a step change rebuilds them).
  const rows = () =>
    [...bar.querySelectorAll<HTMLElement>('.pb-row, .pb-note')]
      .filter((r) => r.offsetParent !== null)
      .map((r) => (r.matches('input') ? [r] : [...r.querySelectorAll<HTMLElement>('button, input')]))
      .filter((r) => r.length);

  function focus() {
    const rs = rows();
    if (!rs.length) return;
    row = Math.max(0, Math.min(rs.length - 1, row));
    col = Math.max(0, Math.min(rs[row].length - 1, col));
    for (const b of bar.querySelectorAll<HTMLElement>('[data-focus]')) delete b.dataset.focus;
    const el = rs[row][col];
    el.dataset.focus = '1';
    if (!el.matches('input')) el.focus({ preventScroll: true });
  }
  const move = (dr: number, dc: number) => {
    const rs = rows();
    if (dr) {
      // keep roughly the same horizontal place when the next row has more or fewer buttons
      const share = rs[row] ? (col + 0.5) / rs[row].length : 0;
      row = (row + dr + rs.length) % rs.length;
      col = Math.floor(share * (rs[row]?.length ?? 1));
    } else col = (col + dc + (rs[row]?.length ?? 1)) % (rs[row]?.length ?? 1);
    focus();
  };
  const press = () => {
    const el = bar.querySelector<HTMLElement>('[data-focus]');
    if (!el) return;
    if (el.matches('input')) el.focus();
    else el.click();
    requestAnimationFrame(focus); // the press may have redrawn the row
  };

  function close() {
    if (!open) return;
    open = false;
    bar.classList.remove('pad');
    for (const b of bar.querySelectorAll<HTMLElement>('[data-focus]')) delete b.dataset.focus;
    (document.activeElement as HTMLElement | null)?.blur?.();
    closeModal();
  }
  function onKey(e: KeyboardEvent) {
    const typing = (e.target as HTMLElement | null)?.matches?.('input, textarea');
    if (typing) {
      if (e.code === 'Escape' || e.code === 'Enter') (e.target as HTMLElement).blur();
      return;
    }
    const k = e.code;
    if (k === 'Escape' || k === 'KeyP') close();
    else if (k === 'ArrowUp') move(-1, 0);
    else if (k === 'ArrowDown') move(1, 0);
    else if (k === 'ArrowLeft') move(0, -1);
    else if (k === 'ArrowRight') move(0, 1);
    else if (k === 'Enter' || k === 'Space') press();
    else if (k === 'BracketLeft') opts.prev();
    else if (k === 'BracketRight') opts.next();
    else return;
    e.preventDefault();
  }
  function onPad(slot: string) {
    if (slot === 'up') move(-1, 0);
    else if (slot === 'down') move(1, 0);
    else if (slot === 'left') move(0, -1);
    else if (slot === 'right') move(0, 1);
    else if (slot === 'lb') opts.prev();
    else if (slot === 'rb') opts.next();
    else if (slot === menuSlot('confirm')) press();
    else if (slot === menuSlot('back') || slot === 'menu') {
      if (document.activeElement?.matches?.('input')) (document.activeElement as HTMLElement).blur();
      else close();
    }
  }
  function openBar() {
    if (open || !me.entered || !openModal({ onKey, onPad })) return;
    open = true;
    opts.unfold();
    bar.classList.add('pad');
    row = 0;
    col = 0;
    focus();
  }

  registerAction('proto-bar', {
    pad: 'down',
    key: 'KeyP',
    label: 'Prototype bar',
    detail: 'Next toy, variants and your verdict',
    group: 'menu',
    down: openBar,
  });
  return { refocus: () => open && requestAnimationFrame(focus), close };
}
