// Stack-west-platforms: the planks fit between the last crossover timber and the standing train's tail.
import { LINE2, RAIL_LINES } from '../../sim/railway-lines.ts';
import { line2World, line2Y } from '../railway/line2-path.ts';
import type { GreyBox } from './boxes.ts';

export const STACK_EAST = { len: 23, lat: 4.05, w: 4.5, up: 0.9 };
export const STACK_WEST = { ...STACK_EAST, lat: -8.05 };
export const STACK_CROSSING = { from: 28.5, to: 26.9, top: 0.29, rampTop: STACK_EAST.len };
export const STACK_WEST_LEVER = { back: 22, lat: -6.3 };

export function westStands(head: number, laid: number) {
  const closes = RAIL_LINES[LINE2]!.halts[5 + head]!.closesAt;
  return laid > head && (closes === undefined || laid < head + 2);
}

/** Both end points lie on the middle of the top face, including on a pitched box. */
export function stackSpan(
  a: number,
  b: number,
  lat: number,
  low: number,
  high: number,
  w: number,
  h: number,
  colour: string,
): GreyBox {
  const p = { x: 0, z: 0 },
    q = { ...p };
  line2World(a, lat, p);
  line2World(b, lat, q);
  const dx = q.x - p.x,
    dz = q.z - p.z;
  const y = line2Y(a) + low,
    dy = line2Y(b) + high - y;
  const run = Math.hypot(dx, dz),
    pitch = Math.atan2(dy, run);
  const shift = ((h / 2) * Math.sin(pitch)) / run;
  return {
    x: (p.x + q.x) / 2 + dx * shift,
    z: (p.z + q.z) / 2 + dz * shift,
    y: y + dy / 2 - (h / 2) * Math.cos(pitch),
    w,
    h,
    d: Math.hypot(run, dy),
    yaw: Math.atan2(dx, dz),
    pitch,
    colour,
  };
}

export function stackPieces(
  r: number,
  west: boolean,
  bed: number,
  colours: { deck: string; ramp: string; pile: string; plank: string; slab: string },
) {
  const { from, to, top, rampTop } = STACK_CROSSING;
  const boxes: GreyBox[] = [],
    planks: GreyBox[] = [];
  const ramps: GreyBox[] = [];
  for (const side of west ? [STACK_EAST, STACK_WEST] : [STACK_EAST]) {
    const { lat, w, up } = side;
    function supported(a: number, b: number, level: number) {
      const box = stackSpan(a, b, lat, level, level, w, 0.5, colours.deck);
      const underside = box.y - box.h / 2;
      boxes.push(box, {
        x: box.x,
        z: box.z,
        y: (bed + underside) / 2,
        yaw: box.yaw,
        w: 0.5,
        h: underside - bed,
        d: 0.5,
        colour: colours.pile,
      });
    }
    supported(r - from, r - to, top);
    const ramp = stackSpan(r - to, r - rampTop, lat, top, up, w, 0.4, colours.ramp);
    boxes.push(ramp);
    ramps.push(ramp);
    supported(r - rampTop, r - 20, up);
    for (let back = 20; back > 0; back -= 5) supported(r - back, r - back + 5, up);
    const slip = lat + Math.sign(lat) * (w / 2 + 1),
      drop = line2Y(r) + up + 1.3;
    boxes.push(
      stackSpan(r - rampTop, r - 20, slip, up, up, 2, 0.4, colours.ramp),
      stackSpan(r - 20, r - 20 + drop / 0.54, slip, up, up - drop, 2, 0.3, colours.ramp),
    );
  }
  let slab: GreyBox | undefined;
  if (west) {
    slab = stackSpan(r - from, r - to, -2, top, top, 7.6, 0.28, colours.slab);
    slab.hidden = true;
    boxes.push(slab);
    let edge = -5.8;
    for (const end of [-4.64, -3.64, -0.64, 0.36, 1.8]) {
      planks.push(stackSpan(r - from, r - to, (edge + end) / 2, top, top, end - edge, 0.12, colours.plank));
      edge = end + 0.28;
    }
  }
  return { boxes, slab, planks, ramps };
}
