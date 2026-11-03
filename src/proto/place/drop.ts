// Dropping what's on your back in ?proto=place: each press (right click, pad R3, the touch Drop button) puts one piece on
// the ground in front of you, rails first, then stone, then logs. Nothing vanishes: dropped pieces stay where they land, in a
// pile you can pick up again (Interact). Your own, like your back: saved, and not shared in co-op.
import * as THREE from 'three/webgpu';
import { registerAction, triggerAction } from '../../player/controls.ts';
import { NO_TARGETS, registerInteractable, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { PLAYER_R } from '../../constants.ts';
import { scene } from '../../render/scene.ts';
import { flat } from '../flat.ts';
import { knock, pop } from '../minis/common.ts';
import { back } from './chop.ts';
import { count, num, personalSlice, save } from './job.ts';
import { H } from './land.ts';
import { LOOK, STEEL } from './look.ts';
import { kitBatch } from './look-kit.ts';
import { commitPieces } from '../../render/haul-pieces.ts';
import { RAIL_SIZE, logStackMesh, send, setStackLog, stackSlot, type PieceKind } from './pieces.ts';

type Pile = { x: number; y: number; z: number; yaw: number; logs: number; rails: number; stone: number };
const piles: Pile[] = [];
const MAX = 64; // pieces of each kind drawn, across every pile
const JOIN_R = 2.2; // a drop this close to a pile goes on it
const REACH = 2.8;

const logsDrawn = logStackMesh(MAX);
logsDrawn.count = 0;
const railsDrawn = LOOK.kit
  ? kitBatch('rail', STEEL, MAX)
  : new THREE.InstancedMesh(new THREE.BoxGeometry(RAIL_SIZE.x, RAIL_SIZE.y, RAIL_SIZE.z), flat('#4c5058', 0.6), MAX);
const stoneDrawn = new THREE.InstancedMesh(
  new THREE.DodecahedronGeometry(0.2, 0),
  new THREE.MeshStandardNodeMaterial({ color: '#a8a498', roughness: 0.95, flatShading: true }),
  MAX,
);
for (const g of [railsDrawn, stoneDrawn]) {
  g.castShadow = true;
  g.frustumCulled = false;
  g.count = 0;
  scene.add(g);
}

const m4 = new THREE.Matrix4(),
  q4 = new THREE.Quaternion(),
  e4 = new THREE.Euler(),
  p4 = new THREE.Vector3(),
  one = new THREE.Vector3(1, 1, 1),
  at = new THREE.Vector3();
function draw() {
  let nl = 0,
    nr = 0,
    ns = 0;
  for (const p of piles) {
    at.set(p.x, p.y, p.z);
    for (let k = 0; k < p.logs && nl < MAX; k++) setStackLog(logsDrawn, nl++, stackSlot(k, 3, at, p.yaw, p4), p.yaw);
    for (let k = 0; k < p.rails && nr < MAX; k++) {
      q4.setFromEuler(e4.set(0, p.yaw + Math.PI / 2, 0));
      p4.set(p.x - Math.cos(p.yaw) * 1.1, p.y + RAIL_SIZE.y * (0.5 + k), p.z + Math.sin(p.yaw) * 1.1);
      railsDrawn.setMatrixAt(nr++, m4.compose(p4, q4, one));
    }
    for (let k = 0; k < p.stone && ns < MAX; k++) {
      const a = k * 2.4 + p.yaw;
      q4.setFromEuler(e4.set(k, k * 2, 0));
      p4.set(p.x + Math.cos(a) * (0.9 + (k % 3) * 0.2), p.y + 0.16, p.z + Math.sin(a) * (0.9 + (k % 3) * 0.2));
      stoneDrawn.setMatrixAt(ns++, m4.compose(p4, q4, one));
    }
  }
  commitPieces(logsDrawn, nl);
  commitPieces(railsDrawn, nr);
  commitPieces(stoneDrawn, ns);
}

/** One piece off your back, onto the ground in front of you. */
function dropOne() {
  const b = me.body;
  if (!b || back.big) return false;
  const kind: PieceKind | null = back.rails ? 'rail' : back.stone ? 'stone' : back.logs ? 'log' : null;
  if (!kind) return false;
  if (kind === 'rail') back.rails--;
  else if (kind === 'stone') back.stone--;
  else back.logs--;
  const p = b.interpolatedPosition;
  const x = p.x - Math.sin(me.yaw) * 1.4,
    z = p.z - Math.cos(me.yaw) * 1.4;
  const feet = p.y - PLAYER_R,
    land = H(x, z);
  const y = Math.abs(land - feet) < 1.5 ? land : feet;
  let pile = piles.find((q) => Math.hypot(q.x - x, q.z - z) < JOIN_R && Math.abs(q.y - y) < 1);
  if (!pile) piles.push((pile = { x, y, z, yaw: me.yaw, logs: 0, rails: 0, stone: 0 }));
  const to = pile;
  send(kind, p4.set(p.x, p.y + 0.9, p.z), at.set(x, y + 0.2, z), {
    dur: 0.28,
    apex: 0.5,
    land: () => {
      if (kind === 'rail') to.rails++;
      else if (kind === 'stone') to.stone++;
      else to.logs++;
      knock(0.35, 0.7);
      draw();
      save();
    },
  });
  pop(2, 0.4);
  save();
  return true;
}

function pickUp(p: Pile) {
  const b = me.body;
  if (!b) return;
  for (const kind of ['log', 'stone', 'rail'] as const) {
    const key = kind === 'log' ? 'logs' : kind === 'rail' ? 'rails' : 'stone';
    while (p[key] > 0 && back.room() > 0) {
      p[key]--;
      back.incoming++;
      send(kind, at.set(p.x, p.y + 0.3, p.z), at, {
        dur: 0.3,
        apex: 0.9,
        aim: (to) => void to.set(b.position.x, b.position.y + 0.7, b.position.z),
        land: () => {
          back.incoming--;
          back[key]++;
          pop(3, 0.4);
        },
      });
    }
  }
  if (p.logs + p.rails + p.stone === 0) piles.splice(piles.indexOf(p), 1);
  draw();
  save();
}

registerInteractable(() => {
  const b = me.body;
  if (!b || !piles.length) return NO_TARGETS;
  const p = b.interpolatedPosition;
  let out: Interactable[] | null = null;
  for (const q of piles) {
    if (Math.hypot(p.x - q.x, p.z - q.z) > REACH || Math.abs(p.y - PLAYER_R - q.y) > 2) continue;
    const spot = new THREE.Vector3(q.x, q.y + 1.4, q.z);
    (out ??= []).push(
      back.room() <= 0
        ? { id: `place-pile${piles.indexOf(q)}`, verb: 'Pick up', at: spot, blocked: 'Your back is full' }
        : { id: `place-pile${piles.indexOf(q)}`, verb: 'Pick up', at: spot, run: () => pickUp(q) },
    );
  }
  return out ?? NO_TARGETS;
});

// R3 is free of every core and prototype claim (`npm run registry -- --json`, 3 November); D-pad up stays unclaimed.
registerAction('place-drop', {
  pad: 'r3',
  keys: ['Mouse2'],
  label: 'Drop one thing off your back',
  touch: { label: 'Drop', className: 'place-drop-btn' },
  group: 'hands',
  order: 3,
  down: () => void dropOne(),
});
addEventListener('mousedown', (e) => {
  if (e.button === 2 && me.entered && (e.target as Element | null)?.tagName === 'CANVAS')
    triggerAction('place-drop', 'down');
});

/** Start over: the piles go with everything else. */
export function resetDrops() {
  piles.length = 0;
  draw();
}

/** Each frame: the touch button shows while there's something on your back to drop. */
export function updateDrop() {
  document.body.classList.toggle('place-has-load', !back.big && back.logs + back.rails + back.stone > 0);
}

personalSlice('dropped', {
  get: () => piles.map((p) => ({ ...p })),
  set: (v) => {
    piles.length = 0;
    if (Array.isArray(v))
      for (const j of v as Partial<Pile>[]) {
        if (!j || !num(j.x) || !num(j.y) || !num(j.z) || !num(j.yaw)) continue;
        const logs = count(j.logs, 64) ? j.logs : 0,
          rails = count(j.rails, 64) ? j.rails : 0,
          stone = count(j.stone, 64) ? j.stone : 0;
        if (logs + rails + stone) piles.push({ x: j.x, y: j.y, z: j.z, yaw: j.yaw, logs, rails, stone });
      }
    draw();
  },
});
