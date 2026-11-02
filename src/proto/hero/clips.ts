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
import { LOOKS, applyLook, inflate } from './looks.ts';
import url from '../../../assets/built/hero-clips.glb?url';
import tracklayerUrl from '../../../assets/built/tracklayer.glb?url';
import { retargetClip } from './retarget.ts';

// m per cycle, from the root-motion clips' travel: walk 1.3 m in 1.33 s, jog 5 m in 0.93 s, sprint 5.5 m in 0.67 s.
// The sprint clip's feet sweep slower than its 5.5 m suggests, so it plays on a shorter one: a 0.5 s cycle at full speed.
const STRIDE = { walk: 1.3, jog: 5, sprint: 4.8 };
const BLEND = { idleTo: 0.15, walkTo: 2, jogFrom: 3.2, jogTo: 6.5, sprintFrom: 8.5 }; // m/s
const FADE = { ground: 0.06, air: 0.05 }; // s
const JUMP_FROM = 0.3; // s into Jump_Start where the feet leave the ground (its wind-up would delay the jump)
const LAND = { for: 0.35, stop: 2.5 }; // s of Jump_Land, and the speed above which you run straight out of it
const LOCO = ['Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'] as const;
const NAMES = ['Idle_Loop', ...LOCO, 'Jump_Start', 'Jump_Loop', 'Jump_Land'];
const look = LOOKS[new URLSearchParams(location.search).get('body') ?? ''] ?? LOOKS.mannequin!;

type Rig = {
  mixer: THREE.AnimationMixer;
  acts: Record<string, THREE.AnimationAction>;
  w: Record<string, number>;
  phase: number;
  idleT: number;
  air: boolean;
  airT: number;
  landT: number;
  scaled: [THREE.Object3D, number][];
  pelvis: THREE.Object3D;
  legs: number;
  spread: [THREE.Object3D, number][];
  strideK: number; // the stride's scale: the legs', and the whole figure's
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
    r.w[n]! += ((want[n] ?? 0) - r.w[n]!) * k;
    r.acts[n]!.setEffectiveWeight(r.w[n]!);
  }

  // The stride is the blend of the clips' strides, so the feet keep to the ground through a blend.
  const stride =
    r.strideK * (STRIDE.walk * (1 - toJog) + (STRIDE.jog * (1 - toSprint) + STRIDE.sprint * toSprint) * toJog);
  r.phase = (r.phase + (v * dt) / stride) % 1;
  if (v < BLEND.idleTo) r.phase = 0;
  for (const n of LOCO) r.acts[n]!.time = r.phase * r.acts[n]!.getClip().duration;
  r.idleT += dt;
  r.acts.Idle_Loop!.time = r.idleT % r.acts.Idle_Loop!.getClip().duration;
  r.acts.Jump_Start!.time = Math.min(JUMP_FROM + r.airT, r.acts.Jump_Start!.getClip().duration);
  r.acts.Jump_Loop!.time = r.airT % r.acts.Jump_Loop!.getClip().duration;
  r.acts.Jump_Land!.time = r.landT;
  r.mixer.update(0);
  // After the clips, which also key every bone's scale and the hips' height.
  for (const [bone, k] of r.scaled) bone.scale.setScalar(k);
  r.pelvis.position.multiplyScalar(r.legs);
  for (const [bone, k] of r.spread) bone.position.multiplyScalar(k);
}

