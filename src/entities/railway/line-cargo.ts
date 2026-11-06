// Accepted rocks, mixed back and unique beam. Helper grip is Owner presentation, never a second item claim.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { input } from '../../player/input-state.ts';
import { heldId } from '../../player/inventory.ts';
import { addPresenceField, onRemotePresence, remotes } from '../../netplay/net.ts';
import { LINE1_ROCKS } from '../../sim/railway-line-layout.ts';

let localHelp: (() => string | null) | null = null;
const helpers = new Map<string, { holder: string; at: number }>();
addPresenceField('railwayBeamHelp', () => localHelp?.() ?? null);
onRemotePresence((remote, presence) => {
  const value = presence.railwayBeamHelp;
  if (typeof value === 'string' && value.length <= 64 && value.length > 0)
    helpers.set(remote.peer, { holder: value, at: performance.now() });
  else helpers.delete(remote.peer);
});
const frameOf = (avatar: THREE.Object3D | null) => {
  const data = avatar?.userData as { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D } } | undefined;
  return data?.loadFit?.frame ?? data?.inner ?? null;
};

export async function createLineCargo(adapter: RailwayAdapter, owner: OwnedView, mine: (id: number) => void) {
  const [{ H, addStatic }, { ROCKS }, { flat }, { makeCarryModels, BEAM_CARRY_POSITION }] = await Promise.all([
    import('../../proto/place/land.ts'),
    import('../../proto/place/layout.ts'),
    import('../../proto/flat.ts'),
    import('../../proto/place/carry-models.ts'),
  ]);
  let state = adapter.inspect(),
    helping: string | null = null,
    alive = true;
  const rocks = LINE1_ROCKS.map((source, i) => {
    const radius = ROCKS[i]!.r,
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
    support = new THREE.Vector3(),
    along = new THREE.Vector3(0, 0, 1);
  const accountEmpty = (pid: string) => {
    const a = state.accounts.find((account) => account.pid === pid);
    return !!a && a.carry === 0 && (a.stone ?? 0) === 0;
  };
  const avatarOf = (pid: string) =>
    pid === state.pid ? me.avatar : ([...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar ?? null);
  const near = (a: THREE.Object3D, b: THREE.Object3D) =>
    Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) <= 5 &&
    Math.abs(a.position.y - b.position.y) <= 2;
  const validHelp = () => {
    const beam = state.beam;
    if (!helping || !beam || beam.state !== 'held' || beam.holder !== helping || !accountEmpty(state.pid) || heldId())
      return false;
    const a = me.avatar,
      b = avatarOf(helping);
    return !!a && !!b && near(a, b);
  };
  const provider = () => (alive && validHelp() ? helping : null);
  localHelp = provider;
  function helperFor(holder: string) {
    const carrier = avatarOf(holder);
    if (!carrier) return null;
    if (helping === holder && validHelp()) return me.avatar;
    for (const [peer, help] of helpers) {
      const other = remotes.get(peer);
      if (!other || performance.now() - help.at > 1500) {
        helpers.delete(peer);
        continue;
      }
      if (
        help.holder === holder &&
        other.entered &&
        other.avatar &&
        !!other.pid &&
        accountEmpty(other.pid) &&
        near(carrier, other.avatar)
      )
        return other.avatar;
    }
    return null;
  }
  function update() {
    state = adapter.inspect();
    if (!validHelp()) helping = null;
    for (const rock of rocks) {
      const current = state.rocks.find((row) => row.id === rock.id);
      const remaining = current?.remaining ?? 0;
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
    const beam = state.beam;
    ground.root.visible = !!beam && (beam.state === 'available' || beam.state === 'ground');
    if (beam) {
      beamAt.set(beam.x / 100, beam.y / 100 + 0.45, beam.z / 100);
      ground.root.position.copy(beamAt);
      if (beam.state === 'held') {
        const holder = avatarOf(beam.holder);
        if (holder) beamAt.copy(holder.position);
      }
    }
    const live = new Set<string>();
    for (const account of state.accounts) {
      const avatar = avatarOf(account.pid),
        frame = frameOf(avatar);
      const beamHeld = beam?.state === 'held' && beam.holder === account.pid;
      if (!frame || (!(account.stone ?? 0) && !beamHeld)) continue;
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
      model.stone.count = account.stone ?? 0;
      model.stone.visible = model.stone.count > 0;
      model.beam.visible = beamHeld;
      model.beam.position.set(...BEAM_CARRY_POSITION);
      model.beam.quaternion.identity();
      const helper = beamHeld ? frameOf(helperFor(account.pid)) : null;
      if (helper) {
        helper.updateWorldMatrix(true, false);
        frame.updateWorldMatrix(true, false);
        support.set(...BEAM_CARRY_POSITION);
        helper.localToWorld(support);
        frame.worldToLocal(support);
        support.sub(model.beam.position);
        if (support.lengthSq() >= 0.25) {
          model.beam.position.addScaledVector(support, 0.5);
          model.beam.quaternion.setFromUnitVectors(along, support.normalize());
        }
      }
    }
    for (const [pid, model] of worn)
      if (!live.has(pid)) {
        model.root.removeFromParent();
      }
  }
  function targets(): Interactable[] {
    if (!state.ready || !me.body) return [];
    const p = me.body.interpolatedPosition,
      result: Interactable[] = [];
    if (!['asleep', 'waking'].includes(state.phase) && state.beam?.holder !== state.pid)
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
    const beam = state.beam;
    if (
      beam &&
      (beam.state === 'available' || beam.state === 'ground') &&
      Math.hypot(p.x - beamAt.x, p.z - beamAt.z) <= 3.2
    )
      result.push(
        accountEmpty(state.pid) && state.axe && !heldId()
          ? { id: 'railway-beam-take', verb: 'Pick up', at: beamAt, run: () => void adapter.beamTake(beam.revision) }
          : {
              id: 'railway-beam-take',
              verb: 'Pick up',
              at: beamAt,
              blocked: state.axe ? 'Empty your back first' : 'A proper axe first',
            },
      );
    if (helping && validHelp())
      result.push({
        id: 'railway-beam-help-release',
        verb: 'Let go',
        at: beamAt,
        run: () => {
          helping = null;
        },
      });
    else if (beam?.state === 'held' && beam.holder !== state.pid && accountEmpty(state.pid) && !heldId()) {
      const other = avatarOf(beam.holder);
      if (other && me.avatar && near(me.avatar, other))
        result.push({
          id: 'railway-beam-help',
          verb: 'Help carry',
          at: other.position,
          run: () => {
            helping = beam.holder;
          },
        });
    }
    return result;
  }
  function drop() {
    const beam = state.beam;
    if (!beam || beam.state !== 'held' || beam.holder !== state.pid || !me.body) return false;
    const p = me.body.interpolatedPosition;
    const x = p.x - Math.sin(me.yaw) * 2.7,
      z = p.z - Math.cos(me.yaw) * 2.7;
    return adapter.beamDrop(Math.round(x * 100), Math.round(H(x, z) * 100), Math.round(z * 100), beam.revision);
  }
  owner.cleanup(() => {
    alive = false;
    if (localHelp === provider) localHelp = null;
    for (const model of worn.values()) model.root.removeFromParent();
    worn.clear();
  });
  return {
    update,
    targets,
    drop,
    rocks,
    prePhysics() {
      state = adapter.inspect();
      if (state.beam?.state === 'held' && state.beam.holder === state.pid) {
        input.sprint = me.sprint = false;
        me.wish.multiplyScalar((helperFor(state.pid) ? state.beamHelpSpeed : state.beamSoloSpeed) / 5.6);
      } else if (helping) input.sprint = me.sprint = false;
    },
  };
}
