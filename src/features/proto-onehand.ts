// Prototype: one thing in your hands, no hotbar (?proto=onehand; src/proto/onehand/, in its own chunk). Without the flag
// nothing loads and the game is unchanged. Its own room, `proto-onehand`, so what it drops stays out of the main island;
// an address without it reloads with it. Serves DESIGN.md 1 (Toys before chores).
import { protoOn } from '../proto/flags.ts';

if (protoOn('onehand')) {
  const q = new URLSearchParams(location.search);
  if (!q.get('room')?.startsWith('proto-onehand')) {
    q.set('room', 'proto-onehand');
    location.replace(`${location.pathname}?${q}`);
  } else void import('../proto/onehand/index.ts');
}
