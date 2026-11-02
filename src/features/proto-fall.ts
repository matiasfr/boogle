// The fall into the world (docs/game-design/first-run.md): a player's first visit starts on a trolley on a rail above the
// clouds, and Jump in runs them off the end of it into the BOOGLE sign (src/proto/fall/, in its own chunk, so nobody else
// downloads it). ?proto=fall replays it on every load. A prototype or playlist page has its own arrival, and an automated
// browser (the scenarios, smoke, look) is always new here and has its own business to get on with. Serves DESIGN.md 10
// (Slapstick over precision).
import { isFirstVisit } from '../player/arrival.ts';
import { PLAY, PROTO, protoOn } from '../proto/flags.ts';
import { warmUp } from '../render/precompile.ts';

if (protoOn('fall') || (isFirstVisit() && !PROTO && !PLAY && !navigator.webdriver)) {
  const loaded = import('../proto/fall/index.ts');
  warmUp(() => loaded); // the loading screen waits, so the card never opens on the wrong view
}
