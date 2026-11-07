// Profile target for option E (node --cpu-prof prof-e.ts): 4,000 ticks at 3,000 entities.
import { fresh, tickOps } from './bench.ts';
import { createE } from './e.ts';

const s = fresh(createE, 3000);
for (let k = 0; k < 4000; k++) {
  tickOps(s, 3000);
  s.view.sync();
}
