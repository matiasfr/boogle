// Prototype: haul variants (?room=proto-haul&proto=haul&v=barrow|toss; docs/game-design/haul.md, "Prototype: haul
// variants"). Asks which way of moving logs from the palms to the work site is the most fun, beside today's back
// bundle (no `v`). Loaded by src/features/haul-kit.ts with ?proto=haul; without the flag nothing changes.
import { haulVariant } from '../../player/haul-variant.ts';
import './pickup-feel.ts'; // every variant, the back bundle too

if (haulVariant === 'barrow') import('./barrow.ts');
if (haulVariant === 'toss') import('./toss.ts');
