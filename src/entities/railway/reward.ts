// T1's conductor hat and T2's scarf: profiles commit before the common-box reveal begins.
// Construction is Lockstep; eligibility is read-only, claims are personal Local, worn cosmetics are Owner presence.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import { createBrowserRailwayProfile } from '../../railway-profile-browser.ts';
import { addPresenceField, getRoomId, onRemotePresence, remotes } from '../../netplay/net.ts';
import { me } from '../../player/player.ts';
import type { Interactable } from '../../player/hands.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { createRewardReveal } from '../../render/reward-reveal.ts';
import { T1_CRATE_PARTS, T1_REWARD, MULTI_AXE_REWARD } from '../../render/t1-reward-parts.ts';
import { emit } from '../../render/particles.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { thump } from '../../render/machine-sfx.ts';
import { T2_REWARD } from './reward-data.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';
import { createRailwayTools } from './tools.ts';

const localCosmetics = new Set<string>();
const remoteCosmetics = new Map<string, Set<string>>();
addPresenceField('railwayCosmetic', () => (localCosmetics.has('hat') ? 'hat' : null));
addPresenceField('railwayScarf', () => (localCosmetics.has('scarf') ? true : null));
onRemotePresence((remote, presence) => {
  const items = new Set<string>();
  if (remote.entered && presence.railwayCosmetic === 'hat') items.add('hat');
  if (remote.entered && presence.railwayScarf === true) items.add('scarf');
  remoteCosmetics.set(remote.peer, items);
});

export async function createRailwayReward(
  adapter: RailwayAdapter,
  owner: OwnedView,
  machineFrom?: (out: THREE.Vector3) => void,
) {
  const [{ softGlow }, { fanfare, pop }] = await Promise.all([
    import('../../proto/place/look.ts'),
    import('../../proto/minis/common.ts'),
  ]);
  // One reveal queue owns input/camera holding for both personal boxes and shared tools.
  const reveal = createRewardReveal({ parent: owner.root, fanfare, pop, softGlow });
  owner.cleanup(() => reveal.dispose());
  const first = await createStationReward(adapter, owner, reveal, 0, machineFrom);
  const second = await createStationReward(adapter, owner, reveal, 1, machineFrom);
  const tools = await createRailwayTools(adapter, owner, reveal);
  return {
    inspect() {
      const t1 = first.inspect(),
        t2 = second.inspect(),
        toolState = tools.inspect();
      return {
        ...t1,
        claims: Math.max(t1.claims, t2.claims),
        t2,
        boxes: [
          { station: 'T1', ...t1 },
          { station: 'T2', ...t2 },
        ],
        tools: toolState,
        axeChest: toolState.axeChest,
        jumpDevice: toolState.jumpDevice,
        showing: reveal.gettingItem(),
      };
    },
    targets: () => [...first.targets(), ...second.targets(), ...tools.targets()],
    update(dt: number, now: number) {
      first.update(dt, now);
      second.update(dt, now);
      tools.update(dt, now);
      reveal.updateGot(dt);
    },
    fixedPre: () => tools.fixedPre(),
    dispose() {
      first.dispose();
      second.dispose();
      tools.dispose();
    },
  };
}

export function rewardSeat(
  line: import('../../proto/place/layout.ts').LineSpec,
  besideLine: typeof import('../../proto/place/rail.ts').besideLine,
  H: typeof import('../../proto/place/terrain.ts').H,
  railY: typeof import('../../proto/place/layout.ts').railY,
  stationIndex: 0 | 1 = 0,
) {
  // The same safe-ground choice as Place's handCrate, including its next-frame placement and fallbacks.
  const t1 = line.stations[stationIndex]!,
    next = line.stations[stationIndex + 1]!;
  const at = new THREE.Vector3();
  let placed = false;
  const nextAt = besideLine(line.line, next.s - line.dir * 1.5, next.side * 5.4);
  const nextY = H(nextAt.x, nextAt.z);
  for (const along of [-line.dir * 3.4, line.dir * 3.4]) {
    const q = besideLine(line.line, next.s - line.dir * 1.5 + along, next.side * 5.4);
    const ground = (x: number, z: number) => Math.abs(H(x, z) - nextY) <= 1;
    if (
      ![0, 3.5].every(
        (r) => ground(q.x + r, q.z) && ground(q.x - r, q.z) && ground(q.x, q.z + r) && ground(q.x, q.z - r),
      )
    )
      continue;
    at.set(q.x, H(q.x, q.z), q.z);
    placed = true;
    break;
  }
  if (!placed) {
    for (const [back, lat] of [
      [7, 3.2],
      [3, 3.2],
      [-3, 3.2],
      [-6, 3.2],
      [7, -3.6],
      [-6, -3.6],
    ]) {
      const s = t1.to - line.dir * back!;
      const q = besideLine(line.line, s, t1.side * lat!);
      if (Math.abs(H(q.x, q.z) - railY(line.line, s)) > 1.4) continue;
      at.set(q.x, H(q.x, q.z), q.z);
      placed = true;
      break;
    }
  }
  if (!placed) {
    const q = besideLine(line.line, t1.to, t1.side * 3.2);
    at.set(q.x, H(q.x, q.z), q.z);
  }
  return at;
}

