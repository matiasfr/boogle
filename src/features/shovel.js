// Phase 3 shovel: dig / pile / flatten / aim (logic in src/world/terrain-edits.js).
import './shovel.css';
import { onFrame, onStart } from '../loop.js';
import { updateShovel, setHold } from '../world/terrain-edits.js';
import { ensureShovel } from '../player/hands.js';

onFrame(() => updateShovel());

// Touch: Pile and Flatten beside the main button (it digs while you hold the shovel), created here so index.html
// stays untouched. Pile also shows when an old save lost the shovel (body.no-shovel), and pulls out a fresh one.
onStart(() => {
  const touch = document.getElementById('touch');
  if (!touch) return;
  for (const [cls, text, kind] of [
    ['pile', 'Pile', 'pile'],
    ['flat', 'Flatten', 'flatten'],
  ]) {
    const btn = document.createElement('button');
    btn.className = `tbtn ${cls}`;
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (ensureShovel()) setHold(kind);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, () => setHold(null));
    touch.append(btn);
  }
});
