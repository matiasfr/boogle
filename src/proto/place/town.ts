// The village of ?proto=place and what the camps do to it: timber builds the north side (halls and a clock tower), stone
// the south side (streets and a keep), so choosing a camp is choosing what you want to see grow. Rows are the shape of
// src/proto/net/stages.ts and rise the way src/proto/net/town.ts does: rippling from the middle, the landmark last, then
// fireworks. The owner's "trains growing the town" is the part that landed (docs/playtests.md, the depot entry). Local.
import * as THREE from 'three/webgpu';
import { emit } from '../../render/particles.ts';
import { thump, whistle } from '../../render/machine-sfx.ts';
import { fanfare } from '../minis/common.ts';
import { blockBoxes, draw, makeSet, type BoxSet, type Smoke } from '../net/boxes.ts';
import { easeBack, LANDMARK_AFTER, puff, RIPPLE_MPS, shell, SHELLS, smooth, soot } from '../net/town-fx.ts';
import type { Block } from '../era/blocks.ts';
import { H } from './land.ts';
import { VILLAGE, toWorld, type LinkSpec } from './layout.ts';

const WOOD = '#8a6a48',
  THATCH = '#c9a86a',
  TIMBER = '#a9794c',
  RED = '#c4453a',
  STONE = '#c8c3b4',
  STONE2 = '#b2ad9f',
  SLATE = '#4d5560',
  CREAM = '#efe3c8',
  GOLD = '#f2b134',
  BRICK = '#9a4a3a',
  IRON = '#3f4145',
  GLASS = '#55606c',
  TERRACOTTA = '#c9663c',
  WHITE = '#f4f1e8';

const hut = (x: number, z: number, yaw = 0): Block => ({
  kind: 'hut',
  x: toWorld(x),
  z,
  w: 2.8,
  h: 1,
  d: 2.6,
  yaw,
  color: WOOD,
  pitch: { rise: 2.3, color: THATCH, over: 0.6 },
});
const hall = (x: number, z: number, w: number, h: number, d: number, yaw = 0, smokes = false): Block => ({
  kind: 'hall',
  x: toWorld(x),
  z,
  w,
  h,
  d,
  yaw,
  color: TIMBER,
  pitch: { rise: Math.max(w, d) * 0.75, color: RED, over: 1 },
  chimney: smokes ? { h: 2.5, dx: w * 0.28, dz: d * 0.2 } : undefined,
});
const WALLS = ['#d9d2c0', '#b9b5a8', '#d8b98c', '#c6c9c4', '#cf9f7e'];
let blocks = 0;
const block = (x: number, z: number, w: number, h: number, d: number, yaw = 0, smokes = false): Block[] => {
  const k = blocks++;
  const roof =
    k % 3 === 1 ? { pitch: { rise: 2.6, color: TERRACOTTA, over: 0.7 } } : { top: { h: 0.8, color: SLATE, over: 0.7 } };
  const floors: Block[] = [];
  for (let y = 1.5; y < h - 1.2; y += 3)
    floors.push({ kind: 'windows', x: toWorld(x), z, y, w: w + 0.12, h: 1, d: d + 0.12, yaw, color: GLASS });
  return [
    {
      kind: 'stone block',
      x: toWorld(x),
      z,
      w,
      h,
      d,
      yaw,
      color: WALLS[k % WALLS.length]!,
      ...roof,
      chimney: smokes ? { h: 3.5, dx: w * 0.28, dz: d * 0.2 } : undefined,
    },
    ...floors,
  ];
};
const tower = (kind: string, x: number, z: number, y: number, w: number, h: number, color: string): Block => ({
  kind: `landmark ${kind}`,
  x: toWorld(x),
  z,
  y,
  w,
  h,
  d: w,
  color,
});

const CAMPFIRE: Block[] = [
  { kind: 'campfire', x: toWorld(-101), z: 13, w: 1, h: 0.6, d: 1, color: '#e8742c', chimney: { h: 0 } },
  { kind: 'log seat', x: toWorld(-99), z: 13, w: 0.5, h: 0.35, d: 1.7, color: '#6b4a2b' },
];
const HUTS_N = [hut(-108, 0, 0.2), hut(-100, -3, -0.3), hut(-92, 2, 0.1), hut(-114, 5, 0.3)];
const HUTS_S = [hut(-108, 26, -0.2), hut(-98, 28, 0.15), hut(-90, 24, 0.3), hut(-115, 18, 0.1)];
const KEPT = [hut(-96, 8, 0.1), ...CAMPFIRE];

