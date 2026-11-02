// Prototype: play as the hero (?proto=hero). Every avatar is dressed as the hero and animated from motion alone; the body
// is src/proto/hero/clips.ts, in its own chunk. Without the flag nothing loads and the game is unchanged.
// Serves DESIGN.md 1 (moving around is a toy). Sync kind: Local (render only).
import { protoOn } from '../proto/flags.ts';

// &buddy puts the same body into any other prototype, to see how it fits there.
if (protoOn('hero') || new URLSearchParams(location.search).has('buddy'))
  void import('../proto/hero/clips.ts').then((m) => m.startClipsHero());