// &body=tracklayer: the real character (assets/src/tracklayer.json, made with Meshy) on the same clips, retargeted onto its
// own skeleton at load. It keeps its painted textures for now, so it doesn't take the player's colour yet.
const ARM_OUT = (12 * Math.PI) / 180; // its body is wider than the mannequin's
async function startTracklayer() {
  const [clips, model] = await Promise.all([loadAsset(url), loadAsset(tracklayerUrl)]);
  shadeOnce(model.gltf.scene);
  const src = clips.instance();
  const tgt = model.instance();
  let ratio = 1;
  const baked = new Map<string, THREE.AnimationClip>();
  for (const n of NAMES) {
    const r = retargetClip(clips.clip(n), src.children[0]!, tgt.children[0]!, { armOut: ARM_OUT });
    baked.set(n, r.clip);
    ratio = r.ratio;
  }
  const dress = (a: Avatar) => {
    if (rigs.has(a)) return;
    const holder = model.instance();
    const root = holder.children[0]!;
    holder.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.frustumCulled = false; // skinned: the bind pose's bounds don't follow the clips
    });
    holder.position.y = -PLAYER_R;
    holder.rotation.y = Math.PI; // the model faces +z; avatars face -z
    for (const child of a.userData.inner.children) child.visible = false; // the capsule and its eyes
    a.userData.inner.add(holder);
    a.userData.leanScale = 0; // the clips lean on their own
    const mixer = new THREE.AnimationMixer(root);
    const acts: Record<string, THREE.AnimationAction> = {};
    const w: Record<string, number> = {};
    for (const n of NAMES) {
      const act = mixer.clipAction(baked.get(n)!);
      act.play();
      act.timeScale = 0;
      act.setEffectiveWeight(n === 'Idle_Loop' ? 1 : 0);
      acts[n] = act;
      w[n] = n === 'Idle_Loop' ? 1 : 0;
    }
    rigs.set(a, {
      mixer,
      acts,
      w,
      phase: 0,
      idleT: Math.random() * 2,
      air: false,
      airT: 1,
      landT: 1,
      scaled: [],
      pelvis: root.getObjectByName('Hips')!,
      legs: 1,
      spread: [],
      strideK: ratio,
    });
  };
  await precompile(model.instance());
  setAvatarSkin({ dress, animate }, [me.avatar, ...[...remotes.values()].map((r) => r.avatar)]);
  startHeroCamera();
}

export async function startClipsHero() {
  if (new URLSearchParams(location.search).get('body') === 'tracklayer') return startTracklayer();
  const kit = await loadAsset(url);
  shadeOnce(kit.gltf.scene);
  const dress = (a: Avatar, colorIdx: number) => {
    if (rigs.has(a)) return;
    const holder = kit.instance();
    const root = holder.children[0]!;
    // Each figure's skin in its player's colour; its joints a shade darker, except the plain mannequin's.
    let mat: THREE.MeshStandardNodeMaterial | null = null;
    holder.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false; // skinned: the bind pose's bounds don't follow the clips
      const shared = m.material as THREE.MeshStandardNodeMaterial;
      const own = shared.clone();
      if (shared.name === 'M_Main') {
        own.color.set(COLORS[colorIdx]!);
        mat = own;
      } else if (look !== LOOKS.mannequin) own.color.set(COLORS[colorIdx]!).multiplyScalar(0.72);
      inflate(own, look.inflate);
      m.material = own;
    });
    const { scaled, pelvis, legs, spread } = applyLook(look, root, mat ?? new THREE.MeshStandardNodeMaterial());
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder, true);
    const s = look.height / Math.max(0.01, box.max.y - box.min.y);
    holder.scale.setScalar(s);
    holder.position.y = -PLAYER_R - box.min.y * s;
    holder.rotation.y = Math.PI; // the clips face +z; avatars face -z
    for (const child of a.userData.inner.children) child.visible = false; // the capsule and its eyes
    a.userData.inner.add(holder);
    if (mat) a.userData.mat = mat as unknown as THREE.MeshStandardMaterial;
    a.userData.leanScale = 0; // the clips lean on their own
    const mixer = new THREE.AnimationMixer(root);
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
    rigs.set(a, {
      mixer,
      acts,
      w,
      phase: 0,
      idleT: Math.random() * 2,
      air: false,
      airT: 1,
      landT: 1,
      scaled,
      pelvis,
      legs,
      spread,
      strideK: legs * s,
    });
  };
  await precompile(kit.instance());
  setAvatarSkin({ dress, animate }, [me.avatar, ...[...remotes.values()].map((r) => r.avatar)]);
  startHeroCamera();
}
