// Prototype: haul variants (?room=proto-haul&proto=haul&v=barrow|toss|wave|magnet; docs/game-design/haul.md,
// "Prototype: haul variants"). Asks which way of moving logs from the palms to the work site is the most fun, beside
// today's back bundle (no `v`). Loaded by src/features/proto-haul.ts with ?proto=haul or on the `?play` island; without
// either nothing changes. Variants reload (they change the eager haul modules, src/player/haul-variant.ts).
import { haulVariant, BARROW_CAP } from '../../player/haul-variant.ts';
import { onFrame } from '../../loop.ts';
import { rules } from '../../world/game-world.ts';
import { submitEdit, worldStatus } from '../../world/sync.ts';
import { HARD_CAP } from '../../sim/stacks.ts';
import { ON_ISLAND } from '../flags.ts';
import './pickup-feel.ts'; // every variant, the back bundle too

if (haulVariant === 'barrow') import('./barrow.ts');
if (haulVariant === 'toss') import('./toss.ts');
if (haulVariant === 'wave') import('./wave.ts');
if (haulVariant === 'magnet') import('./magnet.ts');

// The island is one room for every variant: the barrow raises the room's hard cap to its tray (./barrow.ts), so
// another way of hauling puts the usual cap back once the room's state is here.
if (ON_ISLAND && haulVariant !== 'barrow') {
  let done = false;
  onFrame(
    () => {
      if (done || !worldStatus().ready) return;
      done = true;
      if (rules.tune.tune.v.hard === BARROW_CAP) submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'hard', v: HARD_CAP });
    },
    { phase: 'late', order: 122 },
  );
}