/** The steps: `wood` on the village's north side, `stone` on its south. */
const STEPS: Record<'wood' | 'stone', Block[][]> = {
  wood: [
    [
      tower('clock shaft', -98, -14, 0, 4.5, 21, WHITE),
      tower('clock face', -98, -14, 21, 5.6, 3.6, GOLD),
      tower('clock roof', -98, -14, 24.6, 6.6, 1, RED),
      tower('clock spire', -98, -14, 25.6, 2.4, 6, RED),
      hall(-112, -8, 7, 6, 6, 0.1, true),
      hall(-88, -10, 7, 6, 6, -0.15),
      hall(-105, 1, 6, 5, 6, 0.1),
      hall(-90, 1, 6, 6, 7, 0.05, true),
      hall(-118, 2, 6, 5, 5, -0.2),
      {
        kind: 'station',
        x: toWorld(-72),
        z: -13,
        w: 3,
        h: 3.2,
        d: 9,
        color: CREAM,
        top: { h: 0.5, color: RED, over: 1 },
      },
    ],
    [
      hall(-120, -18, 8, 8, 7, 0.15, true),
      hall(-108, -24, 8, 7, 6, -0.1),
      hall(-84, -24, 7, 9, 7, 0.1),
      hall(-74, -8, 7, 6, 6, -0.2, true),
      hall(-96, -32, 9, 10, 8),
      {
        kind: 'water tower',
        x: toWorld(-130),
        z: -6,
        w: 4,
        h: 14,
        d: 4,
        color: TIMBER,
        top: { h: 2.2, color: RED, over: 1 },
      },
    ],
  ],
  stone: [
    [
      tower('keep base', -98, 44, 0, 12, 14, STONE),
      tower('keep shaft', -98, 44, 14, 8, 22, STONE2),
      tower('keep cap', -98, 44, 36, 10.5, 2.5, SLATE),
      tower('keep crown', -98, 44, 38.5, 4.8, 10, GOLD),
      ...block(-112, 28, 6, 8, 6, 0.05, true),
      ...block(-103, 30, 6, 11, 5, -0.05),
      ...block(-90, 30, 6, 9, 6, 0.08),
      ...block(-82, 32, 6, 12, 6, 0, true),
      ...block(-114, 40, 6, 10, 5, 0.1),
      ...block(-84, 44, 6, 14, 6, -0.05),
    ],
    [
      ...block(-114, 54, 7, 12, 7, 0.05, true),
      ...block(-103, 60, 6, 15, 6),
      ...block(-90, 58, 6, 11, 6, -0.1),
      ...block(-78, 54, 7, 17, 6, 0.1, true),
      { kind: 'works stack', x: toWorld(-124), z: 42, w: 3, h: 28, d: 3, color: BRICK, chimney: { h: 0 } },
      { kind: 'works shed', x: toWorld(-122), z: 50, w: 8, h: 5, d: 7, color: IRON },
    ],
  ],
};

// ---------------------------------------------------------------- building parts on this land
type Part = BoxSet & { delay: Float32Array; smokes: Smoke[]; top: { x: number; y: number; z: number } | null };

/** Builds a set of blocks standing on this land, rippling out from (cx, cz) when it rises. */
export function makePart(rows: Block[], cx: number, cz: number): Part {
  const smokes: Smoke[] = [];
  const boxes = rows.flatMap((b) => {
    const own: Smoke[] = [];
    const out = blockBoxes(b, own);
    const y = H(b.x, b.z);
    for (const q of out) q.y = y;
    for (const m of own) smokes.push({ x: m.x, y: y + (b.y ?? 0) + b.h + (b.chimney?.h ?? 0), z: m.z });
    return out;
  });
  const set = makeSet(boxes);
  const delay = Float32Array.from(set.boxes, (b) => {
    const d = Math.hypot(b.x - cx, b.z - cz) / RIPPLE_MPS;
    return b.pop > 1 ? Math.max(d, LANDMARK_AFTER) : d;
  });
  let top: Part['top'] = null;
  for (const b of rows.filter((q) => q.kind.startsWith('landmark'))) {
    const y = H(b.x, b.z) + (b.y ?? 0) + b.h;
    if (!top || y > top.y) top = { x: b.x, y, z: b.z };
  }
  return { ...set, delay, smokes, top };
}
const endOf = (p: Part) => p.boxes.reduce((e, b, k) => Math.max(e, p.delay[k]! + b.pop), 0);

