// Existing authored opening plans, shared by the legacy run and the owned T1 view. No progression or save owner.
import { H } from './terrain.ts';
import { FORGE, ORIGIN, TOWN, toWorld, type Plot } from './layout.ts';
import {
  housePlan as planHouse,
  towerPlan as planTower,
  blockPlan as planBlock,
  type HouseSpec,
  type TowerSpec,
  type BlockSpec,
  type Plan,
} from './building-plans.ts';
const housePlan = (s: HouseSpec) => planHouse(s, H(s.x, s.z));
const towerPlan = (s: TowerSpec) => planTower(s, H(s.x, s.z));
const blockPlan = (s: BlockSpec, lifts = 1, top?: string) => planBlock(s, H(s.x, s.z), lifts, top);

/** The same completed state as sites.snapSite: keep the foundation, remove only temporary scaffold poles. */
export function openingBuildings() {
  return [...TOWN.start, ...TOWN.camps.flatMap((camp) => camp.asleep)].map((plot, i) => {
    const plan = planOf(plot);
    return { id: `opening/${i}/${plot.type}`, plan, boxes: [...plan.scaffold.slice(0, 1), ...plan.pieces] };
  });
}

const PLASTER = '#e8dcc0',
  THATCH = '#b99a60',
  OAK = '#7f5630',
  TIMBER = '#a9794c',
  RED = '#c4453a',
  STONE = '#c8c3b4',
  STONE2 = '#b2ad9f',
  SLATE = '#4d5560',
  BRICK = '#9a4a3a',
  BRICK2 = '#8a4032',
  GLASS = '#375b67',
  GOLD = '#f2b134',
  WHITE = '#f4f1e8',
  IRON = '#3f4145',
  TERRACOTTA = '#c9663c';

export function planOf(p: Plot): Plan {
  const x = toWorld(p.x),
    z = p.z,
    yaw = p.yaw ?? 0,
    w = p.w ?? 6,
    d = p.d ?? 5;
  const chimney = p.smoke ? { dx: w * 0.28, dz: d * 0.22, n: 5, a: BRICK, b: BRICK2 } : undefined;
  switch (p.type) {
    case 'cottage':
      return housePlan({
        x,
        z,
        yaw,
        w,
        d,
        high: 3,
        rise: 2.5,
        wall: PLASTER,
        wallPalette: 'walls',
        post: OAK,
        roof: THATCH,
        door: { w: 1.5, rows: 3 },
        windows: GLASS,
        chimney,
      });
    case 'hall':
      return housePlan({
        x,
        z,
        yaw,
        w,
        d,
        high: p.h ?? 5.2,
        rise: 3.6,
        wall: TIMBER,
        wallPalette: 'timber',
        post: OAK,
        roof: RED,
        door: { w: 2.6, rows: 4 },
        windows: GLASS,
        chimney: chimney && { ...chimney, n: 7 },
      });
    case 'stone':
      return housePlan({
        x,
        z,
        yaw,
        w,
        d,
        high: p.h ?? 6,
        rise: 2.6,
        wall: STONE,
        wallPalette: 'stone',
        post: STONE2,
        postPalette: 'stone',
        roof: p.tile ? TERRACOTTA : SLATE,
        door: { w: 1.6, rows: 2 },
        windows: GLASS,
        rowH: 1,
        chimney: chimney && { ...chimney, n: 6 },
      });
    case 'shed':
      return housePlan({
        x,
        z,
        yaw,
        w,
        d,
        high: p.h ?? 4,
        rise: 2.8,
        wall: p.tile ? STONE2 : TIMBER,
        wallPalette: p.tile ? 'stone' : 'timber',
        post: OAK,
        roof: p.tile ? SLATE : RED,
        door: { w: 3.2, rows: 3 },
      });
    case 'clock':
      return towerPlan({
        x,
        z,
        w: 5,
        high: 19,
        course: 1.6,
        a: WHITE,
        b: '#e4dfd2',
        palette: 'walls',
        tops: [
          { w: 6.2, h: 3.6, color: GOLD },
          { w: 7, h: 0.8, color: RED, palette: 'roofs' },
          { w: 3.6, h: 2.6, color: RED, palette: 'roofs' },
          { w: 1.6, h: 3.4, color: RED, palette: 'roofs' },
        ],
      });
    case 'keep':
      return towerPlan({
        x,
        z,
        w: 9,
        high: 22,
        course: 1.8,
        a: STONE,
        b: STONE2,
        palette: 'stone',
        tops: [
          { w: 10.6, h: 1.2, color: SLATE, palette: 'roofs' },
          { w: 5, h: 5, color: STONE2, palette: 'stone' },
          { w: 3, h: 4, color: GOLD },
        ],
      });
    case 'water':
      return towerPlan({
        x,
        z,
        w: 3.6,
        high: 11,
        course: 2,
        a: TIMBER,
        b: OAK,
        palette: 'timber',
        tops: [
          { w: 5.2, h: 3, color: '#8a6236', palette: 'timber' },
          { w: 5.8, h: 0.6, color: RED, palette: 'roofs' },
        ],
      });
    case 'stack':
      return towerPlan({
        x,
        z,
        w: 2.4,
        high: p.h ?? 12,
        course: 1.6,
        a: BRICK,
        b: BRICK2,
        tops: [{ w: 3, h: 0.5, color: IRON }],
      });
    case 'rock':
      return blockPlan({ x, z, yaw, w, h: p.h ?? 4, d, color: p.color ?? '#9b978c', palette: 'stone' }, 2);
    case 'block':
      return blockPlan({ x, z, yaw, w, h: p.h ?? 2, d, color: p.color ?? '#8a6236' }, 3, p.top);
    case 'derrick':
      return blockPlan({ x, z, w: 1, h: 14, d: 1, color: OAK, palette: 'timber' }, 4, IRON);
  }
}

export const WOOD = '#a9794c',
  WOOD2 = '#8a6236',
  ROOF = '#5a5f6b';

export const X = FORGE.x + ORIGIN.x,
  Z = FORGE.z + ORIGIN.z;
export const W = FORGE.w,
  D = FORGE.d,
  HIGH = 4.6; // to the wall tops

export function forgePlan(door = { x: -2.9, w: 2.8, rows: 3 }) {
  return housePlan({
    x: X,
    z: Z,
    w: W,
    d: D,
    high: HIGH,
    rise: 2.1,
    wall: WOOD,
    wallPalette: 'timber',
    post: WOOD2,
    roof: ROOF,
    door,
    closed: false,
    chimney: { dx: -W / 2 + 1.4, dz: -D / 2 + 1.2, n: 8, a: BRICK, b: '#8a4032' },
    poleTop: HIGH + 3,
  });
}

export { openingStops } from './opening-stops.ts';
