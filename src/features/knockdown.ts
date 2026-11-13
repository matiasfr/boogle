// Knocked flat: whoever sets me.down (the first visit's landing, src/fall/) lies on their back with stars circling
// until me.downUntil, then gets up. While down you cannot move or jump (src/entities/player/state.ts). Your client
// publishes it as the presence field `kd` (ms remaining), so everyone sees the flop and hears a friend go down.
// Local cosmetics apart from your own movement lock, so Math.random is fine.
import type { Avatar } from '../player/avatars.ts';
import * as THREE from 'three';
import { defineKind, spawn } from '../entity/entity.ts';
import { material } from '../render/materials.ts';
import { warmUp } from '../render/precompile.ts';
import { boing, farGain } from '../render/boing.ts';
import { PLAYER_R, HEAD_OFFSET } from '../constants.ts';
import { lerp } from '../math.ts';
import { me } from '../player/player.ts';
import { remotes, addPresenceField, onRemotePresence, type Remote } from '../netplay/net.ts';

addPresenceField('kd', () => (me.down ? Math.max(1, Math.round(me.downUntil - performance.now())) : null));
onRemotePresence((r, pr) => {
  const kd = pr.kd as number;
  if (Number.isFinite(kd) && kd > 0 && kd <= 2000) {
    const now = performance.now();
    if (!((r.kdUntil ?? -Infinity) > now)) onRemoteDown(r);
    r.kdUntil = now + kd;
  }
});
function onRemoteDown(r: Remote) {
  boing(16, 0.25 * farGain(r.target.x, r.target.z), true);
}

// ---------------------------------------------------------------- flop + stars
// Linear HDR radiance under the real sea's fixed exposure.
const STAR_BRIGHTNESS = 6;
const starTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffd84a';
  g.strokeStyle = '#b37a00';
  g.lineWidth = 3;
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 ? 11 : 28,
      a = -Math.PI / 2 + (k * Math.PI) / 5;
    g[k ? 'lineTo' : 'moveTo'](32 + Math.cos(a) * r, 33 + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.stroke();
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
})();
const starMat = material('feedback', {
  map: starTex,
  emissive: { linear: [1, 1, 1], gain: STAR_BRIGHTNESS },
});
// The stars are made at the first flop, the first visit's landing included: their pipeline builds just after the loading
// screen, with the spawn's surroundings (src/render/precompile.ts).
warmUp(() => new THREE.Sprite(starMat), { defer: 'near' });
const ents = new WeakMap<THREE.Object3D, { amt: number; stars: THREE.Group }>(); // avatar -> its flop state
function entOf(avatar: THREE.Object3D) {
  let e = ents.get(avatar);
  if (!e) {
    const stars = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Sprite(starMat);
      s.scale.set(0.3, 0.3, 1);
      s.renderOrder = 11;
      stars.add(s);
    }
    stars.visible = false;
    avatar.add(stars);
    e = { amt: 0, stars };
    ents.set(avatar, e);
  }
  return e;
}
function flop(avatar: Avatar, down: boolean, left: number, dt: number, t: number) {
  const e = entOf(avatar);
  const u = avatar.userData;
  e.amt = lerp(e.amt, down ? 1 : 0, 1 - Math.exp(-dt * (down ? 22 : 14)));
  u.flopAmt = e.amt;
  if (e.amt > 0.002) {
    u.inner.rotation.x = lerp(u.inner.rotation.x, Math.PI / 2, e.amt);
    u.inner.position.y = lerp(u.inner.position.y, u.flopY ?? PLAYER_R, e.amt);
    u.inner.scale.set(1, 1, 1);
  }
  e.stars.visible = down && left > 0;
  if (e.stars.visible) {
    // Head ends up behind the feet (+z in avatar space) when lying on the back.
    const stars = e.stars.children;
    const sp = stars.length;
    const low = (u.flopY ?? PLAYER_R) - PLAYER_R; // a body lying lower has its stars lower
    for (let k = 0; k < sp; k++) {
      const a = t * 5 + (k * Math.PI * 2) / sp;
      stars[k]!.position.set(
        Math.cos(a) * 0.5,
        1.0 + low + Math.sin(a * 2) * 0.05,
        HEAD_OFFSET + 0.2 + Math.sin(a) * 0.5,
      );
    }
  }
}

// Getting up after the physics step; the flop just before render, after the ball's hit-stop (impact.ts, late -10).
defineKind('knockdown', { postPhysics: 0, lateUpdate: -9 });
spawn({
  kind: 'knockdown',
  postPhysics({ now }) {
    if (me.down && now >= me.downUntil) me.down = false;
  },
  lateUpdate({ now, dt, elapsed }) {
    if (me.avatar) flop(me.avatar, me.down, me.downUntil - now, dt, elapsed);
    for (const r of remotes.values())
      if (r.avatar) flop(r.avatar, (r.kdUntil ?? 0) > now, (r.kdUntil ?? 0) - now, dt, elapsed);
  },
});
