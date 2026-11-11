// Accepted rocks, mixed back and unique beam. Helper grip is Owner presentation, never a second item claim.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { input } from '../../player/input-state.ts';
import { heldId } from '../../player/inventory.ts';
import { addPresenceField, onRemotePresence, remotes } from '../../netplay/net.ts';
import { RAIL_ROCKS } from '../../sim/railway-works-layout.ts';
import { account, accounts, beam as beamRow, rail, rock as rockRow } from '../../sim/railway-rows.ts';
import { railPhase } from '../../sim/railway-queries-line1.ts';
import { GOLD_ROPE } from '../../render/gold-rope.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { reducedMotion } from '../../constants.ts';
import { createBeamDrag, restGrip, BEAM_LENGTH, type BeamDrag } from './beam-drag.ts';
import { onlyALoadIn, setDownThen } from './back-down.ts';
import { createHelpCarry, type HelpCarry } from './help-carry.ts';

// One Owner value per tab: the holder's pid while you help haul the beam (null otherwise, so the key is left out).
let help: HelpCarry | null = null;
addPresenceField('railwayBeamHelp', () => help?.presence() ?? null);
onRemotePresence((remote, presence) => help?.hear(remote.peer, presence.railwayBeamHelp));
const frameOf = (avatar: THREE.Object3D | null) => {
  const data = avatar?.userData as { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D } } | undefined;
  return data?.loadFit?.frame ?? data?.inner ?? null;
};

