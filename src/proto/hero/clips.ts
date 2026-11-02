// Prototype: the hero (?proto=hero). Every avatar plays hand-made animation, Quaternius's Universal Animation Library
// (CC0, assets/src/hero-clips.json), with code only choosing and blending clips. The body is the Buddy (assets/src/buddy.py),
// and &hat=cap or beanie wears one of its `wear_head_` parts; &body=mannequin is the library's own figure, for judging
// motion apart from our model. &buddy turns this on inside any other prototype. Walk, jog and sprint are played by distance at the rate that
// matches each clip's stride to the ground (measured from the library's root-motion file), so the feet don't slide; they
// share one phase so a blend between them stays in step. Everything comes from speed and airborne, so remote players need
// no new presence. Serves DESIGN.md 1 (moving around is a toy). Sync kind: Local (render only).
import * as THREE from 'three/webgpu';
import { COLORS, PLAYER_R } from '../../constants.ts';
import { clamp } from '../../math.ts';
import { precompile } from '../../render/precompile.ts';
import { loadAsset } from '../../render/assets.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { setAvatarSkin, type Avatar } from '../../player/avatars.ts';
import { startHeroCamera } from './camera.ts';
import { makeLife } from './life.ts';
import { retargetClip } from './retarget.ts';
import clipsUrl from '../../../assets/built/hero-clips.glb?url';
import buddyUrl from '../../../assets/built/buddy.glb?url';

// m per cycle, from the root-motion clips' travel: walk 1.3 m in 1.33 s, jog 5 m in 0.93 s, sprint 5.5 m in 0.67 s.
// The sprint clip's feet sweep slower than its 5.5 m suggests, so it plays on a shorter one: a 0.5 s cycle at full speed.
const STRIDE = { walk: 1.3, jog: 5, sprint: 4.8 };
const BLEND = { idleTo: 0.15, walkTo: 2, jogFrom: 3.2, jogTo: 6.5, sprintFrom: 8.5 }; // m/s
const FADE = { ground: 0.06, air: 0.05 }; // s
const JUMP_FROM = 0.3; // s into Jump_Start where the feet leave the ground (its wind-up would delay the jump)
const LAND = { for: 0.35, stop: 2.5 }; // s of Jump_Land, and the speed above which you run straight out of it
const LOCO = ['Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'] as const;
// The swim clips' waterline is the ground, and the water is 0.8 m above the soles (physics floats you there); `lift` brings its eyes clear of it.
const SWIM = { idle: 'Swim_Idle_Loop', fwd: 'Swim_Fwd_Loop', fwdFrom: 0.4, fwdTo: 1.6, rate: 0.45, lift: 0.98 }; // m/s; m
const SEAT = 'Driving_Loop';
const NAMES = ['Idle_Loop', ...LOCO, 'Jump_Start', 'Jump_Loop', 'Jump_Land', SWIM.idle, SWIM.fwd, SEAT];
const BODIES = {
  mannequin: { url: clipsUrl, height: 1.75, armOut: 0 },
  buddy: { url: buddyUrl, height: 0, armOut: (12 * Math.PI) / 180 }, // its body is wider than the mannequin's
};

type Rig = {
  mixer: THREE.AnimationMixer;
  acts: Record<string, THREE.AnimationAction>;
  w: Record<string, number>;
  phase: number;
  idleT: number;
  air: boolean;
  airT: number;
  landT: number;
  strideK: number; // the stride's scale: the figure's
  life: ReturnType<typeof makeLife>;
  lastY: number;
};
const rigs = new WeakMap<Avatar, Rig>();