type Rise = { part: Part; t: number; end: number; puffed: Set<number>; show: boolean };
const RISE_SPEED = 2; // the town and the camps rise, and the fireworks go up, this much faster than ?proto=net's
const rises: Rise[] = [];
export function rise(part: Part) {
  rises.push({ part, t: 0, end: endOf(part) + 0.1, puffed: new Set(), show: true });
}
const shells: { t: number; x: number; y: number; z: number; c: THREE.Color }[] = [];
function fireworks(top: { x: number; y: number; z: number }) {
  for (let k = 0; k < 6; k++)
    shells.push({
      t: k * 0.45,
      x: top.x + (Math.random() - 0.5) * 18,
      y: top.y + 8 + Math.random() * 14,
      z: top.z + (Math.random() - 0.5) * 18,
      c: SHELLS[Math.floor(Math.random() * SHELLS.length)]!,
    });
}

// ---------------------------------------------------------------- the village
const cx = toWorld(VILLAGE.x),
  cz = VILLAGE.z;
let sets: { kept: Part; north: Part; south: Part; wood: Part[]; stone: Part[] } | null = null;
const drawn = { wood: 0, stone: 0 };
const sinking: { part: Part; t: number }[] = [];
let smokeAcc = 0;
function ensure() {
  if (sets) return sets;
  sets = {
    kept: makePart(KEPT, cx, cz),
    north: makePart(HUTS_N, cx, cz),
    south: makePart(HUTS_S, cx, cz),
    wood: STEPS.wood.map((r) => makePart(r, cx, cz)),
    stone: STEPS.stone.map((r) => makePart(r, cx, cz)),
  };
  draw(sets.kept, () => 1);
  draw(sets.north, () => 1);
  draw(sets.south, () => 1);
  return sets;
}
function setTo(kind: 'wood' | 'stone', n: number) {
  const s = ensure();
  s[kind].forEach((p, k) => draw(p, () => (k < n ? 1 : 0)));
  draw(kind === 'wood' ? s.north : s.south, () => (n ? 0 : 1));
  drawn[kind] = n;
}
/** Start over, or a reload: the town as it stands, without the show. */
export function snapTown(wood: number, stone: number) {
  rises.length = 0;
  sinking.length = 0;
  shells.length = 0;
  setTo('wood', wood);
  setTo('stone', stone);
}
/** The town at these steps; a step higher than drawn plays. */
export function updateTown(wood: number, stone: number, dt: number) {
  const s = ensure();
  for (const kind of ['wood', 'stone'] as const) {
    const want = kind === 'wood' ? wood : stone;
    if (want <= drawn[kind]) continue;
    const part = s[kind][drawn[kind]]!;
    rise(part);
    if (drawn[kind] === 0) sinking.push({ part: kind === 'wood' ? s.north : s.south, t: 0 });
    drawn[kind]++;
    fanfare(drawn[kind] >= 2);
    whistle(cx, cz);
  }
  updateRises(dt * RISE_SPEED);
  for (let k = sinking.length - 1; k >= 0; k--) {
    const q = sinking[k]!;
    q.t += dt;
    draw(q.part, () => 1 - smooth(Math.min(1, q.t / 0.6)));
    if (q.t > 0.6) sinking.splice(k, 1);
  }
  smokeAcc += dt * 1.4;
  for (; smokeAcc >= 1; smokeAcc--) {
    const list = [s.kept, ...s.wood.slice(0, drawn.wood), ...s.stone.slice(0, drawn.stone)];
    for (const p of list) for (const c of p.smokes) chimney(c);
  }
}
function updateRises(dt: number) {
  for (let k = rises.length - 1; k >= 0; k--) {
    const a = rises[k]!,
      p = a.part;
    draw(p, (n) => {
      const b = p.boxes[n]!;
      const u = (a.t - p.delay[n]!) / b.pop;
      if (u > 0 && b.tall && !a.puffed.has(n)) {
        a.puffed.add(n);
        puff(b.x, b.y, b.z, b.pop > 1 ? 5 : 3);
        thump(b.x, b.z);
      }
      if (u <= 0) return 0;
      return u >= 1 ? 1 : b.pop > 1 ? smooth(u) : easeBack(u);
    });
    if (p.top && a.t > a.end - 0.2 && a.show) {
      a.show = false;
      fireworks(p.top);
    }
    a.t += dt;
    if (a.t > a.end) {
      draw(p, () => 1);
      rises.splice(k, 1);
    }
  }
  for (let k = shells.length - 1; k >= 0; k--) {
    const c = shells[k]!;
    c.t -= dt;
    if (c.t > 0) continue;
    shell(c.x, c.y, c.z, c.c);
    shells.splice(k, 1);
  }
}
function chimney(c: Smoke) {
  emit({
    x: c.x,
    y: c.y + 0.2,
    z: c.z,
    vx: 0.6 + Math.random() * 0.4,
    vy: 2.2 + Math.random() * 0.8,
    vz: (Math.random() - 0.5) * 0.4,
    life: 4,
    size: 1,
    grow: [1, 3.4],
    alpha: 0.7,
    fade: 0.5,
    color: soot,
    drag: 0.25,
  });
}

