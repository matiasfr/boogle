// Ball golf, one hole (?proto=minis, research shortlist 5): a tee mat at the court's west edge, a striped bucket with a
// tall flag about 36 m west past the palms. Tee off (Interact at the tee) puts the beach ball on the tee; every throw
// and bump of it is a stroke, and carrying it counts a stroke every 3 m. The count floats over the ball; the bucket
// scores it against par and your best. Local: your strokes and best; the ball itself is still the shared one.
import * as THREE from 'three/webgpu';
import { createBody, addBody, teleport, material, type Shape } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { scene } from '../../render/scene.ts';
import { ball, respawnBall, remoteHoldsBall } from '../../physics/ball.ts';
import { me, cam } from '../../player/player.ts';
import { drop, has } from '../../player/inventory.ts';
import { registerInteractable } from '../../player/hands.ts';
import { BALL_R } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { label, best, saveBest, fanfare, confetti, pop, near, onShot, flat, womp } from './common.ts';

export const TEE = { x: 4, z: 19 };
export const CUP = { x: -30, z: 16.5 };
export const PAR = 3;
const IN_R = 0.85; // m: inside radius of the bucket
const WALL = 0.12;
const DEPTH = 0.85;
const CARRY = 3; // m carried per stroke

// ---------------------------------------------------------------- the tee
const teeY = groundHeight(TEE.x, TEE.z);
const mat = new THREE.Mesh(
  new THREE.CylinderGeometry(1.3, 1.3, 0.08, 24),
  new THREE.MeshStandardNodeMaterial({ color: '#5fbf5a', roughness: 0.9 }),
);
mat.position.set(TEE.x, teeY + 0.03, TEE.z);
mat.receiveShadow = true;
scene.add(mat);
const peg = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.05, 0.3, 8),
  new THREE.MeshStandardNodeMaterial({ color: '#ffffff', roughness: 0.6 }),
);
peg.position.set(TEE.x, teeY + 0.15, TEE.z);
scene.add(peg);
const teeSign = label(3.2, 1.6);
teeSign.sprite.position.set(TEE.x, teeY + 3.4, TEE.z);
scene.add(teeSign.sprite);

// ---------------------------------------------------------------- the bucket and its flag
let cupY = Infinity;
for (let a = 0; a < 8; a++)
  cupY = Math.min(cupY, groundHeight(CUP.x + Math.cos(a) * (IN_R + WALL), CUP.z + Math.sin(a) * (IN_R + WALL)));
cupY -= 0.05; // the bucket's floor: level, a little sunk on the uphill side
const RED = new THREE.MeshStandardNodeMaterial({ color: '#e8453c', roughness: 0.6, side: THREE.DoubleSide });
const WHITE = new THREE.MeshStandardNodeMaterial({ color: '#fff6e6', roughness: 0.6, side: THREE.DoubleSide });
const bucket = new THREE.Group();
bucket.position.set(CUP.x, cupY, CUP.z);
// Red and white bands, outside and in.
for (let k = 0; k < 3; k++) {
  const h = DEPTH / 3;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(IN_R + WALL, IN_R + WALL - 0.04 * (2 - k), h, 28, 1, true),
    k % 2 ? WHITE : RED,
  );
  band.position.y = h * (k + 0.5);
  band.castShadow = true;
  bucket.add(band);
}
const rim = new THREE.Mesh(new THREE.TorusGeometry(IN_R + WALL, 0.07, 6, 28), WHITE);
rim.rotation.x = Math.PI / 2;
rim.position.y = DEPTH;
bucket.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(IN_R + WALL, 24), RED);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.02;
bucket.add(floor);
// The flag: a tall pole beside the bucket, readable across the palms.
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.5, 8), WHITE);
pole.position.set(IN_R + WALL + 0.25, 2.75, 0);
pole.castShadow = true;
bucket.add(pole);
const cloth = new THREE.Shape();
cloth.moveTo(0, 0);
cloth.lineTo(2.2, -0.65);
cloth.lineTo(0, -1.3);
const flagMesh = new THREE.Mesh(
  new THREE.ShapeGeometry(cloth),
  new THREE.MeshStandardNodeMaterial({ color: '#ffcf33', roughness: 0.7, side: THREE.DoubleSide }),
);
flagMesh.position.set(IN_R + WALL + 0.25, 5.4, 0);
flagMesh.castShadow = true;
bucket.add(flagMesh);
scene.add(bucket);
const cupSign = label(5.2, 2.6);
cupSign.sprite.position.set(CUP.x, cupY + 7.6, CUP.z);
scene.add(cupSign.sprite);
// Physics: a floor and a ring of wall slabs, so the ball can roll round the rim and drop in.
const shapes: Shape[] = [
  {
    kind: 'cylinder',
    rTop: IN_R + WALL,
    rBottom: IN_R + WALL,
    h: 0.1,
    segments: 20,
    offset: { x: 0, y: 0, z: 0 },
  },
];
const N = 16;
for (let k = 0; k < N; k++) {
  const a = (k / N) * Math.PI * 2;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
  shapes.push({
    kind: 'box',
    hx: WALL / 2,
    hy: DEPTH / 2,
    hz: (Math.PI * (IN_R + WALL) * 1.08) / N,
    offset: { x: Math.cos(a) * (IN_R + WALL / 2), y: DEPTH / 2, z: Math.sin(a) * (IN_R + WALL / 2) },
    rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
  });
}
// A dead bucket: the ball drops in and stays (restitution multiplies: 0.55 x 0.05).
const bucketMat = material('bucket', { friction: 1, restitution: 0.05 });
addBody(createBody({ group: GROUP.SCENERY, material: bucketMat, position: { x: CUP.x, y: cupY, z: CUP.z }, shapes }));

