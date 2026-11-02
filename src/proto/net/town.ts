// The town of ?proto=net: the step-up, the big payoff (docs/research/era-progression.md, recs 1-3 and 6). The blocks of
// ./stages.ts rise rippling out from its centre while the last stage's generic blocks sink; heritage stays. The landmark
// rises slowest and last, then fireworks go up from its top, big enough to read from the far end of the line, and the
// chimneys start to smoke. Heard anywhere: the mini-games' fanfare (a kept sound). Local: the stage is counted in this
// tab (./index.ts), a reload snaps to it without the show.
import * as THREE from 'three/webgpu';
import { emit } from '../../render/particles.ts';
import { thump, whistle } from '../../render/machine-sfx.ts';
import { fanfare } from '../minis/common.ts';
import { blockBoxes, draw, makeSet, type BoxSet, type Smoke } from './boxes.ts';
import { STAGES, TOWN } from './stages.ts';

const RIPPLE_MPS = 13; // how fast the change spreads from the centre
const LANDMARK_AFTER = 1.1; // s after the ripple starts that the landmark begins to rise
const easeBack = (u: number) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2; // overshoots a little, lands at 1
const smooth = (u: number) => u * u * (3 - 2 * u);
const dust = new THREE.Color('#d8c8a6'),
  soot = new THREE.Color('#8d8780');
const SHELLS = ['#ff4f4f', '#ffcf33', '#4fdc7a', '#2f8cff', '#ff7ad9', '#ffffff'].map((c) => new THREE.Color(c));

type Part = BoxSet & { delay: Float32Array; smokes: Smoke[]; top: { x: number; y: number; z: number } | null };
type StageSets = { generic: Part; kept: Part };

function part(stage: number, keep: boolean): Part {
  const smokes: Smoke[] = [];
  const blocks = STAGES[stage]!.blocks.filter((b) => !!b.keep === keep);
  const set = makeSet(blocks.flatMap((b) => blockBoxes(b, smokes)));
  const delay = Float32Array.from(set.boxes, (b) => {
    const d = Math.hypot(b.x - TOWN.x, b.z - TOWN.z) / RIPPLE_MPS;
    return b.pop > 1 ? Math.max(d, LANDMARK_AFTER) : d;
  });
  let top: Part['top'] = null;
  for (const b of blocks.filter((q) => q.kind.startsWith('landmark'))) {
    const y = (b.y ?? 0) + b.h;
    if (!top || y > top.y) top = { x: b.x, y, z: b.z };
  }
  if (top) top.y += set.boxes.find((q) => q.pop > 1)?.y ?? 0;
  return { ...set, delay, smokes, top };
}

let sets: StageSets[] | null = null;
let shown = -1;
let anim: { to: number; t: number; end: number; fired: boolean; puffed: Set<number> } | null = null;
let smokeAcc = 0;

function snap(stage: number) {
  sets!.forEach((s, i) => {
    draw(s.generic, () => (i === stage ? 1 : 0));
    draw(s.kept, () => (i <= stage ? 1 : 0));
  });
}
function endOf(p: Part) {
  let e = 0;
  p.boxes.forEach((b, k) => (e = Math.max(e, p.delay[k]! + b.pop)));
  return e;
}

function puff(x: number, y: number, z: number, r: number) {
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    emit({
      x: x + Math.cos(a) * r,
      y: y + 0.3,
      z: z + Math.sin(a) * r,
      vx: Math.cos(a) * 3,
      vy: 1.4,
      vz: Math.sin(a) * 3,
      life: 1.3,
      size: 1.2,
      color: dust,
      alpha: 0.85,
      grow: [1, 3],
      gravity: -0.4,
      drag: 1.6,
      fade: 0.5,
    });
  }
}