// ---------------------------------------------------------------- the camps' buildings
const X = (x: number) => toWorld(x);
export function campBlocks(spec: LinkSpec): { asleep: Block[]; awake: Block[] } {
  const { x, z } = spec.camp;
  if (spec.kind === 'wood')
    return {
      asleep: [
        { kind: 'kiln', x: X(x + 10), z: z - 12, w: 3.4, h: 5, d: 3.4, color: BRICK },
        { kind: 'kiln stack', x: X(x + 10), z: z - 12, y: 5, w: 1.6, h: 7, d: 1.6, color: IRON },
        {
          kind: 'camp shed',
          x: X(x - 2),
          z: z - 14,
          w: 5,
          h: 2.5,
          d: 4,
          color: WOOD,
          pitch: { rise: 2, color: THATCH, over: 0.5 },
        },
      ],
      awake: [
        {
          kind: 'sawmill frame',
          x: X(x + 2),
          z: z - 3,
          w: 12,
          h: 4.5,
          d: 7,
          color: TIMBER,
          pitch: { rise: 3.6, color: RED, over: 1 },
        },
        { kind: 'mill wheel', x: X(x + 10), z: z - 2, w: 1.4, h: 6, d: 6, color: WOOD },
        { kind: 'log stack', x: X(x - 8), z: z - 8, w: 7, h: 2.4, d: 3, color: '#8a6236' },
        { kind: 'log stack', x: X(x - 8), z: z + 1, w: 6, h: 3, d: 3, color: '#9a7446' },
        {
          kind: 'hall',
          x: X(x + 14),
          z: z - 12,
          w: 7,
          h: 5,
          d: 6,
          color: TIMBER,
          pitch: { rise: 3.4, color: RED, over: 1 },
        },
      ],
    };
  return {
    asleep: [
      { kind: 'crusher', x: X(x + 8), z: z - 45, w: 4, h: 5, d: 4, color: STONE2 },
      { kind: 'crusher stack', x: X(x + 8), z: z - 45, y: 5, w: 1.8, h: 8, d: 1.8, color: IRON },
      { kind: 'quarry face', x: X(x + 20), z: z + 4, w: 10, h: 9, d: 22, color: '#9b978c' },
      { kind: 'quarry step', x: X(x + 14), z: z + 12, w: 8, h: 4, d: 10, color: '#a8a498' },
    ],
    awake: [
      {
        kind: 'derrick',
        x: X(x + 2),
        z: z + 10,
        w: 1,
        h: 14,
        d: 1,
        color: '#7f5630',
        top: { h: 0.6, color: IRON, over: 6 },
      },
      {
        kind: 'stone shed',
        x: X(x - 4),
        z: z - 4,
        w: 10,
        h: 5,
        d: 7,
        color: STONE,
        top: { h: 0.8, color: SLATE, over: 0.8 },
      },
      { kind: 'stone stack', x: X(x - 12), z: z + 4, w: 5, h: 2.2, d: 4, color: STONE2 },
      { kind: 'stone stack', x: X(x - 6), z: z + 8, w: 4, h: 3, d: 4, color: '#a8a498' },
      {
        kind: 'works',
        x: X(x + 10),
        z: z + 2,
        w: 7,
        h: 7,
        d: 6,
        color: STONE2,
        top: { h: 0.8, color: SLATE, over: 0.7 },
      },
    ],
  };
}
