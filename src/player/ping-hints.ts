import { Line3, Vector3 } from 'three';

type Hint = { k: 'train' | 'rails'; at: Vector3 };
type Probe = (aim: Line3) => Hint | undefined;
const hints = new Set<Probe>();
export function addPingHint(fn: Probe) {
  hints.add(fn);
  return () => hints.delete(fn);
}

export function pingHint(from: Vector3, to: Vector3) {
  const aim = new Line3(from, to);
  let best: Hint | undefined;
  for (const probe of hints) {
    const hint = probe(aim);
    if (
      hint &&
      (!best ||
        (hint.k === 'train' && best.k === 'rails') ||
        (best.k === hint.k && from.distanceToSquared(hint.at) < from.distanceToSquared(best.at)))
    )
      best = hint;
  }
  return best;
}

// Distance to a rectangular deck along the aim is convex. In deck coordinates clamp the
// nearest aim point to its surface.
export function nearPingDeck(aim: Line3, centre: Vector3, yaw: number, hx: number, hz: number) {
  const up = new Vector3(0, 1, 0);
  const toLocal = (point: Vector3) => point.clone().sub(centre).applyAxisAngle(up, -yaw);
  const local = new Line3(toLocal(aim.start), toLocal(aim.end));
  const point = new Vector3(),
    deck = new Vector3();
  function distance(t: number) {
    local.at(t, point);
    deck.set(Math.max(-hx, Math.min(hx, point.x)), 0, Math.max(-hz, Math.min(hz, point.z)));
    return point.distanceToSquared(deck);
  }
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 40; i++) {
    const third = (hi - lo) / 3;
    if (distance(lo + third) <= distance(hi - third)) hi -= third;
    else lo += third;
  }
  return distance((lo + hi) / 2) <= 9 ? deck.applyAxisAngle(up, yaw).add(centre) : undefined;
}
