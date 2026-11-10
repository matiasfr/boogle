// Footings off the racks: worn on every back that holds one (account `foot`), lying as a kind-3 ground pile, put down
// through the existing place-drop, and carried faster with a friend's Help (presence `railwayFootHelp`, Owner
// presentation like the beam's, never a second claim). Local view of accepted state; flights never move material.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { input } from '../../player/input-state.ts';
import { heldId } from '../../player/inventory.ts';
import { addPresenceField, onRemotePresence, remotes } from '../../netplay/net.ts';
import { thump } from '../../render/machine-sfx.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { PLAYER_R } from '../../constants.ts';
import { createBoxBatch, footingFrame, footingParts, FOOTING } from './works-box-view.ts';
import { createHelpCarry, type HelpCarry } from './help-carry.ts';

type Account = ReturnType<RailwayAdapter['inspect']>['accounts'][number];
type AvatarData = { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D }; load?: number; beamGrip?: unknown };

// Help carry, one field: the pid of the footing holder you are helping, or nothing.
let help: HelpCarry | null = null;
addPresenceField('railwayFootHelp', () => help?.presence() ?? null);
onRemotePresence((remote, presence) => help?.hear(remote.peer, presence.railwayFootHelp));

/** Back offset in the load frame (metres) and the worn scale: a block that dwarfs Buddy's back, as promised. */
const WORN = { y: 0.42, z: 0.62, scale: 0.85 };
/** Where a helper takes the footing: this far behind its holder, at the block on their back (metres). */
const GRIP_BEHIND = 1.1;
const PILE_HOP = 0.32;

