// ?blockout=world adds the whole map's walkable massing to the live game, in any build (docs/plans/world-blockout.md).
// Off by default; its chunk loads only behind the flag, so the bare game neither downloads nor runs it.
import { background } from '../async.ts';

if (new URLSearchParams(location.search).get('blockout') === 'world')
  background(import('../proto/greybox/blockout.ts'), 'world blockout');
