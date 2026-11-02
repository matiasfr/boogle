// Prototype: play as the jointed hero (?proto=hero). Every avatar is dressed as the hero and posed from motion alone;
// the body is src/proto/hero/index.ts, in its own chunk. Without the flag nothing loads and the game is unchanged.
// Serves DESIGN.md 1 (moving around is a toy). Sync kind: Local (render only).
import { protoOn } from '../proto/flags.ts';

if (protoOn('hero')) void import('../proto/hero/index.ts');
