// Prototype: haul variants (?room=proto-haul&proto=haul&v=wave|magnet; docs/game-design/haul.md,
// "Prototype: haul variants"). Asks which way of moving logs from the palms to the work site is the most fun, beside
// today's back bundle (no `v`). Loaded by src/features/proto-haul.ts with ?proto=haul or on the `?play` island; without
// either nothing changes. Variants reload (they change the eager haul modules, src/player/haul-variant.ts).
import { haulVariant } from '../../player/haul-variant.ts';
import { background } from '../../async.ts';
import './pickup-feel.ts'; // every variant, the back bundle too

if (haulVariant === 'wave') background(import('./wave.ts'), 'haul wave');
if (haulVariant === 'magnet') background(import('./magnet.ts'), 'haul magnet');
