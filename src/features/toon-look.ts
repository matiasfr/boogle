// ?toon=a|b|c: the toon-shading candidates for the owner's look comparison (src/debug/toon-shading.ts,
// docs/research/toon-shading.md). Local and client-only; off by default, and its chunk loads only behind the flag.
import { background } from '../async.ts';

const mode = new URLSearchParams(location.search).get('toon');
if (mode === 'a' || mode === 'b' || mode === 'c')
  background(
    import('../debug/toon-shading.ts').then((m) => m.installToon(mode)),
    'toon shading candidate',
  );
