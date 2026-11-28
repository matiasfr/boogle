import { Line3, Vector3 } from 'three';
import type { OwnedView } from '../../render/owned-view.ts';
import { disc } from '../frisbee/state.ts';
import { continuous } from './play.ts';

export function discPath(owner: OwnedView) {
  const path = new Line3();
  let mine = disc.mine,
    epoch = -1,
    previousSpeed = 0,
    time = NaN;
  const reset = () => {
    time = NaN;
  };
  document.addEventListener('visibilitychange', reset);
  owner.cleanup(() => document.removeEventListener('visibilitychange', reset));
  return (now: number) => {
    path.start.copy(path.end);
    path.end.copy(disc.p);
    const visible = !document.hidden && disc.enabled && !disc.held;
    const speed = disc.v.length();
    // Landing clears velocity after moving. The incoming speed bounds that final segment.
    const valid =
      visible &&
      mine === disc.mine &&
      continuous(epoch, disc.e, path.distance(), speed || previousSpeed, (now - time) / 1000);
    previousSpeed = speed;
    mine = disc.mine;
    epoch = disc.e;
    time = visible ? now : NaN;
    return valid ? path : null;
  };
}
const closest = new Vector3();
export function enters(path: Line3 | null, centre: Vector3, radius: number) {
  return (
    !!path &&
    path.start.distanceToSquared(centre) > radius ** 2 &&
    path.closestPointToPoint(centre, true, closest).distanceToSquared(centre) <= radius ** 2
  );
}