// ---------------------------------------------------------------- the hole
const st = {
  mode: 'idle' as 'idle' | 'ready' | 'play' | 'holed',
  strokes: 0,
  lie: new THREE.Vector3(),
  wasHeld: false,
};
const strokeSign = label(2.2, 1.1);
strokeSign.sprite.visible = false;
scene.add(strokeSign.sprite);

const name = (n: number) =>
  n === 1
    ? 'HOLE IN ONE!'
    : ['', '', 'Eagle!', 'Birdie!', 'Par', 'Bogey', 'Double bogey'][n - PAR + 4] || `+${n - PAR}`;
function paintSigns() {
  const b = best('golf');
  teeSign.set(
    'Tee',
    st.mode === 'idle' || st.mode === 'holed' ? 'E: tee off' : b === null ? `par ${PAR}` : `best ${b}`,
  );
  if (st.mode !== 'holed') cupSign.set(`par ${PAR}`, b === null ? 'no best yet' : `best ${b}`);
}
paintSigns();

function teeOff() {
  respawnBall();
  if (has('ball')) drop('ball');
  teleport(ball.body, TEE.x, teeY + 0.3 + BALL_R, TEE.z);
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);
  ball.disp.p.set(TEE.x, teeY + 0.3 + BALL_R, TEE.z);
  st.mode = 'ready';
  st.strokes = 0;
  pop(0);
  paintSigns();
}
function again() {
  if (me.body) {
    // Stand behind the tee, facing the flag.
    const dx = CUP.x - TEE.x,
      dz = CUP.z - TEE.z,
      l = Math.hypot(dx, dz);
    const x = TEE.x - (dx / l) * 2.2,
      z = TEE.z - (dz / l) * 2.2;
    teleport(me.body, x, groundHeight(x, z) + 1, z);
    me.body.velocity.set(0, 0, 0);
    cam.yaw = me.yaw = Math.atan2(-dx, -dz);
  }
  teeOff();
}
function stroke(why: string) {
  if (st.mode !== 'ready' && st.mode !== 'play') return;
  st.mode = 'play';
  st.strokes++;
  strokeSign.set(String(st.strokes), why, why ? '#ffb38a' : '#fff7e8');
  strokeSign.punch();
  pop(Math.min(st.strokes, 7), 0.5);
}
onShot(() => stroke(''));

function holed() {
  st.mode = 'holed';
  const n = st.strokes;
  const b = best('golf');
  const isBest = b === null || n < b;
  if (isBest) saveBest('golf', n);
  cupSign.set(name(n), isBest ? `NEW BEST: ${n}` : `${n} strokes · best ${b}`, n <= PAR ? '#7dff9a' : '#ffd166');
  cupSign.punch();
  if (n <= PAR || isBest) {
    confetti(CUP.x, cupY + DEPTH, CUP.z, isBest ? 140 : 80);
    fanfare(isBest || n === 1, near(CUP.x, CUP.z) * 0.6 + 0.4);
  } else womp(0.6);
  strokeSign.sprite.visible = false;
  paintSigns();
}

const promptAt = new THREE.Vector3();
registerInteractable(() => {
  if (!me.body) return [];
  const p = me.body.interpolatedPosition;
  if (flat(p.x, p.z, TEE.x, TEE.z) < 3) {
    promptAt.set(TEE.x, teeY + 1.4, TEE.z);
    const t = {
      id: 'golf-tee',
      verb: st.mode === 'idle' || st.mode === 'holed' ? 'Tee off' : 'Start over',
      at: promptAt,
    };
    return [remoteHoldsBall() ? { ...t, blocked: 'Someone has the ball' } : { ...t, run: teeOff }];
  }
  if (st.mode === 'holed' && flat(p.x, p.z, CUP.x, CUP.z) < 5) {
    promptAt.set(CUP.x, cupY + 1.6, CUP.z);
    const t = { id: 'golf-again', verb: 'Play again', at: promptAt, r: 1 };
    return [remoteHoldsBall() ? { ...t, blocked: 'Someone has the ball' } : { ...t, run: again }];
  }
  return [];
});

onFrame(
  () => {
    const bp = ball.disp.p;
    const live = st.mode === 'ready' || st.mode === 'play';
    // Carrying the ball: a stroke for every 3 m walked with it.
    const held = ball.mine && ball.held;
    if (held && !st.wasHeld && me.body) st.lie.copy(me.body.position);
    st.wasHeld = held;
    if (live && held && me.body && flat(me.body.position.x, me.body.position.z, st.lie.x, st.lie.z) > CARRY) {
      st.lie.copy(me.body.position);
      stroke('+1 carry');
    }
    // Someone else took the ball: this hole is off.
    if (live && ball.owner?.remote) {
      st.mode = 'idle';
      paintSigns();
    }
    strokeSign.sprite.visible = live;
    if (live) {
      strokeSign.sprite.position.set(bp.x, bp.y + 1.5, bp.z);
      if (st.mode === 'ready') strokeSign.set('0', `par ${PAR}`);
    }
    if (
      live &&
      st.strokes > 0 &&
      !ball.held &&
      flat(bp.x, bp.z, CUP.x, CUP.z) < IN_R - 0.1 &&
      bp.y < cupY + DEPTH &&
      bp.y > cupY - 0.3
    )
      holed();
  },
  { phase: 'update', order: 61 },
);

export const golfState = () => ({ mode: st.mode, strokes: st.strokes, best: best('golf') });
export { teeOff };
