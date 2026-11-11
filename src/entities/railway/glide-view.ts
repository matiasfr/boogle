// The glider's Local view, ported from Place's moves-view.ts: the canopy overhead with the arms up to it, the folded roll on
// every back once the room has the glider, the open and close sounds, and the camera easing out to 5.2 m while it holds
// you. A partner's open canopy comes from presence `railwayGlide` (Owner); the roll is derived from the shared fact, so
// no presence key carries it. Authored shapes only; never Place's campaign, moves or tech owners.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { reducedMotion } from '../../constants.ts';
import { cam, camConstraints, me } from '../../player/player.ts';
import { backSeam } from '../../player/haul-back.ts';
import { frameOf } from '../../render/haul-bundle.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { warmDraw } from '../../render/precompile.ts';
import { camera } from '../../render/scene.ts';
import { onRemotePresence, onPeerRemoved, remotes, type Remote } from '../../netplay/net.ts';

type RemoteView = { presence: (r: Remote, value: unknown) => void; removed: (peer: string) => void };
let activeRemote: RemoteView | null = null;
// Network hooks have module lifetime; rebuilds forward only to the mounted railway view.
onRemotePresence((r, pr) => activeRemote?.presence(r, pr.railwayGlide));
onPeerRemoved((r) => activeRemote?.removed(r.peer));
let warmed = false;

/** BotW's normal framing (5.2 m, 50 degrees): Place's `frame` pick, docs/game-design/place.md. */
const GLIDE_CAM = { dist: 5.2, fov: 50 };

export async function createRailwayGlideView(owner: OwnedView) {
  const gear = await import('../../render/gear-models.ts');
  // One template: every back's roll is a clone sharing its geometry and material.
  const roll = gear.makeGear().pack;
  if (!warmed) {
    warmed = true;
    // Detached until the room has it. The loading frame warms the wing's double-sided shadow pipeline and the roll, so
    // the first opening never hitches (Place did the same).
    warmDraw(() => {
      const g = gear.makeCanopy().g;
      g.add(roll.clone());
      g.traverse((o) => {
        o.visible = true;
        o.frustumCulled = false;
      });
      // The railway's root is in the scene by the loading frame (index.ts spawns it before its warm-up resolves).
      owner.root.add(g);
      return () => g.removeFromParent();
    });
  }
  type Worn = { canopy: ReturnType<typeof gear.makeCanopy>; roll: THREE.Object3D };
  const worn = new Map<THREE.Object3D, Worn>();
  const wornOf = (avatar: THREE.Object3D) => {
    let w = worn.get(avatar);
    if (!w) worn.set(avatar, (w = { canopy: gear.makeCanopy(), roll: roll.clone() }));
    return w;
  };
  /** Pose one avatar: its canopy towards `open`, and the folded roll on its back while it has the glider and it's shut. */
  function dress(avatar: THREE.Object3D, has: boolean, open: boolean, dt: number, now: number) {
    const w = wornOf(avatar);
    gear.placeCanopy(avatar, w.canopy, open ? 1 : 0, dt, now);
    const back = frameOf(avatar);
    w.roll.visible = has && !open && w.canopy.w < 0.5;
    if (!has) return void w.roll.removeFromParent();
    if (w.roll.parent !== back) back.add(w.roll);
    // The pack frame's roll is tied below the cradle: even a full stack leaves it visible and off the body.
    const frame = backSeam.pack?.() ?? false;
    w.roll.position.set(0, frame ? 0.045 : 0.57, frame ? 0.49 : 0.3);
  }
  const theirs = new Map<string, { remote: Remote; open: boolean }>();
  const remoteView: RemoteView = {
    presence(remote, value) {
      const open = value === true;
      const t = theirs.get(remote.peer);
      if (t) t.open = open;
      else if (open) theirs.set(remote.peer, { remote, open });
    },
    removed(peer) {
      theirs.delete(peer);
    },
  };
  activeRemote = remoteView;

  // ---------------------------------------------------------------- the camera while it holds you
  let holding = false,
    camW = 0,
    baseDist = 0,
    lens = 0, // degrees of the lens that are this camera's
    lastCam = 0;
  const constraint: (typeof camConstraints)[number] = () => {
    const now = performance.now(),
      dt = Math.min(0.1, (now - lastCam) / 1000);
    lastCam = now;
    const want = holding && !reducedMotion ? 1 : 0;
    if (!camW && !want) return false;
    if (!camW) baseDist = cam.dist;
    camW += (want - camW) * (1 - Math.exp(-dt / 0.35));
    if (camW < 0.002 && !want) {
      camW = 0;
      cam.dist = baseDist;
      releaseLens();
      return false;
    }
    cam.dist = baseDist + (GLIDE_CAM.dist - baseDist) * camW;
    const under = camera.fov - lens,
      next = (GLIDE_CAM.fov - under) * camW;
    if (Math.abs(next - lens) > 0.02) {
      camera.fov += next - lens;
      lens = next;
      camera.updateProjectionMatrix();
    }
    return false;
  };
  function releaseLens() {
    if (!lens) return;
    camera.fov -= lens;
    lens = 0;
    camera.updateProjectionMatrix();
  }
  camConstraints.push(constraint);

  let wasOpen = false;
  owner.cleanup(() => {
    if (activeRemote === remoteView) activeRemote = null;
    const i = camConstraints.indexOf(constraint);
    if (i >= 0) camConstraints.splice(i, 1);
    if (camW) cam.dist = baseDist;
    releaseLens();
    for (const w of worn.values()) {
      w.canopy.g.removeFromParent();
      w.roll.removeFromParent();
    }
    worn.clear();
    theirs.clear();
  });
  return {
    /** has: the room has the glider; open/hold: this player's canopy. */
    update(dt: number, now: number, has: boolean, open: boolean, hold: boolean) {
      holding = hold;
      const p = me.body?.interpolatedPosition;
      if (open !== wasOpen) {
        wasOpen = open;
        if (p) placeSound(open ? 'gliderOpen' : 'gliderClose', p.x, p.z);
      }
      if (me.avatar && me.entered) dress(me.avatar, has, open, dt, now);
      for (const r of remotes.values()) {
        if (!r.avatar) continue;
        if (!r.visible || !r.entered) {
          const w = worn.get(r.avatar);
          if (w) w.roll.visible = w.canopy.g.visible = false;
          continue;
        }
        dress(r.avatar, has, has && (theirs.get(r.peer)?.open ?? false), dt, now);
      }
      // Sweep avatars that left (a departed peer, a rebuilt avatar).
      for (const [avatar, w] of worn)
        if (!avatar.parent) {
          w.canopy.g.removeFromParent();
          w.roll.removeFromParent();
          worn.delete(avatar);
        }
    },
    inspect: () => ({
      rolls: [...worn.values()].filter((w) => w.roll.visible && w.roll.parent).length,
      canopies: [...worn.values()].filter((w) => w.canopy.g.visible).length,
      camDist: camW ? cam.dist : null,
    }),
  };
}
