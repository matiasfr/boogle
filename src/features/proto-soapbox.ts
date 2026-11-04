// Prototype: the soapbox cart down the rocky massif, behind `?proto=soapbox` (docs/game-design/soapbox.md). The cart,
// its sync and its run load only with the flag (src/proto/soapbox/).
//
// Without the flag a tab draws no carts, so a friend driving one would sit in mid-air: while their `soapbox` presence
// is set, their avatar is hidden instead (and shown again when it clears).
import { onFrame } from '../loop.ts';
import { remotes, onRemotePresence } from '../netplay/net.ts';
import { protoOn } from '../proto/flags.ts';
import { background } from '../async.ts';

if (protoOn('soapbox')) background(import('../proto/soapbox/index.ts'), 'soapbox prototype');
else {
  const driving = new Set<string>();
  onRemotePresence((r, pr) => {
    if (pr.soapbox) driving.add(r.peer);
    else if (driving.delete(r.peer) && r.avatar) r.avatar.visible = true;
  });
  // after the remote avatars (remote-player, update -280)
  onFrame(
    () => {
      for (const peer of driving) {
        const r = remotes.get(peer);
        if (!r) driving.delete(peer);
        else if (r.avatar) r.avatar.visible = false;
      }
    },
    { phase: 'update', order: 30 },
  );
}
