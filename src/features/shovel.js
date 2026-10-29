// Phase 3 shovel: dig / pile / flatten / aim (logic in src/world/terrain-edits.js).
import './shovel.css';
import { onFrame, onStart } from '../loop.js';
import { updateShovel, setHold } from '../world/terrain-edits.js';

onFrame(() => updateShovel());

// Touch: a Flatten button next to Dig and Pile (created here so index.html stays untouched).
onStart(() => {
  const help = document.getElementById('help');
  for (const [key, text] of [
    ['Q', 'Dig (hold to repeat, no shovel mode needed)'],
    ['Z', 'Pile up sand'],
    ['Shift+click', 'Flatten toward your feet'],
  ]) {
    const row = document.createElement('div');
    const kbd = document.createElement('kbd');
    kbd.textContent = key;
    const span = document.createElement('span');
    span.textContent = text;
    row.append(kbd, span);
    help?.append(row);
  }
  const touch = document.getElementById('touch');
  if (!touch) return;
  const btn = document.createElement('button');
  btn.className = 'tbtn flat';
  btn.type = 'button';
  btn.textContent = 'Flatten';
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    setHold('flatten');
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, () => setHold(null));
  touch.append(btn);
});
