// The corner help panel (#help in index.html, H toggles body.help-hidden in src/input.js): filled from the control
// registry (src/controls.js) by src/guide.js, so it lists exactly the controls the code describes. Serves DESIGN.md's
// "drop-in, drop-out": the controls are one glance away, never a manual.
import { onStart } from '../loop.js';
import { renderGuide } from '../guide.js';

// Features describe their controls in their own onStart; a timeout runs after all of them.
onStart(() =>
  setTimeout(() => {
    document.getElementById('help')?.replaceChildren(renderGuide('kbm'));
  }, 0),
);
