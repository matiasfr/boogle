// Footings off the racks: worn on every back that holds one (account `foot`), lying as a kind-3 ground pile, put down
// through the existing place-drop, and carried faster with a friend's Help (presence `railwayFootHelp`, Owner
// presentation like the beam's, never a second claim). Local view of accepted state; flights never move material.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted, RailwayCorrection } from '../../adapters/railway-effects.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { input } from '../../player/input-state.ts';
import { heldId } from '../../player/inventory.ts';
import { addPresenceField, onRemotePresence, remotes } from '../../netplay/net.ts';
import { thump } from '../../render/machine-sfx.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { PLAYER_R } from '../../constants.ts';
/** A sprint with a footing on your back, over its carry pace. */
const FOOT_SPRINT = 1.3;
import { createBoxBatch, footingFrame, footingParts, FOOTING } from './works-box-view.ts';
import { onlyALoadIn, setDownThen } from './back-down.ts';
import { Pile } from '../../sim/railway-components.ts';
import { account, accounts, beam, type ReadWorld } from '../../sim/railway-rows.ts';
import { createHelpCarry, type HelpCarry } from './help-carry.ts';

type Account = NonNullable<ReturnType<typeof account>>;
/** The footings lying on the ground (kind 3), by pile id: the world's entity ids, in ascending order. */
const footPiles = (w: ReadWorld) => {
  const out: { id: number; x: number; y: number; z: number }[] = [];
  w.each([Pile], (id, p) => void (p.kind === 3 && out.push({ id, x: p.x, y: p.y, z: p.z })));
  return out;
};
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
  // The rows, re-read at the head of each entry: a refill swaps the world. `pid` is the adapter's, fixed for the session.
  let wd: ReadWorld = adapter.read.world();
  const pid = adapter.read.pid;
  const lastFoot = new Map<string, number>();
  const squash = new Map<string, number>(); // pid -> seconds since the footing landed on that back
  const flights: { from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; pile: number }[] = [];
  const frame = new THREE.Matrix4(),
    pos = new THREE.Vector3(),
    quat = new THREE.Quaternion(),
    scale = new THREE.Vector3(),
    offset = new THREE.Vector3();
  const avatarOf = (id: string) =>
    id === pid ? me.avatar : ([...remotes.values()].find((r) => r.pid === id && r.entered)?.avatar ?? null);
  const backOf = (pid: string, out: THREE.Vector3) => {
    const avatar = avatarOf(pid);
    if (!avatar) return false;
    out.copy(avatar.position);
    out.y += 1.3;
    return true;
  };
  const empty = (a: Account | undefined) => !!a && !a.carry && !(a.stone ?? 0) && !(a.rails ?? 0) && !(a.foot ?? 0);
  const mine = () => account(wd, pid);
  const grip = new THREE.Vector3();
  const mineHelp = createHelpCarry({
    holds: (who) => (account(wd, who)?.foot ?? 0) === 1,
    free: (who) => empty(account(wd, who)) && beam(wd).holder !== who && (who !== pid || !heldId()),
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
    self: () => pid,
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
    for (const a of accounts(wd)) {
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
    for (const pile of footPiles(wd)) {
      if (flights.some((f) => f.pile === pile.id)) continue;
      const y = pile.y / 100;
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
      wd = adapter.read.world();
      flights.length = 0;
      squash.clear();
      lastFoot.clear();
      for (const a of accounts(wd)) lastFoot.set(a.pid, a.foot ?? 0);
    },
    update(dt: number) {
      wd = adapter.read.world();
      mineHelp.helping();
      draw(dt);
    },
    /** After the haul bundle has written its count: a footing bends Buddy under it like a full back. */
    lateUpdate() {
      for (const a of accounts(wd)) {
        if (!(a.foot ?? 0)) continue;
        const data = avatarOf(a.pid)?.userData as AvatarData | undefined;
        if (data) data.load = Math.max(data.load ?? 0, 16);
      }
    },
    /** A footing's own pace (docs/plans/works-late-game.md, step 2b): 3 m/s alone and a sprint 1.3 times that, 5.4 m/s
     * helped with no sprint. The plain jump stays; the second jump, the glide and the hook are off while you carry one
     * (tools.ts, glide.ts, hook-shot.ts), so a work item opens no new travel edge. */
    prePhysics() {
      wd = adapter.read.world();
      if (mine()?.foot) {
        const movement = adapter.read.movement();
        const helped = !!helperOf(pid),
          run = me.sprint && !helped;
        if (helped) input.sprint = false;
        me.sprint = false;
        me.wish.multiplyScalar(
          ((helped ? movement.footHelpSpeed : movement.footSoloSpeed) * (run ? FOOT_SPRINT : 1)) / 5.6,
        );
      } else if (mineHelp.helping()) {
        input.sprint = me.sprint = false;
        mineHelp.ease(me.wish);
      }
    },
    accepted(e: RailwayAccepted) {
      wd = adapter.read.world();
      if (e.op === 'rail.drop' && e.kind === 3) {
        const pile = footPiles(wd).find((p) => p.id === e.pile);
        const from = new THREE.Vector3();
        if (!pile || !backOf(e.pid, from)) return;
        flights.push({
          from,
          to: new THREE.Vector3(pile.x / 100, pile.y / 100, pile.z / 100),
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
      if (!adapter.read.ready() || !me.body) return [];
      wd = adapter.read.world();
      const p = me.body.interpolatedPosition,
        result: Interactable[] = [];
      const back = mine();
      for (const pile of footPiles(wd)) {
        const y = pile.y / 100;
        if (Math.hypot(p.x - pile.x / 100, p.z - pile.z / 100) > 2.8 || Math.abs(p.y - PLAYER_R - y) > 2) continue;
        const at = new THREE.Vector3(pile.x / 100, y + FOOTING.h + 0.6, pile.z / 100);
        const free = empty(back) && !heldId() && beam(wd).holder !== pid;
        result.push(
          free
            ? {
                id: `railway-foot-pile${pile.id}`,
                verb: 'Shoulder a footing',
                at,
                run: () => void adapter.take(pile.id),
              }
            : onlyALoadIn(wd, pid)
              ? {
                  id: `railway-foot-pile${pile.id}`,
                  verb: 'Shoulder a footing',
                  at,
                  run: () =>
                    void setDownThen(adapter, () => adapter.take(pile.id), { x: pile.x / 100, z: pile.z / 100 }),
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
        for (const a of accounts(wd)) {
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
      worn: accounts(wd)
        .filter((a) => (a.foot ?? 0) > 0)
        .map((a) => a.pid),
      piles: footPiles(wd).length,
      helping: mineHelp.helping(),
      helped: mine()?.foot ? !!helperOf(pid) : false,
    }),
  };
}
