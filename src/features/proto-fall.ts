// The fall into the world (docs/game-design/first-run.md): behind ?proto=fall, the first visit starts on a handcar at the
// end of a rail above the clouds, and Jump in rolls you off it into the BOOGLE sign (src/proto/fall/, in its own chunk).
// Without the flag nothing loads and the game is unchanged. Serves DESIGN.md 10 (Slapstick over precision).
import { protoOn } from '../proto/flags.ts';
import { warmUp } from '../render/precompile.ts';

if (protoOn('fall')) {
  const loaded = import('../proto/fall/index.ts');
  warmUp(() => loaded); // the loading screen waits, so the card never opens on the wrong view
}
