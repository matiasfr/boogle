import { CAMP_PAD, HALL_PAD, facing } from '../place/works-landing.ts';
import { job } from '../sim/railway-rows.ts';
import { railwayMirror } from '../world/game-world.ts';
import { remotes } from '../netplay/net.ts';

export function worksLanding() {
  const pad = railwayMirror?.synced() && job(railwayMirror.confirmed(), 2).completion !== 1 ? CAMP_PAD : HALL_PAD;
  // A friend's standing body is solid. Leave a clear approach beside them through the whole descent.
  const visitors = [...remotes.values()].filter(peer => peer.entered && peer.avatar);
  for (const side of [0, 3, -3]) {
    const x = pad.x + side * Math.cos(pad.yaw);
    const z = pad.z - side * Math.sin(pad.yaw);
    if (visitors.every(peer => Math.hypot(peer.target.x - x, peer.target.z - z) > 2.5))
      return side === 0 ? pad : facing(x, z, pad.focus);
  }
  return pad;
}
