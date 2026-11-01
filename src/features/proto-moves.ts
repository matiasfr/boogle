// Double jump and glide (docs/research/ratchet-and-clank-feel.md rec 6): on any ?proto= page, &jump2=1 adds a second
// jump in the air and &glide=1 a held-jump glide (src/proto/moves/, in its own chunk); on the `?play` island they are
// on while the playlist is at the moves card. Without the flags nothing loads. Serves DESIGN.md 1 (moving around is a toy).
import { protoOn } from '../proto/flags.ts';

const q = new URLSearchParams(location.search);
if (protoOn('moves') || (q.has('proto') && (q.get('jump2') === '1' || q.get('glide') === '1')))
  void import('../proto/moves/index.ts');