export function createRailwayFootings(adapter: RailwayAdapter, owner: OwnedView) {
  const batch = createBoxBatch(owner, 24 * 7);
  let state = adapter.inspect();
  const lastFoot = new Map<string, number>();
  const squash = new Map<string, number>(); // pid -> seconds since the footing landed on that back
  const flights: { from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; pile: number }[] = [];
  const frame = new THREE.Matrix4(),
    pos = new THREE.Vector3(),
    quat = new THREE.Quaternion(),
    scale = new THREE.Vector3(),
    offset = new THREE.Vector3();
  const avatarOf = (pid: string) =>
    pid === state.pid ? me.avatar : ([...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar ?? null);
  const backOf = (pid: string, out: THREE.Vector3) => {
    const avatar = avatarOf(pid);
    if (!avatar) return false;
    out.copy(avatar.position);
    out.y += 1.3;
    return true;
  };
  const empty = (a: Account | undefined) => !!a && !a.carry && !(a.stone ?? 0) && !(a.rails ?? 0) && !(a.foot ?? 0);
  const mine = () => state.accounts.find((a) => a.pid === state.pid);
  const grip = new THREE.Vector3();
  const mineHelp = createHelpCarry({
    holds: (pid) => (state.accounts.find((a) => a.pid === pid)?.foot ?? 0) === 1,
    free: (pid) =>
      empty(state.accounts.find((a) => a.pid === pid)) &&
      state.beam?.holder !== pid &&
      (pid !== state.pid || !heldId()),
    avatarOf,
    gripOf: (holder) => {
      const avatar = avatarOf(holder);
      if (!avatar) return null;
      const yaw = avatar.rotation.y;
      return grip.set(
        avatar.position.x + Math.sin(yaw) * GRIP_BEHIND,
        avatar.position.y,
        avatar.position.z + Math.cos(yaw) * GRIP_BEHIND,
      );
    },
    self: () => state.pid,
    pidOf: (peer) => {
      const r = remotes.get(peer);
      return r?.entered && r.pid ? r.pid : null;
    },
    now: () => performance.now(),
  });
  help = mineHelp;
  /** Whoever is helping `holder` now: you, or a friend whose presence names them and who stands at the grip. */
  const helperOf = (holder: string) => mineHelp.helperOf(holder) as THREE.Object3D | null;
  const posing = new Set<THREE.Object3D>();
  function draw(dt: number) {
    batch.begin();
    for (const avatar of posing) (avatar.userData as AvatarData).beamGrip = null;
    posing.clear();
    for (const a of state.accounts) {
      const foot = a.foot ?? 0;
      const was = lastFoot.get(a.pid);
      if (was !== undefined && was === 0 && foot === 1) squash.set(a.pid, 0);
      lastFoot.set(a.pid, foot);
      if (!foot) continue;
      const avatar = avatarOf(a.pid);
      const data = avatar?.userData as AvatarData | undefined;
      const back = data?.loadFit?.frame ?? data?.inner;
      if (!avatar || !back) continue;
      back.updateWorldMatrix(true, false);
      back.matrixWorld.decompose(pos, quat, scale);
      offset.set(0, WORN.y, WORN.z);
      back.localToWorld(offset);
      // Squash on landing, then a small settle: the weight arriving on the back.
      let t = squash.get(a.pid);
      if (t !== undefined) {
        t += dt;
        squash.set(a.pid, t);
        if (t > 0.45) squash.delete(a.pid);
      }
      const u = t === undefined ? 1 : Math.min(1, t / 0.45);
      const bounce = 1 + Math.sin(u * Math.PI * 2.2) * (1 - u) * 0.18;
      frame.compose(
        offset,
        quat,
        scale.set(WORN.scale / bounce ** 0.5, WORN.scale * bounce, WORN.scale / bounce ** 0.5),
      );
      footingParts(batch, frame);
      const helper = helperOf(a.pid);
      if (helper) {
        (helper.userData as AvatarData).beamGrip = 'lift';
        posing.add(helper);
      }
    }
    // Footings lying on the ground: the block tipped on its side, as if set down from a shoulder.
    for (const pile of state.piles) {
      if (pile.kind !== 3) continue;
      if (flights.some((f) => f.pile === pile.id)) continue;
      const y = (pile.y ?? 0) / 100;
      footingFrame(frame, pile.x / 100, y, pile.z / 100, (pile.id * 0.7) % Math.PI, 0);
      footingParts(batch, frame);
    }
    for (let k = flights.length - 1; k >= 0; k--) {
      const f = flights[k]!;
      f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      pos.lerpVectors(f.from, f.to, u);
      pos.y += Math.sin(u * Math.PI) * 0.6;
      footingFrame(frame, pos.x, pos.y, pos.z, 0, (1 - u) * 0.6, 0.85 + 0.15 * u);
      footingParts(batch, frame);
      if (u >= 1) {
        flights.splice(k, 1);
        thump(f.to.x, f.to.z);
        dustRing(f.to.x, f.to.y + 0.05, f.to.z, 8, 1.2, 0.25);
      }
    }
    batch.commit();
  }
  owner.cleanup(() => {
    mineHelp.dispose();
    if (help === mineHelp) help = null;
    for (const avatar of posing) (avatar.userData as AvatarData).beamGrip = null;
    posing.clear();
  });
  return {
    restore() {
      state = adapter.inspect();
      flights.length = 0;
      squash.clear();
      lastFoot.clear();
      for (const a of state.accounts) lastFoot.set(a.pid, a.foot ?? 0);
    },
    update(dt: number) {
      state = adapter.inspect();
      mineHelp.helping();
      draw(dt);
    },
    /** After the haul bundle has written its count: a footing bends Buddy under it like a full back. */
    lateUpdate() {
      for (const a of state.accounts) {
        if (!(a.foot ?? 0)) continue;
        const data = avatarOf(a.pid)?.userData as AvatarData | undefined;
        if (data) data.load = Math.max(data.load ?? 0, 16);
      }
    },
    /** Full weight solo, the beam's helped pace together (owner, 8 November). */
    prePhysics() {
      state = adapter.inspect();
      if (state.foot) {
        input.sprint = me.sprint = false;
        me.wish.multiplyScalar((helperOf(state.pid) ? state.beamHelpSpeed : state.beamSoloSpeed) / 5.6);
      } else if (mineHelp.helping()) {
        input.sprint = me.sprint = false;
        mineHelp.ease(me.wish);
      }
    },
    accepted(e: RailwayAccepted) {
      state = adapter.inspect();
      if (e.op === 'rail.drop' && e.kind === 3) {
        const pile = state.piles.find((p) => p.id === e.pile);
        const from = new THREE.Vector3();
        if (!pile || !backOf(e.pid, from)) return;
        flights.push({
          from,
          to: new THREE.Vector3(pile.x / 100, (pile.y ?? 0) / 100, pile.z / 100),
          t: 0,
          dur: PILE_HOP,
          pile: pile.id,
        });
      }
      if (e.op === 'rail.take' && e.kind === 3 && e.px !== undefined && e.pz !== undefined) {
        const y = (e.py ?? 0) / 100;
        dustRing(e.px / 100, y + 0.05, e.pz / 100, 8, 1.1, 0.22);
        thump(e.px / 100, e.pz / 100);
      }
    },
    corrected(c: RailwayCorrection) {
      const e = c.event;
      if (e.op === 'rail.drop' && e.kind === 3) flights.length = 0;
    },
    targets(): Interactable[] {
      if (!state.ready || !me.body) return [];
      const p = me.body.interpolatedPosition,
        result: Interactable[] = [];
      const back = mine();
      for (const pile of state.piles) {
        if (pile.kind !== 3) continue;
        const y = (pile.y ?? 0) / 100;
        if (Math.hypot(p.x - pile.x / 100, p.z - pile.z / 100) > 2.8 || Math.abs(p.y - PLAYER_R - y) > 2) continue;
        const at = new THREE.Vector3(pile.x / 100, y + FOOTING.h + 0.6, pile.z / 100);
        const free = empty(back) && !heldId() && state.beam?.holder !== state.pid;
        result.push(
          free
            ? {
                id: `railway-foot-pile${pile.id}`,
                verb: 'Shoulder a footing',
                at,
                run: () => void adapter.take(pile.id),
              }
            : { id: `railway-foot-pile${pile.id}`, verb: 'Shoulder a footing', at, blocked: 'Empty your back first' },
        );
      }
      if (mineHelp.helping())
        result.push({
          id: 'railway-foot-help-release',
          verb: 'Let go',
          at: new THREE.Vector3(p.x, p.y + 1.6, p.z),
          run: () => mineHelp.stop(),
        });
      else
        for (const a of state.accounts) {
          const holder = a.pid,
            avatar = avatarOf(holder);
          if (!avatar || !mineHelp.canStart(holder)) continue;
          result.push({
            id: 'railway-foot-help',
            verb: 'Help carry',
            at: avatar.position.clone().add(new THREE.Vector3(0, 1.8, 0)),
            run: () => mineHelp.start(holder),
          });
          break;
        }
      return result;
    },
    inspect: () => ({
      worn: state.accounts.filter((a) => (a.foot ?? 0) > 0).map((a) => a.pid),
      piles: state.piles.filter((p) => p.kind === 3).length,
      helping: mineHelp.helping(),
      helped: state.foot ? !!helperOf(state.pid) : false,
    }),
  };
}
