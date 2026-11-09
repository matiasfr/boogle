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
import { buildSites, siteSmokes, snapSite, startSite, updateSites, addSite, type Site } from './sites.ts';
import { H } from './land.ts';
import { snapRooms } from './place-rooms.ts';
import { LOOK } from './look.ts';
import { TOWN, VILLAGE, toWorld, type Plot } from './layout.ts';

import { planOf } from './opening-plans.ts';
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