// One big shell over the landmark: bright and large, so a burst reads from 150 m away.
function shell(x: number, y: number, z: number, color: THREE.Color) {
  for (let k = 0; k < 34; k++) {
    const a = Math.random() * Math.PI * 2,
      u = Math.random() * 2 - 1,
      s = 11 + Math.random() * 4,
      c = Math.sqrt(1 - u * u);
    emit({
      x,
      y,
      z,
      vx: Math.cos(a) * c * s,
      vy: u * s,
      vz: Math.sin(a) * c * s,
      life: 1.4 + Math.random() * 0.5,
      size: 2.1,
      color,
      gravity: 5,
      drag: 1.5,
      shrink: 0.3,
    });
  }
}

function chimneys(dt: number, stage: number) {
  smokeAcc += dt * 1.6;
  for (; smokeAcc >= 1; smokeAcc--)
    sets!.forEach((s, i) => {
      if (i > stage) return;
      const list = i === stage ? [...s.generic.smokes, ...s.kept.smokes] : s.kept.smokes;
      for (const c of list)
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
    });
}

/** Draws the town at `stage`; a stage higher than the one drawn plays the step-up (unless `snapTo`). */
export function updateTown(stage: number, dt: number, snapTo: boolean): void {
  if (!sets) sets = STAGES.map((_, i) => ({ generic: part(i, false), kept: part(i, true) }));
  if (stage !== shown) {
    if (stage === shown + 1 && !snapTo && shown >= 0 && !anim) {
      const to = sets[stage]!;
      anim = {
        to: stage,
        t: 0,
        end: Math.max(endOf(to.generic), endOf(to.kept)) + 0.1,
        fired: false,
        puffed: new Set(),
      };
      shown = stage;
      fanfare(stage >= 2);
      whistle(TOWN.x, TOWN.z);
    } else if (!anim) {
      shown = stage;
      snap(stage);
    }
  }
  if (anim) {
    const { to, t } = anim;
    const was = sets[to - 1]!,
      now = sets[to]!;
    draw(was.generic, (k) => 1 - smooth(Math.min(1, Math.max(0, (t - was.generic.delay[k]!) / 0.5))));
    const rise = (p: Part, pfx: number) => (k: number) => {
      const b = p.boxes[k]!;
      const u = (t - p.delay[k]!) / b.pop;
      if (u > 0 && b.tall && !anim!.puffed.has(pfx + k)) {
        anim!.puffed.add(pfx + k);
        puff(b.x, b.y, b.z, b.pop > 1 ? 5 : 3);
        thump(b.x, b.z);
      }
      if (u <= 0) return 0;
      return u >= 1 ? 1 : b.pop > 1 ? smooth(u) : easeBack(u);
    };
    draw(now.generic, rise(now.generic, 0));
    draw(now.kept, rise(now.kept, 10000));
    const top = now.kept.top;
    if (top && !anim.fired && t > anim.end - 0.2) {
      anim.fired = true;
      fireworks(top);
    }
    anim.t += dt;
    if (anim.t > anim.end) {
      anim = null;
      draw(now.generic, () => 1);
      draw(now.kept, () => 1);
    }
  }
  for (let k = pending.length - 1; k >= 0; k--) {
    const p = pending[k]!;
    p.t -= dt;
    if (p.t > 0) continue;
    shell(p.x, p.y, p.z, p.c);
    pending.splice(k, 1);
  }
  if (shown >= 0) chimneys(dt, shown);
}

const pending: { t: number; x: number; y: number; z: number; c: THREE.Color }[] = [];
function fireworks(top: { x: number; y: number; z: number }) {
  for (let k = 0; k < 5; k++)
    pending.push({
      t: k * 0.45,
      x: top.x + (Math.random() - 0.5) * 18,
      y: top.y + 8 + Math.random() * 14,
      z: top.z + (Math.random() - 0.5) * 18,
      c: SHELLS[Math.floor(Math.random() * SHELLS.length)]!,
    });
}

export const townBusy = () => !!anim;
/** Start over: the first stage, drawn at once. */
export function resetTown() {
  anim = null;
  shown = -1;
}
