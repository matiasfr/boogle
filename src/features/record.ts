// `?record=1`: records this session's inputs for `npm run sim -- replay` (dev/sim/README.md). Off, this line is all it costs.
import { onStart } from '../loop.ts';
import { background } from '../async.ts';

if (new URLSearchParams(location.search).has('record'))
  onStart(() => background(import('../debug/record.ts'), 'input recorder'));