function animate(a: Avatar, speed: number, airborne: boolean, dt: number, swimming: boolean) {
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
  const seated = performance.now() - (a.userData.seatedAt ?? -1e9) < 200;
  if (seated) want[SEAT] = 1;
  else if (swimming) {
    const fwd = clamp((v - SWIM.fwdFrom) / (SWIM.fwdTo - SWIM.fwdFrom), 0, 1);
    want[SWIM.idle] = 1 - fwd;
    want[SWIM.fwd] = fwd;
  } else if (airborne) {
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

  inner.position.y += SWIM.lift * (r.w[SWIM.idle]! + r.w[SWIM.fwd]!);

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
  for (const n of [SWIM.idle, SWIM.fwd, SEAT])
    r.acts[n]!.time = (r.idleT * (n === SWIM.fwd ? 1 + v * SWIM.rate : 1)) % r.acts[n]!.getClip().duration;
  r.mixer.update(0);
  const u = a.userData;
  r.life.update(dt, {
    vy: (a.position.y - r.lastY) / dt,
    airborne: airborne && !seated,
    load: seated ? 0 : (u.load ?? 0),
    hold: seated ? null : (u.holdKind ?? null),
    seated,
    down: u.flopAmt ?? 0,
  });
  r.lastY = a.position.y;
}

export async function startClipsHero() {
  const q = new URLSearchParams(location.search);
  const body = q.get('body') === 'mannequin' ? BODIES.mannequin : BODIES.buddy;
  const hat = 'wear_head_' + q.get('hat');
  const [clips, model] = await Promise.all([loadAsset(clipsUrl), loadAsset(body.url)]);
  const src = clips.instance();
  const tgt = model.instance();
  let ratio = 1;
  const baked = new Map<string, THREE.AnimationClip>();
  for (const n of NAMES) {
    const r = retargetClip(clips.clip(n), src.children[0]!, tgt.children[0]!, { armOut: body.armOut });
    baked.set(n, r.clip);
    ratio = r.ratio;
  }
  const dress = (a: Avatar, colorIdx: number) => {
    if (rigs.has(a)) return;
    const holder = model.instance();
    const root = holder.children[0]!;
    holder.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false; // skinned: the bind pose's bounds don't follow the clips
      if (m.name.startsWith('wear_')) m.visible = m.name.startsWith(hat);
      const shared = m.material as THREE.MeshStandardNodeMaterial;
      if (shared.name === 'M_Main') {
        const own = shared.clone();
        own.color.set(COLORS[colorIdx]!);
        m.material = own;
        a.userData.mat = own as unknown as THREE.MeshStandardMaterial;
      }
    });
    let s = 1,
      floor = 0;
    if (body.height) {
      holder.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(holder, true);
      s = body.height / Math.max(0.01, box.max.y - box.min.y);
      floor = box.min.y * s;
    }
    holder.scale.setScalar(s);
    holder.position.y = -PLAYER_R - floor;
    holder.rotation.y = Math.PI; // the model faces +z; avatars face -z
    for (const child of a.userData.inner.children) child.visible = false; // the capsule and its eyes
    a.userData.inner.add(holder);
    a.userData.leanScale = 0; // the clips lean on their own
    a.userData.flopY = -0.24; // flat on its back, a slimmer body than the capsule's
    holder.updateMatrix();
    const mixer = new THREE.AnimationMixer(root);
    const acts: Record<string, THREE.AnimationAction> = {};
    const w: Record<string, number> = {};
    for (const n of NAMES) {
      const act = mixer.clipAction(baked.get(n)!);
      act.play();
      act.timeScale = 0; // animate() sets each clip's time itself
      act.setEffectiveWeight(n === 'Idle_Loop' ? 1 : 0);
      acts[n] = act;
      w[n] = n === 'Idle_Loop' ? 1 : 0;
    }
    const life = makeLife(root, tgt.children[0]!);
    const sockets = life.sockets(holder.matrix);
    a.userData.loadFit = { frame: sockets.back, back: 0.215, floor: 0.14, len: 0.86, round: true };
    a.userData.handSocket = sockets.hand;
    rigs.set(a, {
      mixer,
      acts,
      w,
      phase: 0,
      idleT: Math.random() * 2,
      air: false,
      airT: 1,
      landT: 1,
      strideK: ratio * s,
      life,
      lastY: a.position.y,
    });
  };
  await precompile(model.instance());
  setAvatarSkin({ dress, animate }, [me.avatar, ...[...remotes.values()].map((r) => r.avatar)]);
  startHeroCamera();
}
