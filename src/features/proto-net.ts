// The rail loop prototype (docs/plans/find-the-fun.md step 6): behind ?proto=net, connecting a camp puts its crates on
// the wagon, the village grows from what arrives and gives something back (src/proto/net/, in its own chunk). Without
// the flag nothing loads and the game is unchanged. Its line is `?layout=net-line` in the room `proto-net`: an address
// without them (`?proto=net`, typed by hand) reloads with them, since the layout is read before anything else.
// Serves DESIGN.md 1 (Toys before chores) and 9 (Leave something for the next visitor).
import { protoOn } from '../proto/flags.ts';

if (protoOn('net')) {
  const q = new URLSearchParams(location.search);
  if (q.get('layout') !== 'net-line' || !q.get('room')?.startsWith('proto-net')) {
    q.set('layout', 'net-line');
    if (!q.get('room')?.startsWith('proto-net')) q.set('room', 'proto-net');
    location.replace(`${location.pathname}?${q}`);
  } else void import('../proto/net/index.ts');
}