async function createStationReward(
  adapter: RailwayAdapter,
  owner: OwnedView,
  reveal: ReturnType<typeof createRewardReveal>,
  stationIndex: 0 | 1,
  machineFrom?: (out: THREE.Vector3) => void,
) {
  const reward = stationIndex === 0 ? T1_REWARD : T2_REWARD;
  const stationId = stationIndex === 0 ? 'T1' : 'T2';
  const completion = () =>
    adapter.inspect().stations[stationIndex]?.completion ?? (stationIndex === 0 ? adapter.inspect().completion : 0);
  const [{ merged }, { softGlow }, { pop, knock }, { LINKS, railY }, { H }, { besideLine }, { dustRing }] =
    await Promise.all([
      import('../../proto/place/part-geometry.ts'),
      import('../../proto/place/look.ts'),
      import('../../proto/minis/common.ts'),
      import('../../proto/place/layout.ts'),
      import('../../proto/place/land.ts'),
      import('../../proto/place/rail.ts'),
      import('../../proto/place/pieces.ts'),
    ]);
  const root = new THREE.Group();
  owner.root.add(root);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 });
  const hatGeo = merged(reward.parts);
  const multiGeo = merged(MULTI_AXE_REWARD.parts);
  const crate = new THREE.Mesh(merged(T1_CRATE_PARTS), material);
  crate.castShadow = true;
  const glow = softGlow('#ffe9b0', 0.16, 'up');
  glow.mat.blending = THREE.NormalBlending;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.85, 1.8, 12, 1, true).translate(0, 2.2, 0), glow.mat);
  root.add(crate, beam);
  crate.visible = beam.visible = false;

  const at = rewardSeat(LINKS[0]!, besideLine, H, railY, stationIndex);
  crate.position.copy(at);
  beam.position.copy(at);
  const targetAt = at.clone().add(new THREE.Vector3(0, 1.3, 0));
  const from = at.clone();
  const boardMaterial = new THREE.MeshStandardNodeMaterial({ color: '#b57f44', roughness: 0.9 });
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(0.72, 0.07, 0.22), boardMaterial, 14);
  boards.count = 0;
  boards.frustumCulled = false;
  boards.castShadow = true;
  root.add(boards);
  const flashGlow = softGlow('#fff0c0', 1);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), flashGlow.mat);
  const shaftGlow = softGlow('#ffe08a', 0.8, true);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 2.1, 40, 14, 1, true).translate(0, 20, 0),
    shaftGlow.mat,
  );
  flash.position.copy(at).y += 0.9;
  shaft.position.copy(at);
  flash.visible = shaft.visible = false;
  root.add(flash, shaft);
  const boardPose = new THREE.Object3D();
  const flying: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    a: number;
    va: number;
    t: number;
  }[] = [];
  const gold = new THREE.Color('#ffd76a');
  const confetti = ['#ff4f4f', '#ffcf33', '#2f8cff', '#4fdc7a', '#ff7ad9', '#ffffff'].map(
    (color) => new THREE.Color(color),
  );
  const worn = new Map<string, THREE.Mesh>();
  let profile: ReturnType<typeof createBrowserRailwayProfile> | null = null;
  let error: string | null = null;
  let claimed = false,
    owned = false,
    busy = false,
    disposed = false;
  let claims = 0,
    revealCount = 0,
    revealT = -1,
    flight = 1,
    flare = 0;
  let previous = -1;
  let liveWake = false;
  let multiReveals = 0;
  const offAccepted = adapter.onAccepted((event) => {
    if (stationIndex === 0 && event.op === 'rail.wake' && event.accepted > 0) liveWake = true;
  });
  const world = railwayRoomId(getRoomId());
  function load() {
    if (!profile) return;
    try {
      const value = profile.read();
      claims = value.claims.length;
      owned = value.claims.some((claim) => claim.cosmetic === reward.id);
      claimed = value.claims.some(
        (claim) => claim.world === world && claim.station === stationId && claim.completion === 1,
      );
      error = null;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Personal reward storage unavailable';
    }
  }
  try {
    profile = createBrowserRailwayProfile(adapter.inspect().pid, [T1_REWARD.id, T2_REWARD.id]);
    load();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Personal reward storage unavailable';
  }
  const listeners = new AbortController();
  addEventListener(
    'storage',
    (event) => {
      if (event.key === profile?.key) load();
    },
    { signal: listeners.signal },
  );
  const offReset = adapter.onReset(() => {
    previous = -1;
    liveWake = false;
    flight = 1;
    load();
  });
  function sparks(n: number, speed: number) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      emit({
        x: at.x,
        y: at.y + 0.8,
        z: at.z,
        vx: Math.cos(a) * speed,
        vy: (Math.random() * 1.4 - 0.2) * speed,
        vz: Math.sin(a) * speed,
        life: 0.7 + Math.random() * 0.6,
        size: 0.16 + Math.random() * 0.1,
        color: gold,
        gravity: 5,
        drag: 1,
        shrink: 0.5,
      });
    }
  }
  function burst() {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2,
        speed = 3 + Math.random() * 3.5;
      flying.push({
        x: at.x,
        y: at.y + 0.5,
        z: at.z,
        vx: Math.cos(a) * speed,
        vy: 4 + Math.random() * 5,
        vz: Math.sin(a) * speed,
        a: Math.random() * 6,
        va: 6 + Math.random() * 9,
        t: 0,
      });
    }
    for (let k = 0; k < 110; k++) {
      const a = Math.random() * Math.PI * 2,
        speed = 1.5 + Math.random() * 5;
      emit({
        x: at.x,
        y: at.y + 0.8,
        z: at.z,
        vx: Math.cos(a) * speed,
        vy: 6 + Math.random() * 8,
        vz: Math.sin(a) * speed,
        life: 1.6 + Math.random(),
        size: 0.17 + Math.random() * 0.13,
        color: confetti[k % confetti.length]!,
        gravity: 8,
        drag: 1.5,
        shrink: 0.3,
      });
    }
    sparks(34, 6);
    dustRing(at.x, at.y + 0.1, at.z, 12, 3.2, 0.45);
    placeSound('boxCommon', at.x, at.z);
    reveal.youGot({
      name: reward.name,
      line: reward.line,
      color: '#fff7e8',
      model: new THREE.Mesh(hatGeo, material),
      from: at.clone().add(new THREE.Vector3(0, 0.9, 0)),
      done: () => {
        revealT = -1;
      },
    });
  }
  async function open() {
    if (busy || claimed || !profile || !adapter.inspect().ready || completion() !== 1) return;
    busy = true;
    try {
      const result = await profile.claim({ world, station: stationId, completion: 1 }, reward.id);
      if (disposed) return;
      load();
      if (result.status === 'accepted') {
        revealT = 0;
        revealCount++;
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Personal reward storage unavailable';
    } finally {
      busy = false;
    }
  }
  function requestOpen() {
    void open();
  } // open owns both storage and lock failures.
  function wear(key: string, avatar: THREE.Object3D | null | undefined, visible: boolean) {
    let hat = worn.get(key);
    if (!visible || !avatar) {
      hat?.removeFromParent();
      worn.delete(key);
      return;
    }
    if (!hat) {
      hat = new THREE.Mesh(hatGeo, material);
      hat.castShadow = true;
      hat.scale.setScalar(stationIndex === 0 ? 0.86 : 0.62);
      hat.rotation.y = Math.PI;
      worn.set(key, hat);
    }
    if (hat.parent !== avatar) avatar.add(hat);
    avatar.updateWorldMatrix(true, false);
    const bone = avatar.getObjectByName(stationIndex === 0 ? 'Head' : 'neck_01');
    if (bone) avatar.worldToLocal(bone.getWorldPosition(hat.position));
    else hat.position.set(0, 0.9, 0);
    hat.position.y += stationIndex === 0 ? 0.33 : -0.2;
  }
  const api = {
    inspect: () => ({
      claims,
      claimed,
      owned,
      busy,
      error,
      revealCount,
      multiReveals,
      showing: reveal.gettingItem(),
      visible: crate.visible,
      x: at.x,
      y: at.y,
      z: at.z,
    }),
    targets(): Interactable[] {
      if (!crate.visible || flight < 1 || revealT >= 0 || busy) return [];
      return [
        {
          id: `railway-${stationId.toLowerCase()}-box`,
          verb: 'Open',
          at: targetAt,
          r: 3.4,
          ...(error ? { blocked: error } : { run: requestOpen }),
        },
      ];
    },
    update(dt: number, now: number) {
      const state = adapter.inspect();
      if (liveWake && state.ready && state.phase !== 'asleep' && state.phase !== 'waking') {
        liveWake = false;
        if (
          reveal.youGot({
            key: MULTI_AXE_REWARD.key,
            name: MULTI_AXE_REWARD.name,
            line: MULTI_AXE_REWARD.line,
            model: new THREE.Mesh(multiGeo, material),
          })
        )
          multiReveals++;
      }
      if (state.ready) {
        if (previous === 0 && completion() === 1 && !claimed && machineFrom) {
          machineFrom(from);
          flight = 0;
        }
        previous = completion();
      }
      crate.visible = state.ready && completion() === 1 && (!claimed || (revealT >= 0 && revealT < 0.12));
      beam.visible = crate.visible && revealT < 0;
      flare = Math.max(0, flare - dt / 1.6);
      glow.strength.value = 0.16 + flare * flare * 0.4;
      if (crate.visible && flight < 1) {
        flight = Math.min(1, flight + dt / 0.7);
        crate.position.lerpVectors(from, at, flight);
        crate.position.y += Math.sin(flight * Math.PI) * 2.4;
        crate.rotation.x = (1 - flight) * 3;
        if (flight === 1) {
          flare = 1;
          thump(at.x, at.z);
          knock(0.5, 0.9);
          dustRing(at.x, at.y + 0.1, at.z, 10, 2.4, 0.4);
          sparks(18, 3.4);
          pop(4, 0.6);
        }
      } else if (crate.visible && revealT < 0) {
        crate.position.copy(at).y += Math.max(0, Math.sin(now * 0.004)) * 0.06;
        crate.rotation.set(0, 0, Math.sin(now * 0.0035) * 0.02);
        if (Math.random() < dt * 3) sparks(1, 1.2);
      }
      if (revealT >= 0) {
        const old = revealT;
        revealT += dt;
        if (revealT < 0.12) {
          const w = Math.sin(revealT * 60) * 0.06 * (0.4 + revealT / 0.12);
          crate.rotation.set(w, 0, -w);
          crate.scale.setScalar(1 + (revealT / 0.12) * 0.14);
        }
        if (old < 0.12 && revealT >= 0.12) burst();
        const u = Math.max(0, revealT - 0.12),
          fb = Math.min(1, u / 0.42),
          fs = Math.min(1, u / 0.8);
        flash.visible = revealT >= 0.12 && fb < 1;
        flash.scale.setScalar(0.6 + fb * 6);
        flashGlow.strength.value = (1 - fb) * 1.1;
        shaft.visible = revealT >= 0.12 && fs < 1;
        shaft.scale.set(1 + fs * 0.3, 1, 1 + fs * 0.3);
        shaftGlow.strength.value = 0.7 * (1 - fs * fs);
      }
      for (let i = 0; i < flying.length; i++) {
        const f = flying[i]!;
        f.t += dt;
        f.vy -= 14 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.z += f.vz * dt;
        f.a += f.va * dt;
        const floor = H(f.x, f.z) + 0.05;
        if (f.y < floor) {
          f.y = floor;
          f.vy *= -0.3;
          f.vx *= 0.6;
          f.vz *= 0.6;
          f.va *= 0.5;
        }
        boardPose.position.set(f.x, f.y, f.z);
        boardPose.rotation.set(f.a, f.a * 0.6, 0);
        boardPose.updateMatrix();
        boards.setMatrixAt(i, boardPose.matrix);
      }
      if (flying[0] && flying[0].t > 2.4) flying.length = 0;
      boards.count = flying.length;
      if (boards.count) boards.instanceMatrix.needsUpdate = true;
      if (owned && revealT < 0) localCosmetics.add(reward.id);
      else localCosmetics.delete(reward.id);
      wear('self', me.avatar, localCosmetics.has(reward.id));
      const present = new Set(['self']);
      for (const remote of remotes.values()) {
        present.add(remote.peer);
        wear(remote.peer, remote.avatar, remoteCosmetics.get(remote.peer)?.has(reward.id) === true);
      }
      for (const key of worn.keys())
        if (!present.has(key)) {
          worn.get(key)!.removeFromParent();
          worn.delete(key);
        }
      for (const key of remoteCosmetics.keys()) if (!remotes.has(key)) remoteCosmetics.delete(key);
      const p = me.body?.position;
      if (p && crate.visible && flight === 1 && revealT < 0 && !error && Math.hypot(p.x - at.x, p.z - at.z) < 1.25)
        requestOpen();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      offReset();
      offAccepted();
      listeners.abort();
      localCosmetics.delete(reward.id);
      for (const hat of worn.values()) hat.removeFromParent();
      worn.clear();
      root.removeFromParent();
      for (const geometry of [
        crate.geometry,
        hatGeo,
        multiGeo,
        beam.geometry,
        boards.geometry,
        flash.geometry,
        shaft.geometry,
      ])
        geometry.dispose();
      for (const mat of [material, glow.mat, boardMaterial, flashGlow.mat, shaftGlow.mat]) mat.dispose();
      boards.dispose();
    },
  };
  owner.cleanup(api.dispose);
  return api;
}
