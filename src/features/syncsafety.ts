// Desync visibility, dev only: with `?netdebug=1` this loads src/debug/netdebug.ts (overlay and desync dumps) in its
// own chunk, so normal players never download it (src/loop.ts, "Lazy parts").
import { background } from '../async.ts';

if (Number(new URLSearchParams(location.search).get('netdebug')) > 0)
  background(import('../debug/netdebug.ts'), 'network debug');
