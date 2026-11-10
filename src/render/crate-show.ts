// A crate opening, Place's show (gifts.ts "the show"): the box rattles for its tier, then bursts. Boards fly, a flash
// and a shaft of light, confetti and the tier's sound; then the card, through whichever reveal queue `youGot` is. One at
// a time. The station boxes (src/entities/railway/crates-view.ts) and the secret boxes (src/entities/finds/view.ts)
// share it. Local presentation only: what was in the box is saved by its caller before `open`.
import * as THREE from 'three/webgpu';
import { REVEAL_SHAKE, TIER_COLOR, TIER_MARKS, type Tier } from './cosmetic-parts.ts';
import { confettiBurst, rewardDust, rewardSparkles } from './reward-particles.ts';
import { placeSound } from './place-sfx.ts';
import type { Got, RewardGlow } from './reward-reveal.ts';

export type CrateShowDeps = {
  /** Where flying boards land. */
  floor: (x: number, z: number) => number;
  softGlow: (color: string, strength: number, fade?: boolean | 'up') => RewardGlow;
  youGot: (g: Got) => boolean;
};
type Opening = {
  /** The box that rattles: its rotation and scale are the show's until it bursts. */
  mesh: THREE.Object3D;
  at: THREE.Vector3;
  tier: Tier;
  /** The card: the gift's name and line, and its model. */
  name: string;
  line?: string;
  model: THREE.Object3D;
  /** The card was put away. */
  done: () => void;
};

export function createCrateShow(parent: THREE.Object3D, { floor, softGlow, youGot }: CrateShowDeps) {
  const root = new THREE.Group();
  parent.add(root);
  const boardMaterial = new THREE.MeshStandardNodeMaterial({ color: '#b57f44', roughness: 0.9 });
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(0.72, 0.07, 0.22), boardMaterial, 14);
  boards.count = 0;
  boards.frustumCulled = false;
  boards.castShadow = true;
  const flashGlow = softGlow('#fff0c0', 1);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), flashGlow.mat);
  const shaftGlow = softGlow('#ffe08a', 0.8, true);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 2.1, 40, 14, 1, true).translate(0, 20, 0),
    shaftGlow.mat,
  );
  flash.visible = shaft.visible = false;
  root.add(boards, flash, shaft);
  const boardPose = new THREE.Object3D();
  const flying: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    a: number;
    va: number;
    t: number;
  }[] = [];
  let show: (Opening & { t: number; boomed: boolean; carded: boolean; unqueued: boolean }) | null = null;

  function boom(s: NonNullable<typeof show>) {
    const { at } = s;
    s.boomed = true;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2,
        speed = 3 + Math.random() * 3.5;
      flying[k] = {
        x: at.x,
        y: at.y + 0.5,
        z: at.z,
        vx: Math.cos(a) * speed,
        vy: 4 + Math.random() * 5,
        vz: Math.sin(a) * speed,
        a: Math.random() * 6,
        va: 6 + Math.random() * 9,
        t: 0,
      };
    }
    confettiBurst(at.x, at.y + 0.8, at.z);
    rewardSparkles(at.x, at.y + 0.8, at.z, 34, 6);
    rewardDust(at.x, at.y + 0.1, at.z);
    placeSound(s.tier === 'wonder' ? 'boxWonder' : s.tier === 'rare' ? 'boxRare' : 'boxCommon', at.x, at.z);
    flash.position.copy(at).y += 0.9;
    shaft.position.copy(at);
    const queued = youGot({
      name: s.name,
      line: s.line,
      rarity: TIER_MARKS[s.tier],
      color: TIER_COLOR[s.tier],
      model: s.model,
      from: at.clone().setY(at.y + 0.9),
      done: () => {
        s.done();
        if (show === s) show = null;
      },
    });
    // No queue took it (the railway view is gone): it's put away at once, and the show ends with its flash.
    if (!queued) {
      s.unqueued = true;
      s.done();
    }
  }

  function updateShow(dt: number) {
    const s = show;
    if (!s || s.carded) return;
    s.t += dt;
    const shake = REVEAL_SHAKE[s.tier];
    if (!s.boomed) {
      const w = Math.sin(s.t * 60) * 0.06 * (0.4 + s.t / shake);
      s.mesh.rotation.set(w, 0, -w);
      s.mesh.scale.setScalar(1 + (s.t / shake) * 0.14);
      if (s.t >= shake) boom(s);
      return;
    }
    const u = s.t - shake,
      fb = Math.min(1, u / 0.42),
      fs = Math.min(1, u / 0.8);
    flash.visible = fb < 1;
    flash.scale.setScalar(0.6 + fb * 6);
    flashGlow.strength.value = (1 - fb) * 1.1;
    shaft.visible = fs < 1;
    shaft.scale.set(1 + fs * 0.3, 1, 1 + fs * 0.3);
    shaftGlow.strength.value = 0.7 * (1 - fs * fs);
    if (fb >= 1 && fs >= 1) {
      s.carded = true; // the card has it now
      if (s.unqueued && show === s) show = null;
    }
  }

  function updateBoards(dt: number) {
    for (let i = 0; i < flying.length; i++) {
      const f = flying[i]!;
      f.t += dt;
      f.vy -= 14 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.z += f.vz * dt;
      f.a += f.va * dt;
      const ground = floor(f.x, f.z) + 0.05;
      if (f.y < ground) {
        f.y = ground;
        f.vy *= -0.3;
        f.vx *= 0.6;
        f.vz *= 0.6;
        f.va *= 0.5;
      }
      boardPose.position.set(f.x, f.y, f.z);
      boardPose.rotation.set(f.a, f.a * 0.6, 0);
      boardPose.updateMatrix();
      boards.setMatrixAt(i, boardPose.matrix);
    }
    if (flying[0] && flying[0].t > 2.4) flying.length = 0;
    boards.count = flying.length;
    if (boards.count) boards.instanceMatrix.needsUpdate = true;
  }

  return {
    /** Starts a box's show, unless one is on already. */
    open(o: Opening) {
      if (show) return false;
      show = { ...o, t: 0, boomed: false, carded: false, unqueued: false };
      return true;
    },
    /** A show is on, from the rattle until its card is put away. */
    busy: () => !!show,
    /** The box whose show is on, while it's on. */
    opening: () => show?.mesh ?? null,
    /** That box has burst: it's in pieces, not on its stand. */
    burst: () => !!show?.boomed,
    update(dt: number) {
      updateShow(dt);
      updateBoards(dt);
    },
    dispose() {
      root.removeFromParent();
      for (const g of [boards.geometry, flash.geometry, shaft.geometry]) g.dispose();
      for (const m of [boardMaterial, flashGlow.mat, shaftGlow.mat]) m.dispose();
      boards.dispose();
    },
  };
}
export type CrateShow = ReturnType<typeof createCrateShow>;