export async function createLineCargo(adapter: RailwayAdapter, owner: OwnedView, mine: (id: number) => void) {
  const [{ H, addStatic }, { ROCKS }, { flat }, { makeCarryModels, BEAM_CARRY_POSITION }, { sparkleAxe }] =
    await Promise.all([
      import('../../place/land.ts'),
      import('../../place/layout.ts'),
      import('../../render/flat.ts'),
      import('../../render/carry-models.ts'),
      import('../../render/axe-sparkle.ts'),
    ]);
  // `&beamcarry=float` shows the floating carry (K1) beside the rope drag, for one comparison (7 November).
  const floatCarry = new URLSearchParams(location.search).get('beamcarry') === 'float';
  const world = () => adapter.read.world();
  const phase = (at = adapter.read.tick()) => railPhase(world(), at, at);
  const beamNow = () => beamRow(world());
  // Line 1's three rocks and the Works bowl's two limestone ones (slots 3 and 4, J4: they replace J2's boulders).
  const rocks = RAIL_ROCKS.map((source, i) => {
    const radius = ROCKS[i]?.r ?? 1.3,
      x = source.x / 100,
      z = source.z / 100,
      y = H(x, z);
    const root = new THREE.Group();
    root.position.set(x, y, z);
    const lumps = Array.from({ length: 5 }, (_, k) => {
      const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), flat('#b0ab9d'));
      const angle = (k / 5) * Math.PI * 2 + i;
      lump.position.set(
        k ? Math.cos(angle) * radius * 0.55 : 0,
        radius * (k ? 0.35 : 0.95),
        k ? Math.sin(angle) * radius * 0.55 : 0,
      );
      lump.scale.setScalar(radius * (k ? 0.55 : 0.62));
      lump.rotation.set(k, k * 1.7, k * 0.5);
      lump.castShadow = true;
      root.add(lump);
      return lump;
    });
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 5, 14).rotateX(Math.PI / 2), flat('#f0752c'));
    band.position.y = radius * 0.5;
    root.add(band);
    owner.add(root);
    return {
      id: source.id,
      x,
      y,
      z,
      radius,
      root,
      lumps,
      band,
      at: new THREE.Vector3(x, y + 1, z),
      remaining: -1,
      body: null as ReturnType<typeof addStatic> | null,
    };
  });
  const worn = new Map<string, ReturnType<typeof makeCarryModels>>();
  // The dragged trunk lives in world space: its far end is on the ground, not on anyone's back.
  const dragWorld = new THREE.Group();
  owner.add(dragWorld);
  const ropeMaterial = flat(GOLD_ROPE, 0.7);
  const drags = new Map<string, BeamDrag>();
  const posing = new Set<NonNullable<typeof me.avatar>>();
  const side = Math.sign(BEAM_CARRY_POSITION[0]) || 1;
  const anchorLocal = new THREE.Vector3(BEAM_CARRY_POSITION[0] * 0.7, 0.55, 0.1),
    anchor = new THREE.Vector3(),
    hip = new THREE.Vector3(),
    from = new THREE.Vector3(),
    shoulderA = new THREE.Vector3(),
    shoulderB = new THREE.Vector3(),
    trail = new THREE.Vector3();
  let last = performance.now(),
    grabbing = -Infinity;
  const ground = makeCarryModels();
  ground.setCargo('beam', 1, false);
  ground.beam.position.set(0, 0, 0);
  ground.beam.rotation.y = Math.PI / 2;
  owner.add(ground.root);
  owner.cleanup(() =>
    ground.root.traverse((o) => {
      if (o instanceof THREE.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    }),
  );
  ground.root.visible = false;
  const beamAt = new THREE.Vector3(),
    lay = new THREE.Vector3(Infinity, 0, Infinity); // where the loose trunk last lay
  const accountEmpty = (pid: string) => {
    const a = account(world(), pid);
    return !!a && a.carry === 0 && a.stone === 0;
  };
  const avatarOf = (pid: string) =>
    pid === adapter.read.pid
      ? me.avatar
      : ([...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar ?? null);
  const gripAt = new THREE.Vector3();
  const mineHelp = createHelpCarry({
    holds: (pid) => beamNow().state === 'held' && beamNow().holder === pid,
    free: (pid) => accountEmpty(pid) && (pid !== adapter.read.pid || !heldId()),
    avatarOf,
    gripOf: (holder) => {
      const avatar = avatarOf(holder);
      return avatar ? restGrip(avatar, BEAM_LENGTH, side, gripAt) : null;
    },
    self: () => adapter.read.pid,
    pidOf: (peer) => {
      const r = remotes.get(peer);
      return r?.entered && r.pid ? r.pid : null;
    },
    now: () => performance.now(),
  });
  help = mineHelp;
  const helperFor = (holder: string) => mineHelp.helperOf(holder) as typeof me.avatar | null;
  function update() {
    for (const avatar of posing) avatar.userData.beamGrip = null;
    posing.clear();
    const now = performance.now(),
      dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    mineHelp.helping();
    for (const rock of rocks) {
      const remaining = rockRow(world(), rock.id).left;
      if (remaining === rock.remaining) continue;
      rock.remaining = remaining;
      const left = Math.ceil((remaining / 8) * 5);
      rock.lumps.forEach((lump, k) => {
        lump.visible = k >= 5 - left;
      });
      rock.band.visible = remaining > 0;
      if (rock.body) owner.removeBody(rock.body);
      rock.body =
        remaining > 0
          ? addStatic(
              {
                kind: 'cylinder',
                rTop: rock.radius * 0.8,
                rBottom: rock.radius * 0.8,
                h: rock.radius * 1.4,
                segments: 7,
              },
              { x: rock.x, y: rock.y + rock.radius * 0.7, z: rock.z },
              undefined,
              undefined,
              owner,
            )
          : null;
    }
    const beam = beamNow();
    ground.root.visible = !!beam && (beam.state === 'available' || beam.state === 'ground');
    if (beam) {
      beamAt.set(beam.x / 100, beam.y / 100 + 0.45, beam.z / 100);
      ground.root.position.copy(beamAt);
      if (beam.state === 'held') {
        const holder = avatarOf(beam.holder);
        if (holder) beamAt.copy(holder.position);
      }
    }
    // Your own Pick up takes the rope the frame you press it, before the server's answer (a refusal drops it again).
    const loose = !!beam && (beam.state === 'available' || beam.state === 'ground');
    if (loose) lay.copy(beamAt);
    const grabbed = loose && now - grabbing < 1500 && adapter.read.pending() > 0;
    if (grabbed) ground.root.visible = false;
    const live = new Set<string>();
    for (const account of accounts(world())) {
      const avatar = avatarOf(account.pid),
        frame = frameOf(avatar);
      const beamHeld =
        (beam?.state === 'held' && beam.holder === account.pid) || (grabbed && account.pid === adapter.read.pid);
      if (!frame || (!account.stone && !account.rails && !beamHeld)) continue;
      live.add(account.pid);
      let model = worn.get(account.pid);
      if (!model) {
        model = makeCarryModels();
        owner.add(model.root);
        owner.cleanup(() =>
          model!.root.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
            }
          }),
        );
        worn.set(account.pid, model);
      }
      if (model.root.parent !== frame) frame.add(model.root);
      model.stone.count = account.stone;
      model.stone.visible = model.stone.count > 0;
      // Rails share capacity with logs, but their mesh has its own count and lifetime, including after logs unload.
      model.setRails(account.rails, rail(world()).pack);
      let drag = drags.get(account.pid);
      if (!beamHeld || !avatar) {
        model.beam.visible = false;
        drag?.hide();
        continue;
      }
      if (!drag) {
        drag = createBeamDrag(dragWorld, model.beam, H, ropeMaterial);
        drags.set(account.pid, drag);
      }
      const yaw = avatar.rotation.y,
        back = { x: Math.sin(yaw), z: Math.cos(yaw) };
      // A short rope's length behind, so the trunk clears Buddy.
      hip.set(
        avatar.position.x + back.x * 1.05 + Math.cos(yaw) * side * 0.4,
        avatar.position.y + 0.15,
        avatar.position.z + back.z * 1.05 - Math.sin(yaw) * side * 0.4,
      );
      // Where the far end starts: the end of the trunk as it last lay that is further from you, else straight behind.
      if (Math.hypot(lay.x - hip.x, lay.z - hip.z) < 8) {
        const sx = lay.x - hip.x > 0 ? 1 : -1;
        from.set(lay.x + sx * (BEAM_LENGTH / 2), lay.y, lay.z);
      } else from.set(hip.x + back.x * BEAM_LENGTH, hip.y, hip.z + back.z * BEAM_LENGTH);
      const helperAvatar = helperFor(account.pid);
      const helper = frameOf(helperAvatar);
      let helped: [THREE.Vector3, THREE.Vector3] | null = null;
      if (helper) {
        helper.updateWorldMatrix(true, false);
        shoulderA.set(...BEAM_CARRY_POSITION);
        frame.localToWorld(shoulderA);
        shoulderB.set(...BEAM_CARRY_POSITION);
        helper.localToWorld(shoulderB);
        if (shoulderA.distanceToSquared(shoulderB) >= 0.25) helped = [shoulderA, shoulderB];
      }
      if (floatCarry) {
        if (!model.beam.getObjectByName('axe-blade-contact'))
          for (const [name, z] of [
            ['axe-blade-contact', BEAM_LENGTH / 2],
            ['axe-grip-left', -BEAM_LENGTH / 2],
          ] as const) {
            const marker = new THREE.Object3D();
            marker.name = name;
            marker.position.z = z;
            model.beam.add(marker);
          }
        drag.float(now, avatar.position, yaw, side, helped);
        sparkleAxe(model.beam, true, reducedMotion, emit, readableIntensity(), dt);
      } else {
        avatar.userData.beamGrip = 'rope';
        posing.add(avatar);
        if (helped && helperAvatar) {
          helperAvatar.userData.beamGrip = 'lift';
          posing.add(helperAvatar);
        }
        // Trail about 35 degrees off straight behind, on the shoulder side: the trunk shows its length across the view.
        trail.set(back.x * 0.82 + Math.cos(yaw) * side * 0.57, 0, back.z * 0.82 - Math.sin(yaw) * side * 0.57);
        drag.update(dt, hip, from, trail, helped);
      }
    }
    for (const [pid, model] of worn)
      if (!live.has(pid)) {
        model.root.removeFromParent();
        model.beam.removeFromParent();
        drags.get(pid)?.hide();
      }
  }
  function targets(): Interactable[] {
    if (!adapter.read.ready() || !me.body) return [];
    const p = me.body.interpolatedPosition,
      result: Interactable[] = [];
    if (!['asleep', 'waking'].includes(phase()) && beamNow().holder !== adapter.read.pid)
      for (const rock of rocks) {
        if (rock.remaining > 0 && Math.hypot(p.x - rock.x, p.z - rock.z) <= 3.2)
          result.push({
            id: `railway-rock${rock.id}`,
            verb: 'Chop',
            at: rock.at,
            click: true,
            run: () => mine(rock.id),
          });
      }
    const beam = beamNow();
    if (
      beam &&
      (beam.state === 'available' || beam.state === 'ground') &&
      Math.hypot(p.x - beamAt.x, p.z - beamAt.z) <= 3.2
    )
      result.push(
        accountEmpty(adapter.read.pid) && !heldId()
          ? {
              id: 'railway-beam-take',
              verb: 'Pick up',
              at: beamAt,
              run: () => {
                if (adapter.beamTake(beam.revision)) grabbing = performance.now();
              },
            }
          : onlyALoadIn(adapter.read.world(), adapter.read.pid)
            ? {
                id: 'railway-beam-take',
                verb: 'Pick up',
                at: beamAt,
                run: () => {
                  const take = () => {
                    const ok = adapter.beamTake(beamNow().revision);
                    if (ok) grabbing = performance.now();
                    return ok;
                  };
                  setDownThen(adapter, take, beamAt, true);
                },
              }
            : { id: 'railway-beam-take', verb: 'Pick up', at: beamAt, blocked: 'Empty your back first' },
      );
    if (mineHelp.helping())
      result.push({ id: 'railway-beam-help-release', verb: 'Let go', at: beamAt, run: () => mineHelp.stop() });
    else if (beam?.state === 'held' && mineHelp.canStart(beam.holder)) {
      const other = avatarOf(beam.holder);
      if (other)
        result.push({
          id: 'railway-beam-help',
          verb: 'Help carry',
          // The friend reaches for the dragging end.
          at: drags.get(beam.holder)?.grip ?? other.position,
          run: () => mineHelp.start(beam.holder),
        });
    }
    return result;
  }
  function drop() {
    const beam = beamNow();
    if (beam.state !== 'held' || beam.holder !== adapter.read.pid || !me.body) return false;
    const p = me.body.interpolatedPosition;
    const x = p.x - Math.sin(me.yaw) * 2.7,
      z = p.z - Math.cos(me.yaw) * 2.7;
    return adapter.beamDrop(Math.round(x * 100), Math.round(H(x, z) * 100), Math.round(z * 100), beam.revision);
  }
  owner.cleanup(() => {
    for (const avatar of posing) avatar.userData.beamGrip = null;
    posing.clear();
    mineHelp.dispose();
    if (help === mineHelp) help = null;
    for (const model of worn.values()) model.root.removeFromParent();
    worn.clear();
    for (const drag of drags.values()) drag.dispose();
    drags.clear();
    dragWorld.removeFromParent();
  });
  return {
    update,
    lateUpdate() {
      // Both the local Buddy and friends have the held-item socket. Sample after feel.ts's squash/landing pose.
      for (const [pid, drag] of drags) {
        const avatar = avatarOf(pid);
        if (!avatar) continue;
        const hand = avatar.userData.handSocket;
        if (hand) hand.getWorldPosition(anchor);
        else {
          // The diagnostic capsule has no rig; retain its existing load-frame fallback.
          const frame = frameOf(avatar);
          if (!frame) continue;
          frame.updateWorldMatrix(true, false);
          anchor.copy(anchorLocal);
          frame.localToWorld(anchor);
        }
        drag.drawRope(anchor);
      }
    },
    targets,
    drop,
    rocks,
    prePhysics() {
      if (beamNow().state === 'held' && beamNow().holder === adapter.read.pid) {
        input.sprint = me.sprint = false;
        me.wish.multiplyScalar(
          (helperFor(adapter.read.pid)
            ? adapter.read.movement().beamHelpSpeed
            : adapter.read.movement().beamSoloSpeed) / 5.6,
        );
      } else if (mineHelp.helping()) {
        input.sprint = me.sprint = false;
        mineHelp.ease(me.wish);
      }
    },
  };
}
