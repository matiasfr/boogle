// Dev-time completeness check for the control registry (src/controls.js): once every feature has started, warn about
// any control that is missing a label or group, has keys or touch but no pad binding, or shares a key. Serves
// AGENTS.md's "every control is playable on a gamepad" and keeps the generated guide complete.
import { onStart } from '../loop.js';
import { controlProblems } from '../controls.js';

// Features describe controls in their own onStart; a timeout runs after all of them.
if (import.meta.env.DEV) {
  onStart(() =>
    setTimeout(() => {
      for (const p of controlProblems()) console.warn(`[controls] ${p}`);
    }, 0),
  );
}
