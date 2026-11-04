// Production Buddy bootstrap. The isolated stage uses the same rig without installing an avatar skin or game loop.
import * as THREE from 'three/webgpu';
import { PLAYER_R } from '../../constants.ts';
import { precompile } from '../../render/precompile.ts';
import { loadAsset } from '../../render/assets.ts';
import { me } from '../player.ts';
import { paintAvatar, setAvatarSkin } from '../avatars.ts';
import { retargetClip } from './retarget.ts';
import { ARM_OUT, BUDDY_CLIPS, createBuddySkin } from './rig.ts';
import { bootMark } from '../../boot/timeline.ts';
import clipsUrl from '../../../assets/built/hero-clips.glb?url';
import buddyUrl from '../../../assets/built/buddy.glb?url';

export let bakeMs = 0;
export async function startBuddy() {
  bootMark('buddy-start');
  const hat = 'wear_head_' + new URLSearchParams(location.search).get('hat');
  const [clips, model] = await Promise.all([loadAsset(clipsUrl), loadAsset(buddyUrl)]);
  bootMark('buddy-assets');
  const src = clips.instance(),
    tgt = model.instance();
  let ratio = 1,
    bake = 0;
  const baked = new Map<string, THREE.AnimationClip>();
  for (const n of BUDDY_CLIPS) {
    const t0 = performance.now();
    const r = retargetClip(clips.clip(n), src, tgt, { armOut: ARM_OUT });
    bake += performance.now() - t0;
    baked.set(n, r.clip);
    ratio = r.ratio;
    await new Promise((go) => setTimeout(go));
  }
  bakeMs = Math.round(bake);
  bootMark('buddy-clips', { bakeMs });
  const skin = createBuddySkin(model, tgt, baked, ratio, {
    radius: PLAYER_R,
    hat,
    now: () => performance.now(),
    random: Math.random,
    charging: (a) => a === me.avatar && me.charging,
    paint: paintAvatar,
  });
  await precompile(model.instance());
  bootMark(setAvatarSkin(skin) ? 'buddy-ready' : 'buddy-late');
}
