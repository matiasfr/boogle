// Preview adapter around the game's body/retarget/life functions. The clock and blink seed belong to this preview.
import * as THREE from 'three/webgpu';
import type { Asset } from '../src/render/asset-loader.ts';
import type { Avatar } from '../src/player/avatars.ts';
import { ARM_OUT, createBuddySkin, disposeBuddy } from '../src/player/buddy/rig.ts';
import { makeLife } from '../src/player/buddy/life.ts';
import { retargetClip } from '../src/player/buddy/retarget.ts';
import {
  makeGear,
  wearGear,
  packFrameMesh,
  makeCanopy,
  placeCanopy,
  type GearState,
} from '../src/proto/place/gear-models.ts';
import { BUDDY_LOAD_FIT } from '../src/player/buddy/load-fit.ts';
import { makeCarryModels, cargoCapacity, type CargoKind } from '../src/proto/place/carry-models.ts';
import { makeBundlePreview } from '../src/render/haul-bundle.ts';
import { makeAxes, type AxeTier } from '../src/proto/place/axe-models.ts';
import { applyChopPose, CHOP_DURATION, CHOP_TRUNK } from '../src/proto/place/chop-motion.ts';
type WornPreview = GearState & {
  cargo: CargoKind;
  amount: number;
  legacyCarrying?: boolean;
  bodyColor?: string;
  axe?: AxeTier | 'none';
  chop?: 'off' | 'bite' | 'rebound' | 'full';
  reducedMotion?: boolean;
  trunkDistance?: number;
};
export const SAMPLE_FPS = 30;
export type BuddyMode = 'raw' | 'played';
export function prepareBuddy(model: Asset, source: Asset, headwear?: Asset) {
  // Stage-only trial: decorate a fresh rest-pose instance, leaving Buddy's source and production loader untouched.
  const original = model;
  if (headwear)
    model = {
      ...original,
      instance(node?: string) {
        const figure = original.instance(node);
        const head = figure.getObjectByName('Head');
        if (!head) throw new Error('Buddy trial needs the existing Head bone');
        const cap = headwear.instance();
        cap.name = 'wear_head_conductor';
        cap.position.y = 1.12;
        figure.updateMatrixWorld(true);
        head.attach(cap);
        return figure;
      },
    };
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
    create(mode: BuddyMode, clipName: string, pose: string, hat: string, blink?: number, worn?: WornPreview) {
      const group = new THREE.Group();
      let figure: THREE.Group, avatar: Avatar | undefined;
      let mixer: THREE.AnimationMixer | undefined, action: THREE.AnimationAction | undefined;
      let time = 0,
        seed = 12345;
      let skin: ReturnType<typeof createBuddySkin> | undefined;
      let sockets: { back: THREE.Object3D; hand: THREE.Object3D };
      const owned = new Set<THREE.Material>();
      const geometries = new Set<THREE.BufferGeometry>();
      const instances = new Set<THREE.InstancedMesh>();
      let gear: ReturnType<typeof makeGear> | undefined;
      let canopy: ReturnType<typeof makeCanopy> | undefined;
      let axes: ReturnType<typeof makeAxes> | undefined;
      let trunk: THREE.Mesh | undefined;
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
        for (const geometry of geometries) geometry.dispose();
        geometries.clear();
        for (const mesh of instances) mesh.dispose();
        instances.clear();
        gear = undefined;
        canopy = undefined;
        axes = undefined;
        trunk = undefined;
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
          if (worn?.bodyColor)
            for (const material of owned)
              if (material.name === 'M_Main' && 'color' in material && material.color instanceof THREE.Color)
                material.color.set(worn.bodyColor);
          group.add(figure);
          mixer = new THREE.AnimationMixer(figure);
          const clip = clips.get(clipName);
          if (clip) {
            action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
          }
          // Same inverse holder placement used by the production skin: the socket's +Z is behind Buddy.
          const holder = new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, -0.45, 0);
          sockets = makeLife(figure, rest, clock).sockets(holder);
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
            paint: (material) => {
              if (worn?.bodyColor) material.color.set(worn.bodyColor);
            },
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
        if (worn) {
          gear = makeGear();
          wearGear(figure, sockets.back, gear, worn);
          const frame = packFrameMesh(true);
          frame.visible = worn.frame;
          const cargo = makeCarryModels();
          const amount = Math.min(worn.amount, cargoCapacity(worn.cargo, worn.frame));
          cargo.setCargo(worn.cargo, amount, worn.frame);
          const logs = makeBundlePreview(avatar?.userData.loadFit ?? BUDDY_LOAD_FIT);
          logs.setCount(worn.cargo === 'logs' ? amount : 0);
          logs.root.name = 'wear_cargo_logs';
          cargo.root.name = 'wear_cargo';
          sockets.back.add(frame, cargo.root, logs.root);
          canopy = makeCanopy(true);
          canopy.w = worn.canopy ? 1 : 0;
          canopy.g.name = 'wear_canopy';
          // Raw model faces +Z; the production avatar frame faces -Z around its model holder.
          canopy.g.rotation.y = mode === 'raw' ? Math.PI : 0;
          placeCanopy(avatar ?? figure, canopy, worn.canopy ? 1 : 0, 0, time * 1000);
          for (const object of [...Object.values(gear), frame, cargo.root, logs.root, canopy.g]) {
            // Pure factories return owned resources, including clones of shared presets.
            object.traverse((o) => {
              if (!(o instanceof THREE.Mesh)) return;
              geometries.add(o.geometry);
              if (o instanceof THREE.InstancedMesh) instances.add(o);
              for (const material of Array.isArray(o.material) ? o.material : [o.material]) owned.add(material);
            });
          }
          if (worn.axe && worn.axe !== 'none') {
            axes = makeAxes();
            axes.setTier(worn.axe);
            sockets.back.add(axes.root);
            axes.root.traverse((o) => {
              if (!(o instanceof THREE.Mesh)) return;
              geometries.add(o.geometry);
              for (const material of Array.isArray(o.material) ? o.material : [o.material]) owned.add(material);
            });
            if (worn.chop && worn.chop !== 'off') {
              trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(CHOP_TRUNK.radius, CHOP_TRUNK.radius, CHOP_TRUNK.height, 12),
                new THREE.MeshStandardNodeMaterial({ color: '#795536', roughness: 0.95 }),
              );
              trunk.name = 'stage-contact-trunk';
              trunk.position.set(0, CHOP_TRUNK.height / 2, worn.trunkDistance ?? CHOP_TRUNK.distance);
              trunk.castShadow = trunk.receiveShadow = true;
              group.add(trunk);
              geometries.add(trunk.geometry);
              for (const material of Array.isArray(trunk.material) ? trunk.material : [trunk.material])
                owned.add(material);
            }
            applyAxe();
          }
        }
        group.updateMatrixWorld(true);
      }
      function applyAxe() {
        if (!axes) return;
        const response = worn?.chop;
        const chopping = response && response !== 'off';
        applyChopPose(
          figure,
          axes.root,
          chopping ? (time <= CHOP_DURATION ? time : time % CHOP_DURATION) : 0,
          response && response !== 'off' ? response : 'bite',
          { reducedMotion: worn?.reducedMotion ?? false },
        );
        axes.root.visible = true;
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
          avatar.userData.load =
            pose === 'carrying'
              ? worn && !worn.legacyCarrying
                ? Math.min(worn.amount, cargoCapacity(worn.cargo, worn.frame))
                : 16
              : 0;
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
        if (gear && worn) wearGear(figure, sockets.back, gear, worn);
        if (canopy && worn) placeCanopy(avatar ?? figure, canopy, worn.canopy ? 1 : 0, 0, time * 1000);
        applyAxe();
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
        get chop() {
          return axes && trunk ? { axe: axes.root, trunk } : undefined;
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
