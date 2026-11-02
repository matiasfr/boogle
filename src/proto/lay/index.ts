// The laying-run prototype (docs/plans/find-the-fun.md step 3; loaded by src/features/proto-lay.ts behind ?proto=lay).
// The run itself is the game's (src/features/track-machine.ts, 14 s); this panel only helps a solo tester: it fills
// the open Track ring (tune.fill) so the machine can start at once, and resets the haul. Every op is accepted only in a
// `proto-` room.
// Serves DESIGN.md 1 (Toys before chores): is watching a section get laid the payoff or dead time?
import './lay.css';
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { submitEdit } from '../../world/sync.ts';
import { getRoomId } from '../../netplay/net.ts';
import { isProtoRoom } from '../../sim/tune.ts';
import { ROUTE, TRACK } from '../../sim/route.ts';
import { playPanel } from '../flags.ts';

const proto = isProtoRoom(getRoomId());
const { sites } = rules.sites;

const box = document.createElement('div');
box.className = 'lay-proto';
const fill = document.createElement('button');
fill.type = 'button';
fill.textContent = 'Fill the Track ring';
const reset = document.createElement('button');
reset.type = 'button';
reset.textContent = 'Start over';
const note = document.createElement('span');
note.className = 'lay-note';
box.append(fill, reset, note);
(document.querySelector('.hud') ?? document.body).append(box);
playPanel('lay', box);
fill.addEventListener('click', () => submitEdit({ op: 'tune.fill', i: 0, j: 0 }));
reset.addEventListener('click', () => submitEdit({ op: 'tune.reset', i: 0, j: 0 }));

onFrame(
  () => {
    const open = sites.open;
    fill.disabled = !proto || open >= ROUTE.length || rules.sites.room(open, TRACK) <= 0;
    reset.disabled = !proto;
    note.textContent = !proto
      ? 'needs ?room=proto-lay'
      : open >= ROUTE.length
        ? 'Route laid. Start over to lay it again.'
        : `Section ${open + 1} of ${ROUTE.length}. Fill the ring, then Start the machine at the Track ring (E). Hop on its deck to ride.`;
  },
  { phase: 'late', order: 121 },
);
