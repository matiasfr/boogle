// Your player id in the room (src/player/identity.ts): the pid goes to world sync (which binds it to this session for
// the host) and into presence as `u`, so others can match your avatar to your stack and plaque lines; the roster
// (src/world/rules/roster.ts) learns your name and colour from Jump in and any rename after; and a second tab of the
// same browser says it plays as a guest. Serves DESIGN.md 8 (drop-in, drop-out: you are the same player after a
// reload) and 6 (personal rewards need a person to belong to).
import { rules } from '../world/game-world.js'; // first: the lockstep rules register before anything else
import './identity.css';
import { onFrame } from '../loop.js';
import { identity } from '../player/identity.ts';
import { me } from '../player/player.js';
import { sanitizeName } from '../math.js';
import { addPresenceField } from '../netplay/net.js';
import { setPid, submitEdit, worldStatus } from '../world/sync.js';

const WHO_EVERY_MS = 3000; // at most one who.set this often (the host also refuses one that changes nothing)

identity.ready.then(({ pid, guest }) => {
  if (pid) setPid(pid);
  if (guest) showGuestNote();
});
addPresenceField('u', () => identity.pid);

// The roster says who you are from your last who.set; send one whenever it disagrees with this tab (Jump in, a
// rename, a fresh world, a room that started before you were in it).
let lastWho = -1e9;
onFrame(
  ({ now }: { now: number }) => {
    if (!me.entered || !identity.pid || now - lastWho < WHO_EVERY_MS || !worldStatus().ready) return;
    const name = sanitizeName(me.name); // the roster's own rule
    const k = rules.roster.indexOf(identity.pid);
    if (!name || (k >= 0 && rules.roster.nameOf(k) === name && rules.roster.colorOf(k) === me.colorIdx)) return;
    lastWho = now;
    submitEdit({ op: 'who.set', i: 0, j: 0, n: me.name, c: me.colorIdx });
  },
  { phase: 'late', order: 40 },
);

function showGuestNote() {
  const el = document.createElement('div');
  el.className = 'guest-note';
  el.textContent = 'second tab: playing as a guest';
  el.title = 'Another tab of this browser is already you on the island; this one gets its own stack.';
  document.body.append(el);
}
