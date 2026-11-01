// The laying-run prototype (docs/plans/find-the-fun.md step 3; loaded by src/features/proto-lay.ts behind ?proto=lay).
// `v=crawl|quick|push` picks the room's machine run (the `run` tune key, a lockstep tune.set, so every peer and the
// server play the same script); a panel switches variant, fills the open Track ring (tune.fill) so a solo tester can
// start the machine at once, and resets the haul. Every op is accepted only in a `proto-` room. The juice, the ride
// and the pushing are the real machine's (src/features/track-machine.ts).
// Serves DESIGN.md 1 (Toys before chores): is watching a section get laid the payoff or dead time?
import './lay.css';
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { submitEdit, worldStatus } from '../../world/sync.ts';
import { getRoomId } from '../../netplay/net.ts';
import { isProtoRoom } from '../../sim/tune.ts';
import { RUN_KINDS } from '../../sim/scripted-run.ts';
import { ROUTE, TRACK } from '../../sim/route.ts';

const params = new URLSearchParams(location.search);
const want = Math.max(0, RUN_KINDS.indexOf(params.get('v') as (typeof RUN_KINDS)[number]));
const proto = isProtoRoom(getRoomId());
const { sites } = rules.sites;
const HELP = [
  'Fill the ring, then Start the machine at the Track ring (E). Hop on its deck to ride.',
  'Fill the ring, then Start the machine at the Track ring (E). Hop on its deck to ride.',
  'Fill the ring, Start the machine (E), then walk into its back to push it along.',
];

const box = document.createElement('div');
box.className = 'lay-proto';
const kinds = document.createElement('div');
kinds.className = 'lay-kinds';
RUN_KINDS.forEach((name, k) => {
  const a = document.createElement('a');
  const p = new URLSearchParams(params);
  p.set('v', name);
  a.href = `?${p}`;
  a.textContent = name;
  a.classList.toggle('on', k === want);
  kinds.append(a);
});
const fill = document.createElement('button');
fill.type = 'button';
fill.textContent = 'Fill the Track ring';
const reset = document.createElement('button');
reset.type = 'button';
reset.textContent = 'Start over';
const note = document.createElement('span');
note.className = 'lay-note';
box.append(kinds, fill, reset, note);
(document.querySelector('.hud') ?? document.body).append(box);
fill.addEventListener('click', () => submitEdit({ op: 'tune.fill', i: 0, j: 0 }));
reset.addEventListener('click', () => submitEdit({ op: 'tune.reset', i: 0, j: 0 }));

// Ask for the variant until the room plays it (a run in progress refuses the change until it ends).
let asked = -1e9;
onFrame(
  ({ now }: { now: number }) => {
    const open = sites.open;
    const running = open < ROUTE.length && sites.list[open].t0 >= 0;
    const kind = rules.sites.kind();
    if (proto && worldStatus().ready && kind !== want && !running && now - asked > 1500) {
      asked = now;
      submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'run', v: want });
    }
    fill.disabled = !proto || open >= ROUTE.length || rules.sites.room(open, TRACK) <= 0;
    reset.disabled = !proto;
    note.textContent = !proto
      ? 'needs ?room=proto-lay'
      : kind !== want
        ? `switching to ${RUN_KINDS[want]}${running ? ' after this run' : '…'}`
        : open >= ROUTE.length
          ? 'Route laid. Start over to lay it again.'
          : `${RUN_KINDS[kind]} run, section ${open + 1} of ${ROUTE.length}. ${HELP[kind]}`;
  },
  { phase: 'late', order: 121 },
);
