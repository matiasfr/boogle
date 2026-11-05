// The village of ?proto=place and what the camps do to it. Cargo builds it: each step-up starts a few buildings, on
// scaffolding, with their pieces dropping in as the forge's do (./sites.ts), the landmark last, then fireworks. Fewer
// buildings than before, and every one of them solid. The plots are in `TOWN` (./layout.ts). The owner's "trains growing
// the town" is the part that landed (docs/playtests.md, the depot entry); "it feels weird to just be able to walk through
// the town like it's all billboard" is what this round fixes. Local.
import * as THREE from 'three/webgpu';
import { emit } from '../../render/particles.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { fanfare } from '../minis/common.ts';
import { blockBoxes, makeSet } from '../net/boxes.ts';
import { shell, SHELLS } from '../net/town-fx.ts';
import type { Block } from '../era/blocks.ts';
import {
  blockPlan,
  buildSites,
  housePlan,
  siteSmokes,
  snapSite,
  startSite,
  towerPlan,
  updateSites,
  addSite,
  type Plan,
  type Site,
} from './sites.ts';
import { H } from './land.ts';
import { snapRooms } from './rooms.ts';
import { LOOK } from './look.ts';
import { TOWN, VILLAGE, toWorld, type Plot } from './layout.ts';

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

function planOf(p: Plot): Plan {
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
        post: STONE2,
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
        tops: [
          { w: 6.2, h: 3.6, color: GOLD },
          { w: 7, h: 0.8, color: RED },
          { w: 3.6, h: 2.6, color: RED },
          { w: 1.6, h: 3.4, color: RED },
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
        tops: [
          { w: 10.6, h: 1.2, color: SLATE },
          { w: 5, h: 5, color: STONE2 },
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
        tops: [
          { w: 5.2, h: 3, color: '#8a6236' },
          { w: 5.8, h: 0.6, color: RED },
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
      return blockPlan({ x, z, yaw, w, h: p.h ?? 4, d, color: p.color ?? '#9b978c' }, 2);
    case 'block':
      return blockPlan({ x, z, yaw, w, h: p.h ?? 2, d, color: p.color ?? '#8a6236' }, 3, p.top);
    case 'derrick':
      return blockPlan({ x, z, w: 1, h: 14, d: 1, color: OAK }, 4, IRON);
  }
}
const site = (p: Plot, k: string) => addSite(k, planOf(p), p.type === 'clock' || p.type === 'keep' ? 2 : 1);
const LANDMARK = new Set<Plot['type']>(['clock', 'keep']);

const STARTS = TOWN.start.map((p, k) => site(p, `start${k}`));
const STEPS = {
  wood: TOWN.wood.map((row, n) => row.map((p, k) => site(p, `wood${n}-${k}`))),
  stone: TOWN.stone.map((row, n) => row.map((p, k) => site(p, `stone${n}-${k}`))),
};
const LANDMARKS = new Map<Site, boolean>();
TOWN.wood.forEach((row, n) => row.forEach((p, k) => LANDMARKS.set(STEPS.wood[n]![k]!, LANDMARK.has(p.type))));
TOWN.stone.forEach((row, n) => row.forEach((p, k) => LANDMARKS.set(STEPS.stone[n]![k]!, LANDMARK.has(p.type))));
const CAMPS = TOWN.camps.map((c, n) => ({
  asleep: c.asleep.map((p, k) => site(p, `camp${n}a${k}`)),
  awake: c.awake.map((p, k) => site(p, `camp${n}w${k}`)),
}));
buildSites();

// ---------------------------------------------------------------- fireworks
const shells: { t: number; x: number; y: number; z: number; c: THREE.Color }[] = [];
/** `n` shells over this point, about `gap` s apart, wide enough to fill the sky over a town. */
export function fireworks(top: { x: number; y: number; z: number }, n = 6, gap = 0.45, spread = 18) {
  for (let k = 0; k < n; k++)
    shells.push({
      t: k * gap,
      x: top.x + (Math.random() - 0.5) * spread,
      y: top.y + 8 + Math.random() * 14,
      z: top.z + (Math.random() - 0.5) * spread,
      c: SHELLS[Math.floor(Math.random() * SHELLS.length)]!,
    });
}

// ---------------------------------------------------------------- the village
const cx = toWorld(VILLAGE.x),
  cz = VILLAGE.z;
const drawn = { wood: 0, stone: 0 };
const camps = [false, false];
/** Start over, or a reload: the town as it stands, without the show. */
export function snapTown(wood: number, stone: number) {
  shells.length = 0;
  for (const q of STARTS) snapSite(q, true);
  for (const kind of ['wood', 'stone'] as const) {
    const want = kind === 'wood' ? wood : stone;
    STEPS[kind].forEach((row, n) => row.forEach((q) => snapSite(q, n < want)));
    drawn[kind] = want;
  }
  snapRooms();
}
/** A camp as it stands: its old buildings, and the new ones once its line is open. */
export function snapCamp(k: number, open: boolean) {
  const c = CAMPS[k]!;
  for (const q of c.asleep) snapSite(q, true);
  for (const q of c.awake) snapSite(q, open);
  camps[k] = open;
}
/** Its line just opened: the camp builds itself up, the same way. */
export function wakeCamp(k: number) {
  if (camps[k]) return;
  camps[k] = true;
  CAMPS[k]!.awake.forEach((q, n) => startSite(q, 1.5 + n * 2.2));
}
/** The next thing the town will show: a step that's started this frame, with its landmark, or null. */
export const onStepUp = { fn: null as null | ((kind: 'wood' | 'stone', first: Site) => void) };
/** The town at these steps; a step higher than drawn starts building. */
export function updateTown(wood: number, stone: number, dt: number) {
  for (const kind of ['wood', 'stone'] as const) {
    const want = kind === 'wood' ? wood : stone;
    if (want <= drawn[kind]) continue;
    const row = STEPS[kind][drawn[kind]]!;
    drawn[kind]++;
    // Plain buildings first, about 2.5 s apart; the landmark rises behind them and ends in fireworks.
    let at = 0.6;
    for (const q of row) {
      const landmark = LANDMARKS.get(q);
      startSite(q, landmark ? at + 1 : at, () => {
        if (landmark) {
          fireworks(q.plan.top, 8);
          fanfare(true, 0.7);
        }
      });
      if (!landmark) at += 2.5;
    }
    onStepUp.fn?.(kind, row[0]!);
    fanfare(drawn[kind] >= 2, 0.7);
    whistle(cx, cz);
  }
  updateSites(dt);
  for (let k = shells.length - 1; k >= 0; k--) {
    const c = shells[k]!;
    c.t -= dt;
    if (c.t > 0) continue;
    shell(c.x, c.y, c.z, c.c);
    shells.splice(k, 1);
  }
  smokeAcc += dt * 1.1;
  for (; smokeAcc >= 1; smokeAcc--) for (const c of siteSmokes()) chimney(c);
}
let smokeAcc = 0;
const smoke = new THREE.Color(LOOK.light ? '#ede9e0' : '#8d8780');
function chimney(c: { x: number; y: number; z: number }) {
  emit({
    x: c.x,
    y: c.y + 0.2,
    z: c.z,
    vx: 0.6 + Math.random() * 0.4,
    vy: 2.2 + Math.random() * 0.8,
    vz: (Math.random() - 0.5) * 0.4,
    life: 4,
    size: 0.9,
    grow: [1, 3.2],
    alpha: 0.55,
    fade: 0.5,
    color: smoke,
    drag: 0.25,
  });
}

/** Plain things that just stand there, from the start. */
export function staticPart(rows: Block[]) {
  const set = makeSet(
    rows.flatMap((b) => {
      const y = H(b.x, b.z);
      const out = blockBoxes(b, []);
      for (const q of out) q.y = y;
      return out;
    }),
  );
  return set;
}
/** Where a camp's smoke comes from, asleep or awake. */
export const campSmoke = (k: number) => CAMPS[k]!.asleep[0]!.plan.top;
