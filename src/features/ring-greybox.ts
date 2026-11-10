// ?ring=greybox adds Ring Island's near view, the Meet laid out at the 10 November rulings, as a walkable greybox
// (src/proto/greybox/ring.ts; docs/brainstorms/ring-island.md). Off by default; its chunk loads only behind the flag.
import { background } from '../async.ts';

if (new URLSearchParams(location.search).get('ring') === 'greybox')
  background(import('../proto/greybox/ring.ts'), 'ring greybox');
