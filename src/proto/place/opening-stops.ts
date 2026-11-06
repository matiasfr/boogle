// Connected scenery uses one assembly datum; only ground-bearing piers extend into the terrain.
import { H } from './terrain.ts';
import { toWorld, BANK_CART } from './layout.ts';
import { boxFootprint, sampleFootprint } from './support.ts';
export function openingStops() {
  const rock = '#9a9184',
    wood = '#7f5630';
  const row = (
    id: string,
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    base: number,
    yaw = 0,
    supports: string[] = [],
  ) => ({
    id,
    kind: 'stop',
    x: toWorld(x),
    z,
    w,
    h,
    d,
    color,
    y: base - H(toWorld(x), z),
    base,
    yaw,
    supports,
    seat: base,
  });
  const ground = (x: number, z: number, w: number, d: number, yaw = 0) =>
    sampleFootprint(boxFootprint(toWorld(x), z, w, d, yaw));
  const rows: ReturnType<typeof row>[] = [];
  const pier = (id: string, x: number, z: number, w: number, d: number, top: number, color: string, yaw = 0) => {
    const g = ground(x, z, w, d, yaw),
      base = g.low - 0.02;
    const p = row(id, x, z, w, top - base, d, color, base, yaw);
    p.seat = g.high;
    rows.push(p);
    return p;
  };
  const arch = (id: string, ax: number, az: number, bx: number, bz: number, height: number) => {
    const x = (ax + bx) / 2,
      z = (az + bz) / 2,
      yaw = -Math.atan2(bz - az, bx - ax),
      w = Math.hypot(bx - ax, bz - az) + 4;
    const top = ground(x, z, w, 4, yaw).high + height;
    const a = pier(id + '/west', ax, az, 3, 3.4, top, rock),
      b = pier(id + '/east', bx, bz, 3, 3.4, top, rock);
    rows.push(row(id + '/beam', x, z, w, 2.2, 4, rock, top, yaw, [a.id, b.id]));
  };
  arch('north-arch', -146.5, -70, -137.5, -70, 6.5);
  const deck = ground(-104, -122, 5, 2.2).high + 0.6;
  const west = pier('lookout/west', -106, -122, 0.3, 2, deck, wood),
    east = pier('lookout/east', -102, -122, 0.3, 2, deck, wood);
  rows.push(row('lookout/deck', -104, -122, 5, 0.3, 2.2, wood, deck, 0, [west.id, east.id]));
  const pole = pier('flag/pole', -110, -128, 0.25, 0.25, ground(-110, -128, 0.25, 0.25).high + 6, wood);
  rows.push(row('flag/cloth', -109.1, -128, 1.6, 0.9, 0.08, '#f0752c', pole.base + 5, 0, [pole.id]));
  const { x, z, y, yaw } = BANK_CART;
  const wheels = [];
  for (const side of [-1, 1]) {
    const p = row(
      `bank-cart/wheel-${side}`,
      x + side * 1.35 * Math.cos(yaw),
      z - side * 1.35 * Math.sin(yaw),
      0.3,
      1.2,
      1.2,
      '#3a302c',
      y,
      yaw,
    );
    rows.push(p);
    wheels.push(p.id);
  }
  rows.push(row('bank-cart/bed', x, z, 2.4, 1, 4, wood, y + 0.5, yaw, wheels));
  arch('east-arch', 16, 156, 25, 164, 6);
  return rows;
}
