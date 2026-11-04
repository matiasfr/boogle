// Preview adapter around the game's body/retarget/life functions. The clock and blink seed belong to this preview.
import * as THREE from 'three/webgpu';
import type { Asset } from '../src/render/asset-loader.ts';
import type { Avatar } from '../src/player/avatars.ts';
import { ARM_OUT, createBuddySkin, disposeBuddy } from '../src/player/buddy/rig.ts';
import { makeLife } from '../src/player/buddy/life.ts';
import { retargetClip } from '../src/player/buddy/retarget.ts';
export const SAMPLE_FPS = 30;
export type BuddyMode = 'raw' | 'played';
export function prepareBuddy(model: Asset, source: Asset) {
  const rest = model.instance(),
    src = source.instance();
  let ratio = 1;
  const clips = new Map(
    source.gltf.animations.map((clip) => {
      const baked = retargetClip(clip, src, rest, { armOut: ARM_OUT });
      ratio = baked.ratio;
      return [clip.name, baked.clip];
    }),
  );
  return {
    clips,
    create(mode: BuddyMode, clipName: string, pose: string, hat: string, blink?: number) {
      const group = new THREE.Group();
      let figure: THREE.Group, avatar: Avatar | undefined;
      let mixer: THREE.AnimationMixer | undefined, action: THREE.AnimationAction | undefined;
      let time = 0,
        seed = 12345;
      let skin: ReturnType<typeof createBuddySkin> | undefined;
      let sockets: { back: THREE.Object3D; hand: THREE.Object3D };
      const owned = new Set<THREE.Material>();
      const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      const clock = { now: () => time * 1000, random };
      const ownMaterials = (root: THREE.Object3D) =>
        root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.frustumCulled = false;
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((m) => {
                const c = m.clone();
                owned.add(c);
                return c;
              })
            : (() => {
                const c = mesh.material.clone();
                owned.add(c);
                return c;
              })();
        });
      function clear() {
        if (avatar) disposeBuddy(avatar);
        mixer?.stopAllAction();
        for (const material of owned) material.dispose();
        owned.clear();
        group.clear();
      }
      function reset() {
        clear();
        time = 0;
        seed = 12345;
        if (mode === 'raw') {
          figure = model.instance();
          figure.traverse((o) => {
            if (o.name.startsWith('wear_')) o.visible = !!hat && o.name.startsWith('wear_head_' + hat);
          });
          ownMaterials(figure);
          group.add(figure);
          mixer = new THREE.AnimationMixer(figure);
          const clip = clips.get(clipName);
          if (clip) {
            action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
          }
          sockets = makeLife(figure, rest, clock).sockets(new THREE.Matrix4());
          mixer.update(0);
        } else {
          avatar = new THREE.Group() as Avatar;
          const inner = new THREE.Group();
          const mat = new THREE.MeshStandardMaterial();
          owned.add(mat);
          avatar.userData = { inner, mat, phase: 0, colorIdx: 0 };
          avatar.position.y = 0.45;
          avatar.rotation.y = Math.PI;
          avatar.add(inner);
          group.add(avatar);
          skin = createBuddySkin(model, rest, clips, ratio, {
            ...clock,
            radius: 0.45,
            hat: 'wear_head_' + (hat || 'none'),
            charging: () => pose === 'windup',
            paint: (material) => material.color.set('#1fbfc4'),
          });
          skin.dress(avatar, 0);
          // The skin owns a per-avatar main material; retain it for disposal before cloning inspection materials.
          owned.add(avatar.userData.mat);
          figure = inner;
          ownMaterials(figure);
          sockets = { back: avatar.userData.loadFit!.frame, hand: avatar.userData.handSocket! };
          if (clipName === 'Jump_Land') skin.animate(avatar, 0, true, 1e-6, false);
          update(1e-6);
          time = 0;
        }
        group.updateMatrixWorld(true);
      }
      function update(dt: number) {
        time += dt;
        if (mode === 'raw') {
          if (action) {
            action.enabled = true;
            action.paused = false;
            action.time = Math.min(time, action.getClip().duration);
            mixer!.update(0);
          }
        } else if (avatar && skin) {
          const speed =
            clipName === 'Walk_Loop'
              ? 2
              : clipName === 'Jog_Fwd_Loop'
                ? 4.8
                : clipName === 'Sprint_Loop'
                  ? 10
                  : clipName === 'Swim_Fwd_Loop'
                    ? 2
                    : 0;
          const airborne = clipName === 'Jump_Start' || clipName === 'Jump_Loop';
          avatar.userData.load = pose === 'carrying' ? 16 : 0;
          avatar.userData.holdKind =
            pose === 'item' ? 'item' : pose === 'can' ? 'hang' : pose === 'ball' ? 'ball' : null;
          avatar.userData.flopAmt = pose === 'knocked' ? 1 : 0;
          avatar.userData.seatedAt = pose === 'seated' || clipName === 'Driving_Loop' ? clock.now() : -1e9;
          avatar.position.y = 0.45 + (airborne ? (clipName === 'Jump_Start' ? 4 : -3) * time : 0);
          skin.animate(avatar, speed, airborne, dt, clipName.startsWith('Swim_'));
          // Preview stays on the ground; velocity above still feeds the real rising/falling life pose.
          avatar.position.y = 0.45;
        }
        if (blink !== undefined) for (const name of ['eye_l', 'eye_r']) figure.getObjectByName(name)?.scale.setY(blink);
        group.updateMatrixWorld(true);
      }
      reset();
      return {
        group,
        get figure() {
          return figure;
        },
        get sockets() {
          return sockets;
        },
        get time() {
          return time;
        },
        seek(t: number) {
          reset();
          const count = Math.floor(t * SAMPLE_FPS);
          for (let i = 0; i < count; i++) update(1 / SAMPLE_FPS);
          if (t - count / SAMPLE_FPS > 1e-9) update(t - count / SAMPLE_FPS);
          time = t;
        },
        advance: update,
        dispose: clear,
      };
    },
  };
}
