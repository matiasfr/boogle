// The hero's default body in ?proto=hero: hand-made animation. Quaternius's Universal Animation Library (CC0,
// assets/src/hero-clips.json) on its mannequin, with code only choosing and blending clips, to judge the motion apart
// from any model of ours. Walk, jog and sprint are played by distance at the rate that matches each clip's stride to the
// ground (measured from the library's root-motion file), so the feet don't slide; they share one phase so a blend
// between them stays in step. Everything comes from speed and airborne, so remote players need no new presence.
import * as THREE from 'three/webgpu';
import { COLORS, PLAYER_R } from '../../constants.ts';
import { clamp } from '../../math.ts';
import { precompile } from '../../render/precompile.ts';
import { loadAsset } from '../../render/assets.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { setAvatarSkin, type Avatar } from '../../player/avatars.ts';
import { shadeOnce } from '../../player/hero.ts';
import { startHeroCamera } from './camera.ts';
import url from '../../../assets/built/hero-clips.glb?url';

const HEIGHT = 1.75; // m
// m per cycle, from the root-motion clips' travel: walk 1.3 m in 1.33 s, jog 5 m in 0.93 s, sprint 5.5 m in 0.67 s.
const STRIDE = { walk: 1.3, jog: 5, sprint: 5.5 };
const BLEND = { idleTo: 0.15, walkTo: 2, jogFrom: 3.2, jogTo: 6.5, sprintFrom: 8.5 }; // m/s
const FADE = { ground: 0.06, air: 0.05 }; // s
const JUMP_FROM = 0.3; // s into Jump_Start where the feet leave the ground (its wind-up would delay the jump)
const LAND = { for: 0.35, stop: 2.5 }; // s of Jump_Land, and the speed above which you run straight out of it
const LOCO = ['Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'] as const;
const NAMES = ['Idle_Loop', ...LOCO, 'Jump_Start', 'Jump_Loop', 'Jump_Land'];

type Rig = {
  mixer: THREE.AnimationMixer;
  acts: Record<string, THREE.AnimationAction>;
  w: Record<string, number>;
  phase: number;
  idleT: number;
  air: boolean;
  airT: number;
  landT: number;
};
const rigs = new WeakMap<Avatar, Rig>();

function animate(a: Avatar, speed: number, airborne: boolean, dt: number) {
  const r = rigs.get(a);
  if (!r || dt <= 0) return;
  const inner = a.userData.inner;
  inner.rotation.x = 0;
  inner.scale.set(1, 1, 1);
  // feel.ts squashes the whole avatar about its origin, 0.45 m above the soles: keep the soles on the ground.
  inner.position.y = PLAYER_R - PLAYER_R / Math.max(0.2, a.scale.y);

  if (airborne && !r.air) r.airT = 0;
  if (!airborne && r.air) r.landT = 0;
  r.air = airborne;
  r.airT += dt;
  r.landT += dt;

  // Which clips, how much: walk up to 2 m/s, jog from 3.2, sprint from 8.5, blends between.
  const v = speed;
  const toJog = clamp((v - BLEND.walkTo) / (BLEND.jogFrom - BLEND.walkTo), 0, 1),
    toSprint = clamp((v - BLEND.jogTo) / (BLEND.sprintFrom - BLEND.jogTo), 0, 1);
  const move = clamp(v / BLEND.idleTo, 0, 1);
  const want: Record<string, number> = {};
  const landing = r.landT < LAND.for && v < LAND.stop;
  if (airborne) {
    const start = r.airT < 0.18;
    want.Jump_Start = start ? 1 : 0;
    want.Jump_Loop = start ? 0 : 1;
  } else if (landing) want.Jump_Land = 1;
  else {
    want.Idle_Loop = 1 - move;
    want.Walk_Loop = move * (1 - toJog);
    want.Jog_Fwd_Loop = move * toJog * (1 - toSprint);
    want.Sprint_Loop = move * toSprint;
  }
  const k = 1 - Math.exp(-dt / (airborne ? FADE.air : FADE.ground));
  for (const n of NAMES) {
    r.w[n] += ((want[n] ?? 0) - r.w[n]) * k;
    r.acts[n].setEffectiveWeight(r.w[n]);
  }

  // The stride is the blend of the clips' strides, so the feet keep to the ground through a blend.
  const stride = STRIDE.walk * (1 - toJog) + (STRIDE.jog * (1 - toSprint) + STRIDE.sprint * toSprint) * toJog;
  r.phase = (r.phase + (v * dt) / stride) % 1;
  if (v < BLEND.idleTo) r.phase = 0;
  for (const n of LOCO) r.acts[n].time = r.phase * r.acts[n].getClip().duration;
  r.idleT += dt;
  r.acts.Idle_Loop.time = r.idleT % r.acts.Idle_Loop.getClip().duration;
  r.acts.Jump_Start.time = Math.min(JUMP_FROM + r.airT, r.acts.Jump_Start.getClip().duration);
  r.acts.Jump_Loop.time = r.airT % r.acts.Jump_Loop.getClip().duration;
  r.acts.Jump_Land.time = r.landT;
  r.mixer.update(0);
}

export async function startClipsHero() {
  const kit = await loadAsset(url);
  shadeOnce(kit.gltf.scene);
  const dress = (a: Avatar, colorIdx: number) => {
    if (rigs.has(a)) return;
    const holder = kit.instance();
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder, true);
    const s = HEIGHT / Math.max(0.01, box.max.y - box.min.y);
    holder.scale.setScalar(s);
    holder.position.y = -PLAYER_R - box.min.y * s;
    holder.rotation.y = Math.PI; // the clips face +z; avatars face -z
    let mat: THREE.MeshStandardNodeMaterial | null = null;
    holder.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.frustumCulled = false; // skinned: the bind pose's bounds don't follow the clips
      const shared = m.isMesh ? (m.material as THREE.MeshStandardNodeMaterial) : null;
      if (shared?.name === 'M_Main') {
        mat = shared.clone();
        mat.color.set(COLORS[colorIdx]);
        m.material = mat;
      }
    });
    for (const child of a.userData.inner.children) child.visible = false; // the capsule and its eyes
    a.userData.inner.add(holder);
    if (mat) a.userData.mat = mat as unknown as THREE.MeshStandardMaterial;
    a.userData.leanScale = 0; // the clips lean on their own
    const mixer = new THREE.AnimationMixer(holder.children[0]);
    const acts: Record<string, THREE.AnimationAction> = {};
    const w: Record<string, number> = {};
    for (const n of NAMES) {
      const act = mixer.clipAction(kit.clip(n));
      act.play();
      act.timeScale = 0; // animate() sets each clip's time itself
      act.setEffectiveWeight(n === 'Idle_Loop' ? 1 : 0);
      acts[n] = act;
      w[n] = n === 'Idle_Loop' ? 1 : 0;
    }
    rigs.set(a, { mixer, acts, w, phase: 0, idleT: Math.random() * 2, air: false, airT: 1, landT: 1 });
  };
  await precompile(kit.instance());
  setAvatarSkin({ dress, animate }, [me.avatar, ...[...remotes.values()].map((r) => r.avatar)]);
  startHeroCamera();
}
