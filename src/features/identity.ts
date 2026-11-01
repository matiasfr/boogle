// Your player id in the room (src/player/identity.ts): the pid goes into presence as `pid`, so others can match your
// avatar to your stack and plaque lines; the roster (src/world/rules/roster.ts) learns your name and colour from Jump
// in and any rename after; and when a newer tab of this browser takes over, this one says so and offers to play here. Serves DESIGN.md 8 (drop-in, drop-out: you are the same player after a
// reload) and 6 (personal rewards need a person to belong to).
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import './identity.css';
import { onFrame } from '../loop.ts';
import { identity } from '../player/identity.ts';
import { me } from '../player/player.ts';
import { sanitizeName } from '../math.ts';
import { addPresenceField, net, onNetState } from '../netplay/net.ts';
import { submitEdit, worldStatus } from '../world/sync.ts';

const WHO_EVERY_MS = 3000; // at most one who.set this often (the host also refuses one that changes nothing)

addPresenceField('pid', () => identity.pid);

// The roster says who you are from your last who.set; send one whenever it disagrees with this tab (Jump in, a
// rename, a fresh world, a room that started before you were in it).
let lastWho = -1e9;
onFrame(
  ({ now }: { now: number }) => {
    if (!me.entered || now - lastWho < WHO_EVERY_MS || !worldStatus().ready) return;
    const name = sanitizeName(me.name); // the roster's own rule
    const k = rules.roster.indexOf(identity.pid);
    if (!name || (k >= 0 && rules.roster.nameOf(k) === name && rules.roster.colorOf(k) === me.colorIdx)) return;
    lastWho = now;
    submitEdit({ op: 'who.set', i: 0, j: 0, n: me.name, c: me.colorIdx });
  },
  { phase: 'late', order: 40 },
);

// The server dropped this tab for a newer one of the same player. Play here reloads, which makes this tab the newer one.
let shown = false;
onNetState((state) => {
  if (state !== 'solo' || net.error !== 'elsewhere' || shown) return;
  shown = true;
  const el = document.createElement('div');
  el.className = 'elsewhere';
  el.innerHTML = `<div class="elsewhere-card"><p>You're playing in another tab.</p><button type="button">Play here</button></div>`;
  el.querySelector('button')!.addEventListener('click', () => location.reload());
  document.body.append(el);
});
