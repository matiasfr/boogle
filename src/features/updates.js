// Mixed builds. main auto-deploys while friends keep tabs open for hours, and a tab on an older build can misread
// what newer tabs send (or send what they no longer expect). This tab checks the deployed build (version.json, written
// by vite.config.js) on start, every CHECK_MS and when it comes back into view. When a newer one is out:
//   - a hidden tab (nobody is playing in it) reloads right away;
//   - a visible tab shows a small toast with a Reload button, and reloads the next time it is hidden.
// The dev server has no version.json and a dev build skips the check, so this is inert in development.
// Each player's build also rides in presence (src/netplay/builds.ts), so the net debug overlay and connection reports can
// tell a mixed room.
// Serves DESIGN.md "Designed for drop-in, drop-out" (a tab left open for hours still plays with the friends who just
// arrived) and "Determinism from day one" (mixed builds are a desync waiting to happen).
import './updates.css';
import { onStart } from '../loop.ts';
import { registerAction, freeSlots, PAD_LABEL } from '../player/controls.js';
import { BUILD } from '../netplay/builds.ts';

const CHECK_MS = 5 * 60 * 1000;
const RELOADED_FOR = 'boogle-update-reloaded-for'; // sessionStorage: the build we last reloaded to reach

const session = {
  get() {
    try {
      return sessionStorage.getItem(RELOADED_FOR);
    } catch {
      return null;
    }
  },
  set(v) {
    try {
      sessionStorage.setItem(RELOADED_FOR, v);
    } catch {
      // no storage: a stale cache could then reload a hidden tab once per check, which is harmless
    }
  },
};

let served = null; // the newer build the server has, once seen
let toast = null;

function reload() {
  if (!served) return; // the toast's pad action outlives a mismatch that went away
  session.set(served);
  location.reload();
}

// A hidden tab reloads unless it already reloaded for this very build (a stale cached page would otherwise loop).
function reloadIfHidden() {
  if (served && document.hidden && session.get() !== served) reload();
}

function showToast() {
  if (toast) return;
  toast = document.createElement('div');
  toast.className = 'update-toast';
  toast.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = 'Boogle was updated – reload to stay in sync with friends';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Reload';
  btn.addEventListener('click', reload);
  // A pad slot only if one is free (AGENTS.md); otherwise the click and the reload-when-hidden cover it.
  const pad = freeSlots()[0];
  if (
    pad &&
    registerAction('update-reload', { pad, label: 'Reload for the new version', guide: false, down: reload })
  ) {
    btn.textContent = `Reload (${PAD_LABEL[pad]})`;
  }
  toast.append(text, btn);
  document.body.append(toast);
}

async function check() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
    if (!res.ok) return;
    const build = String((await res.json())?.build ?? '').slice(0, 12);
    if (!build || build.startsWith('dev')) return;
    if (build === BUILD) {
      // Back in step (a CDN edge served an older version.json, or a deploy was rolled back): drop the toast.
      served = null;
      toast?.remove();
      toast = null;
      return;
    }
    served = build;
  } catch {
    return; // offline or no version.json: try again later
  }
  reloadIfHidden();
  if (!document.hidden) showToast();
}

if (import.meta.env.PROD && !BUILD.startsWith('dev')) {
  onStart(() => {
    check();
    setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) reloadIfHidden();
      else check();
    });
  });
}
