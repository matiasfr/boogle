// Original procedural parts, split by furnishing record; derived angles stay at runtime.
import type { Part } from '../../render/part-geometry.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'town.workshop-parts': true;
  }
}
const IRON = '#3f4145',
  IRON2 = '#5b6066',
  OAK = '#a9794c',
  OAK2 = '#8a6236',
  BARK = '#6e4a2c',
  BARK2 = '#7d5636',
  BRICK = '#9a4a3a',
  BRICK2 = '#8a4032',
  STONE = '#6d6a63';
const HALF = Math.PI / 2;

export function workshopParts(kind: string, hw: number, hd: number) {
  const parts: Part[] = [];
  const glass: { x: number; y: number; z: number }[] = [];
  const iw = hw - 0.2,
    id = hd - 0.2;
  /** A box centred at (x, z), standing on y0. */
  const b = (x: number, y0: number, z: number, w: number, h: number, d: number, col: string, rz = 0) =>
    parts.push(['b', x, y0 + h / 2, z, w, h, d, col, 0, rz]);
  /** A box between z0 and z1. */
  const bz = (x: number, z0: number, z1: number, w: number, h: number, col: string) =>
    b(x, 0, (z0 + z1) / 2, w, h, z1 - z0, col);
  /** An upright cylinder standing on y0. */
  const cyl = (x: number, y0: number, z: number, r: number, h: number, col: string) =>
    parts.push(['c', x, y0 + h / 2, z, r, h, r, col]);
  const lantern = (x: number, z: number) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b(x + sx * 0.13, 1.75, z + sz * 0.13, 0.04, 0.4, 0.04, IRON);
    b(x, 2.15, z, 0.34, 0.05, 0.34, IRON);
    b(x, 1.72, z, 0.3, 0.05, 0.3, IRON);
    b(x, 2.2, z, 0.02, 0.25, 0.02, IRON);
    glass.push({ x, y: 1.95, z });
  };

  if (kind === 'floor') {
    // Floor: boards front to back over a dark seam, with a butt joint along each; flagstones before the furnace.
    b(0, 0, 0, iw * 2 + 0.1, 0.03, id * 2 + 0.1, '#4a3a28');
    const boards = ['#9b7448', '#8d6a42', '#a37c4e', '#866540'];
    const n = Math.round((iw * 2) / 0.4),
      step = (iw * 2) / n;
    for (let k = 0; k < n; k++) {
      const x = -iw + (k + 0.5) * step,
        cut = -1.6 + (((k * 37) % 29) / 29) * 3.2;
      bz(x, -id, cut - 0.01, step - 0.03, 0.05, boards[k % 4]!);
      bz(x, cut + 0.01, id, step - 0.03, 0.05, boards[(k + 2) % 4]!);
    }
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        b(-1.425 + i * 0.95, 0, 3.375 - j * 0.85, 0.92, 0.065, 0.82, [STONE, '#77746c', '#807d74'][(i + j) % 3]!);
  }
  if (kind === 'chimney') {
    // The chimney's brick breast, up to where the chimney starts (2.7 m over the floor), in its corner.
    const cx = -hw + 1.4,
      cz = -hd + 1.2;
    for (let i = 0; i < 3; i++) b(cx, i * 0.9, cz, 1.15, 0.9, 1.15, i % 2 ? BRICK2 : BRICK);
    b(cx, 0.15, cz + 0.6, 0.7, 0.62, 0.05, '#26221f');
    b(cx, 0.77, cz + 0.6, 0.95, 0.12, 0.12, IRON);
    b(cx, 0, cz + 0.9, 1.3, 0.08, 0.5, STONE);
  }
  if (kind === 'anvil') {
    // Anvil on a stump, off the furnace's mouth, with a hot bar and a hammer on it; the quench tub beside it.
    const ax = -0.6,
      az = 0.35;
    cyl(ax, 0.05, az, 0.28, 0.5, '#7a5a38');
    cyl(ax, 0.1, az, 0.295, 0.05, IRON);
    b(ax, 0.55, az, 0.5, 0.1, 0.3, IRON);
    b(ax, 0.65, az, 0.28, 0.12, 0.2, IRON);
    b(ax, 0.77, az, 0.8, 0.12, 0.3, IRON2);
    parts.push(['k', ax + 0.6, 0.83, az, 0.07, 0.5, 0.07, IRON2, 0, -HALF]);
    b(ax - 0.1, 0.89, az, 0.34, 0.04, 0.06, '#d9602a');
    b(ax + 0.15, 0.89, az + 0.1, 0.04, 0.04, 0.34, OAK2);
    b(ax + 0.15, 0.89, az - 0.08, 0.12, 0.1, 0.1, IRON);
  }
  if (kind === 'tub') {
    const tx = 0.95,
      tz = 0.25;
    cyl(tx, 0, tz, 0.42, 0.62, OAK2);
    cyl(tx, 0.12, tz, 0.435, 0.05, IRON);
    cyl(tx, 0.45, tz, 0.435, 0.05, IRON);
    cyl(tx, 0.6, tz, 0.37, 0.03, '#4f86a3');
  }
  if (kind === 'bellows') {
    // Bellows on a trestle at the furnace's right side, its nozzle into the furnace wall.
    const bx = 2.6,
      bzz = 3.1;
    b(bx - 0.4, 0, bzz, 0.1, 0.35, 0.45, OAK2);
    b(bx + 0.4, 0, bzz, 0.1, 0.35, 0.45, OAK2);
    b(bx, 0.35, bzz, 1.0, 0.05, 0.5, OAK);
    b(bx + 0.05, 0.4, bzz, 0.85, 0.22, 0.42, '#6b4a2e');
    b(bx, 0.62, bzz, 1.0, 0.05, 0.5, OAK);
    b(bx + 0.62, 0.62, bzz, 0.04, 0.4, 0.04, OAK2);
    parts.push(['c', 1.92, 0.45, bzz, 0.05, 0.4, 0.05, IRON, 0, HALF]);
  }
  if (kind === 'bench') {
    // Workbench against the back wall, with a vise, bar stock, a horseshoe and a hammer; the tool rack above it.
    const wx = 1.0,
      wz = -3.35;
    b(wx, 0.82, wz, 3.2, 0.08, 0.9, OAK);
    for (const x of [wx - 1.5, wx + 1.5]) for (const z of [wz - 0.35, wz + 0.35]) b(x, 0, z, 0.12, 0.82, 0.12, OAK2);
    b(wx, 0.25, wz, 3.0, 0.05, 0.7, OAK2);
    b(-0.2, 0.9, wz - 0.1, 0.3, 0.2, 0.22, IRON);
    b(-0.2, 1.0, wz + 0.08, 0.3, 0.1, 0.06, IRON2);
    for (let i = 0; i < 3; i++) b(1.5, 0.9 + i * 0.05, wz - 0.1 + i * 0.02, 0.55, 0.05, 0.07, '#8b8f94');
    b(0.7, 0.9, wz + 0.1, 0.04, 0.04, 0.34, OAK2);
    b(0.7, 0.9, wz - 0.1, 0.12, 0.1, 0.1, IRON);
    parts.push(['t', 2.2, 0.93, wz + 0.1, 0.1, 0.1, 0.1, IRON2]);
    const rz = -hd + 0.26;
    b(1.0, 1.75, rz, 2.8, 0.12, 0.08, OAK2);
    for (let i = 0; i < 4; i++) {
      b(-0.2 + i * 0.5, 1.15, rz + 0.05, 0.05, 0.6, 0.05, OAK2);
      b(-0.2 + i * 0.5, 1.03, rz + 0.05, 0.22, 0.12, 0.1, IRON);
    }
    for (const x of [1.9, 2.3]) {
      b(x - 0.03, 1.2, rz + 0.05, 0.03, 0.55, 0.03, IRON, 0.12);
      b(x + 0.03, 1.2, rz + 0.05, 0.03, 0.55, 0.03, IRON, -0.12);
    }
  }
  if (kind === 'logs') {
    // Fuel: a stack of logs, ends to the room, against the right wall.
    for (let layer = 0; layer < 4; layer++)
      for (let i = 0; i < 6 - layer; i++)
        parts.push([
          'c',
          iw - 0.5,
          0.16 + layer * 0.28,
          -id + 0.18 + i * 0.32 + layer * 0.16,
          0.16,
          1.0,
          0.16,
          (i + layer) % 2 ? BARK : BARK2,
          0,
          HALF,
        ]);
  }
  if (kind === 'rails') {
    // Finished rails leaning on the left wall by the door: this forge makes the railway's iron.
    for (let i = 0; i < 6; i++) {
      const z = 0.9 + i * 0.3;
      parts.push(['b', -iw + 0.28, 1.14, z, 0.05, 2.3, 0.16, '#4c5058', 0, 0.16]);
      parts.push(['b', -iw + 0.28 - 0.05, 1.14, z, 0.1, 2.3, 0.08, '#7e8288', 0, 0.16]);
    }
  }
  if (kind === 'lanterns') {
    // Lanterns on wall brackets: over the bench, and by the stool.
    b(-1.4, 2.45, -id + 0.25, 0.05, 0.05, 0.5, IRON);
    lantern(-1.4, -id + 0.48);
    b(iw - 0.25, 2.45, -0.6, 0.5, 0.05, 0.05, IRON);
    lantern(iw - 0.48, -0.6);
  }
  return { parts, glass };
}

registerBuilder('town.workshop-parts', (params) => {
  if (typeof params.piece !== 'string' || typeof params.hw !== 'number' || typeof params.hd !== 'number')
    throw new Error('town.workshop-parts: expected authored piece and dimensions');
  return workshopParts(params.piece, params.hw, params.hd);
});
