// The haul stack: what you carry, drawn as a tower of pieces on your back (and on everyone else's, from the lockstep
// stacks matched to avatars through presence `u`). Past the soft cap (20) it sways harder, and a jump knocks the top
// pieces off into a pile behind you. A small chip shows your count and your own contribution tier (from the plaques). Pickups fly to your back the moment you walk into
// a pile (Local), while the host confirms (~0.5 s). Placeholder visuals (0.1 groundwork). No control of its own:
// pickup is walking into a pile, pouring is walking into a site's ring (work-sites.ts).
// Serves DESIGN.md 1 (toys before chores: a wobbly tower is fun to carry with nothing to do) and 10 (slapstick: the
// spill is a laugh and lands where anyone can scoop it up). Lockstep counts, Owner spill decision, Local wobble.
import { rules } from '../world/game-world.js'; // first: the lockstep rules register before anything else
import './haul-stack.css';
import * as THREE from 'three/webgpu';
import { onFrame } from '../loop.js';
import { identity } from '../player/identity.ts';
import { me } from '../player/player.js';
import { remotes, onRemotePresence } from '../netplay/net.js';
import { submitEdit } from '../world/sync.js';
import { okPid } from '../sim/roster.ts';
import { cellOf } from '../adapters/terrain.js';
import { pieceMesh, pieceColor, commitPieces, PIECE, onFly } from '../render/haul-pieces.ts';
import { SOFT_CAP, spillOf } from '../sim/stacks.ts';
import { MATERIALS } from '../sim/materials.ts';
import { TIERS, tierOf } from '../sim/tiers.ts';
import { reducedMotion } from '../constants.js';

const SHOWN = 40; // pieces drawn per stack
const FLY_MS = 380;
const SPILL_BACK = 2.8; // metres: walk-over reach (1.3) plus a cell's rounding and a step
const mesh = pieceMesh(9 * SHOWN + 48);
const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  v = new THREE.Vector3(),
  one = new THREE.Vector3(1, 1, 1),
  top = new THREE.Vector3();

onRemotePresence((r: { pid?: string | null }, pr: { u?: unknown }) => (r.pid = okPid(pr.u) ? pr.u : null));

type Stack = { n: number; k: number };
const stackOf = (pid: string | null | undefined): Stack => {
  const k = pid ? rules.roster.indexOf(pid) : -1;
  return k < 0 ? { n: 0, k: -1 } : { n: rules.stacks.countAt(k), k: rules.stacks.kindAt(k) };
};
export const myStack = () => stackOf(identity.pid);

// Where piece m of a stack of n sits on avatar a, at time t (s): along the back, swaying more the higher it is and
// the more you carry past the soft cap.
function pieceAt(a: THREE.Object3D, m: number, n: number, t: number, seed: number, out: THREE.Matrix4) {
  const over = Math.max(0, n - SOFT_CAP) / SOFT_CAP;
  const amp = reducedMotion ? 0 : 0.012 + over * 0.05;
  const h = m / SHOWN;
  const sway = Math.sin(t * (2.2 + over) + seed) * amp * m * (1 + h);
  const lean = Math.sin(t * 1.3 + seed * 2) * amp * 0.5 * m;
  v.set(sway, -0.1 + m * PIECE.r * 1.85, 0.42 + lean);
  e.set(0, (m % 2) * 0.12 - 0.06, sway * 0.6);
  q.setFromEuler(e);
  return out.compose(a.localToWorld(v), q.premultiply(a.quaternion), one);
}

// Pieces flying from a pile to your back: { from, n, t0 }.
const flights: { from: THREE.Vector3; n: number; t0: number }[] = [];
onFly((from, n) => flights.push({ from: from.clone(), n: Math.min(n, 6), t0: performance.now() }));

const chip = document.createElement('div');
chip.className = 'haul-chip';
document.body.append(chip);
let chipText = '';

// The jump spill: you decide it (Owner), the host applies it as a pile.drop from your own stack.
let wasGrounded = true;
function watchJump(mine: Stack): void {
  if (!me.entered || !me.body) return;
  const grounded = me.coyote > 0;
  if (wasGrounded && !grounded && me.body.velocity.y > 3) {
    const spill = spillOf(mine.n);
    if (spill) {
      const p = me.body.position;
      // behind you (you face -z at yaw 0), past walk-over reach, so you don't scoop it straight back on landing
      const bx = p.x + Math.sin(me.yaw) * SPILL_BACK,
        bz = p.z + Math.cos(me.yaw) * SPILL_BACK;
      const [i, j] = cellOf(bx, bz);
      submitEdit({ op: 'pile.drop', i, j, n: spill });
    }
  }
  wasGrounded = grounded;
}

onFrame(
  ({ now }: { now: number }) => {
    const mine = myStack();
    watchJump(mine);
    const t = now / 1000;
    let c = 0;
    const draw = (a: THREE.Object3D | null, pid: string | null | undefined, seed: number) => {
      const { n, k } = stackOf(pid);
      if (!a || !n) return;
      a.updateMatrixWorld();
      for (let m = 0; m < Math.min(n, SHOWN); m++) {
        mesh.setMatrixAt(c, pieceAt(a, m, n, t, seed, m4));
        mesh.setColorAt(c++, pieceColor(k));
      }
    };
    draw(me.entered ? me.avatar : null, identity.pid, 0);
    let s = 1;
    for (const r of remotes.values()) draw(r.visible ? r.avatar : null, r.pid, s++);
    // fly-ins: a short hop from the pile to the top of your stack
    for (let f = flights.length - 1; f >= 0; f--) {
      const fl = flights[f];
      const u = (now - fl.t0) / FLY_MS;
      if (u >= 1 || !me.avatar) {
        flights.splice(f, 1);
        continue;
      }
      me.avatar.updateMatrixWorld();
      const to = me.avatar.localToWorld(top.set(0, 0.4 + mine.n * PIECE.r * 1.85, 0.42));
      for (let m = 0; m < fl.n && c < mesh.instanceMatrix.count; m++) {
        const w = Math.min(1, Math.max(0, u * 1.4 - m * 0.08));
        v.lerpVectors(fl.from, to, w);
        v.y += Math.sin(w * Math.PI) * 1.2 + m * 0.05;
        e.set(w * 6, w * 3 + m, 0);
        mesh.setMatrixAt(c, m4.compose(v, q.setFromEuler(e), one));
        mesh.setColorAt(c++, pieceColor(Math.max(0, mine.k)));
      }
    }
    if (c || mesh.count) commitPieces(mesh, c);
    updateChip(mine);
  },
  { phase: 'update', order: 32 },
);

// The chip: your material and count, and your own tier only (brief 8: no readout on anyone else), derived from the
// plaques; rebuilt only when your stack or the sites change.
let chipKey = '';
function updateChip(mine: Stack): void {
  const key = `${mine.n}/${mine.k}/${rules.sites.sites.rev}`;
  if (key === chipKey) return;
  chipKey = key;
  const tier = TIERS[tierOf(identity.pid ? rules.sites.points(identity.pid) : 0)]?.name;
  const text = [mine.n ? `${MATERIALS[mine.k]} ${mine.n}` : '', tier ?? ''].filter(Boolean).join(' · ');
  if (text !== chipText) {
    chipText = text;
    chip.textContent = text;
    chip.classList.toggle('on', !!text);
    chip.classList.toggle('wobbly', mine.n > SOFT_CAP);
  }
}
