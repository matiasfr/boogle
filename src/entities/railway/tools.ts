// Shared tools are accepted railway facts; meshes, reveals and the second jump are Local/Owner views.
// This leaf imports authored shapes/layout only, never Place's job, tech, ladder or coop owners.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { createRewardReveal } from '../../render/reward-reveal.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { backSeam } from '../../player/haul-back.ts';
import { frameOf } from '../../render/haul-bundle.ts';
import { remotes } from '../../netplay/net.ts';
import { inputState } from '../../player/input-state.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { GRAVITY, PLAYER_MASS, PLAYER_R, FIXED, reducedMotion } from '../../constants.ts';
import { T1_CRATE_PARTS, MULTI_AXE_REWARD } from '../../render/t1-reward-parts.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { readableUnlit, readableIntensity } from '../../render/readable-unlit.ts';
import { emit } from '../../render/particles.ts';
import { AXE_REWARD, JUMP_REWARD, PACK_REWARD } from './reward-data.ts';
import { airJumpApexForce } from '../player/apex-float.ts';
import { linePanels } from '../../sim/railway-line-layout.ts';
import { LINE2_PACK } from '../../sim/railway-line2-layout.ts';
import { account, forge, rail, type ReadWorld } from '../../sim/railway-rows.ts';
import { railPanelCount } from '../../sim/railway-queries-line1.ts';
import { line2PackReady } from '../../sim/railway-queries-line2.ts';

/** Stock units line one has closed after each count of laid rail pairs. */
const UNITS_LAID = [0];
for (const pair of linePanels()) UNITS_LAID.push(UNITS_LAID.at(-1)! + pair.stock);
/** A chest or box is in reach from its own spot: the ground distance the pick already measures to its edge, and about
 * a storey of height, so a prompt never floats up from one far away or on another level. */
export const CHEST_REACH = 3.4;
export function inReach(at: THREE.Vector3) {
  const p = me.body?.interpolatedPosition;
  return !!p && Math.hypot(p.x - at.x, p.z - at.z) <= CHEST_REACH && Math.abs(p.y - at.y) <= 3;
}

export async function createRailwayTools(
  adapter: RailwayAdapter,
  owner: OwnedView,
  reveal: ReturnType<typeof createRewardReveal>,
  machineFrom?: (out: THREE.Vector3) => void,
) {
  const [layout, tech, land, shapes, axes, flat, gear, sparkle] = await Promise.all([
    import('../../place/layout.ts'),
    import('../../place/tech-layout.ts'),
    import('../../place/land.ts'),
    import('../../render/part-geometry.ts'),
    import('../../render/axe-models.ts'),
    import('../../render/flat.ts'),
    import('../../render/gear-models.ts'),
    import('../../render/axe-sparkle.ts'),
  ]);
  const root = new THREE.Group();
  owner.root.add(root);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 });
  const teal = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: '#39e6c6' }));
  const shaftMaterial = readableUnlit(
    new THREE.MeshBasicNodeMaterial({
      color: '#39e6c6',
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const geometries: THREE.BufferGeometry[] = [];
  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material) {
    geometries.push(geometry);
    const m = new THREE.Mesh(geometry, mat);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  }
  // The proper axe waits by the forge, the lit forge's first made thing (owner, 7 November).
  const chestAt = new THREE.Vector3(layout.toWorld(layout.AXE_STAND.x), 0, layout.AXE_STAND.z);
  chestAt.y = land.H(chestAt.x, chestAt.z) + 0.7;
  const stand = mesh(new THREE.BoxGeometry(2.2, 0.7, 2.2), flat.flat('#c3ae83'));
  stand.position.copy(chestAt).y -= 0.35;
  land.addStatic({ kind: 'box', hx: 1.1, hy: 0.35, hz: 1.1 }, stand.position, undefined, undefined, owner);
  const chest = mesh(shapes.merged(T1_CRATE_PARTS), material);
  chest.position.copy(chestAt);
  chest.visible = false;
  const chestTarget = chestAt.clone().add(new THREE.Vector3(0, 1.3, 0));
  // The pack frame's chest stands beside the forge once its first bill is in (Place's ladder rung 2): the same chest,
  // on the ground, and whoever opens it opens it for everyone.
  const packAt = new THREE.Vector3(LINE2_PACK.x / 100, 0, LINE2_PACK.z / 100);
  packAt.y = land.H(packAt.x, packAt.z);
  const packChest = mesh(shapes.merged(T1_CRATE_PARTS), material);
  packChest.position.copy(packAt);
  packChest.visible = false;
  const packTarget = packAt.clone().add(new THREE.Vector3(0, 1.3, 0));
  const packPrize = shapes.merged(gear.packParts());
  geometries.push(packPrize);

  // Only the first pillar and its original lip are promoted. Walking home never depends on taking this device.
  const pillar = tech.PILLARS[0]!;
  const pad = tech.PADS.find((p) => p.id === 'p1')!;
  const ox = layout.ORIGIN.x;
  const base = Math.min(land.H(pillar.x + ox, pillar.z) - 0.5, pillar.top - 2.2);
  const height = pillar.top - 1.2 - base;
  const column = mesh(new THREE.CylinderGeometry(pillar.r - 0.4, pillar.r + 1.4, height, 7), flat.flat('#917b5e', 0.9));
  column.position.set(pillar.x + ox, base + height / 2, pillar.z);
  land.addStatic(
    { kind: 'cylinder', rTop: pillar.r - 0.4, rBottom: pillar.r + 1.4, h: height, segments: 7 },
    column.position,
    undefined,
    undefined,
    owner,
  );
  const platform = mesh(new THREE.BoxGeometry(pad.hx * 2, 1.2, pad.hz * 2), flat.flat('#b6a080', 0.9));
  platform.position.set(pad.x + ox, pad.top - 0.6, pad.z);
  land.addStatic({ kind: 'box', hx: pad.hx, hy: 0.6, hz: pad.hz }, platform.position, undefined, undefined, owner);
  let lip: THREE.Mesh | null = null;
  let lipBody: ReturnType<typeof land.addStatic> | null = null;
  let lipLength = 0;
  const machineAt = new THREE.Vector3();
  if (pillar.lipTo) {
    const dx = pillar.lipTo.x - pillar.x,
      dz = pillar.lipTo.z - pillar.z;
    const length = Math.hypot(dx, dz);
    lipLength = length;
    lip = mesh(new THREE.BoxGeometry(2.4, 0.5, length), flat.flat('#b6a080', 0.9));
    lip.position.set(pillar.x + dx / 2 + ox, pillar.top - 0.29, pillar.z + dz / 2);
    lip.rotation.y = Math.atan2(dx, dz);
    lip.visible = false;
  }
  const d = tech.DEVICES.jump;
  const deviceAt = new THREE.Vector3(d.x + ox, d.y, d.z);
  const drum = mesh(
    shapes.merged([
      ['c', 0, 0.35, 0, 0.72, 0.7, 0.72, '#55524a'],
      ['c', 0, 0.78, 0, 0.56, 0.16, 0.56, '#6d6a60'],
      ['c', 0, 0.9, 0, 0.5, 0.06, 0.5, '#c79a3e'],
    ]),
    material,
  );
  drum.position.copy(deviceAt);
  land.addStatic(
    { kind: 'cylinder', rTop: 0.6, rBottom: 0.72, h: 0.9, segments: 8 },
    { x: deviceAt.x, y: d.y + 0.45, z: d.z },
    undefined,
    undefined,
    owner,
  );
  const ring = mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 26), teal);
  const ring2 = mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 22), teal);
  const core = mesh(new THREE.OctahedronGeometry(0.26), teal);
  const shaft = mesh(new THREE.CylinderGeometry(0.1, 0.1, 70, 6), shaftMaterial);
  ring.position.copy(deviceAt).y += 1.45;
  ring2.position.copy(ring.position);
  core.position.copy(ring.position);
  shaft.position.copy(deviceAt).y += 36.4;
  ring.rotation.x = Math.PI / 2;
  const jumpTarget = deviceAt.clone().add(new THREE.Vector3(0, 2.2, 0));
  const jumpPrize = shapes.merged([
    ['t', -0.3, 0, 0, 0.32, 0.32, 0.32, '#39e6c6'],
    ['t', 0.3, 0, 0, 0.32, 0.32, 0.32, '#39e6c6'],
  ]);
  geometries.push(jumpPrize);
  const properModel = axes.makeAxeModel('proper-multi');
  // The multi-axe is carried by the wake's card (reward.ts); its model is here so a friend's flourish can show it too.
  const multiPrize = shapes.merged(MULTI_AXE_REWARD.parts);
  geometries.push(multiPrize);
  let axeReveals = 0,
    packReveals = 0,
    jumpReveals = 0,
    jumps = 0;
  let charge = true,
    second = false,
    knew = false,
    disposed = false;
  // Only the finder gets the card (docs/brainstorms/coop-abilities.md, option E); everyone else's flourish is
  // ability-arrival.ts. The shared card owns the finder's bounded particle moment.
  const mine = (event: { pid: string }) => event.pid === adapter.read.pid;
  const offAccepted = adapter.onAccepted((event) => {
    if (event.accepted <= 0) return;
    if (event.op === 'rail.axe') {
      // The opener gets the card; everyone else's flourish is ability-arrival.ts.
      if (!mine(event)) return;
      if (reveal.youGot({ key: 'axe', ...AXE_REWARD, model: properModel.clone(true), from: chestAt.clone() }))
        axeReveals++;
    }
    if (event.op === 'rail.pack') {
      if (!mine(event)) return;
      if (
        reveal.youGot({ key: 'pack', ...PACK_REWARD, model: new THREE.Mesh(packPrize, material), from: packAt.clone() })
      )
        packReveals++;
    }
    if (event.op === 'rail.jump') {
      if (!mine(event)) return;
      placeSound('pickupJump', deviceAt.x, deviceAt.z);
      if (
        reveal.youGot({
          key: 'jump',
          ...JUMP_REWARD,
          model: new THREE.Mesh(jumpPrize, material),
          from: ring.position.clone(),
        })
      )
        jumpReveals++;
    }
  });
  // The laid pairs only change with the tick or the world: keep the count until one does, not every frame.
  let panelsFor: ReadWorld | null = null,
    panelsTick = NaN,
    panels = 0;
  const panelsAt = (w: ReadWorld, tick: number) => {
    if (w !== panelsFor || tick !== panelsTick) {
      panelsFor = w;
      panelsTick = tick;
      panels = railPanelCount(w, tick);
    }
    return panels;
  };
  const axeAvailable = () => {
    const w = adapter.read.world();
    return adapter.read.ready() && !rail(w).axe && forge(w).lit >= 0;
  };
  const packAvailable = () => {
    const w = adapter.read.world();
    return adapter.read.ready() && line2PackReady(w) && !rail(w).pack;
  };
  // The pack frame on every back, once the world has it (shared state, so a friend's is derived the same way: no
  // presence key). It rides the avatar's back socket, the same frame the haul bundle sits in.
  const frames = new Map<THREE.Object3D, THREE.Mesh>();
  const wearPack = (avatar: THREE.Object3D | null | undefined, on: boolean) => {
    if (!avatar) return;
    let frame = frames.get(avatar);
    if (!on) return void frame?.removeFromParent();
    frame ??= gear.packFrameMesh();
    frames.set(avatar, frame);
    const back = frameOf(avatar);
    if (frame.parent !== back) back.add(frame);
  };
  const api = {
    /** A fresh model of an axe (or the pack frame) for a friend's flourish (materials are shared with the cards). */
    axeModel(key: string): THREE.Object3D | null {
      if (key === 'axe') return properModel.clone(true);
      if (key === 'multi-axe') return new THREE.Mesh(multiPrize, material);
      if (key === 'pack') return new THREE.Mesh(packPrize, material);
      return null;
    },
    inspect: () => ({
      axeChest: { x: chestAt.x, y: chestAt.y, z: chestAt.z, available: axeAvailable() },
      packChest: { x: packAt.x, y: packAt.y, z: packAt.z, available: packAvailable() },
      packReveals,
      packFramesWorn: [...frames.values()].filter((f) => f.parent).length,
      jumpDevice: {
        x: deviceAt.x,
        y: deviceAt.y,
        z: deviceAt.z,
        available: adapter.read.ready() && !rail(adapter.read.world()).jump,
      },
      axeReveals,
      jumpReveals,
      jumps,
      charge,
      second,
    }),
    targets(): Interactable[] {
      const p = me.body?.position;
      if (!adapter.read.ready() || !p) return [];
      const targets: Interactable[] = [];
      if (axeAvailable() && inReach(chestAt))
        targets.push({
          id: 'railway-axe-chest',
          verb: 'Open',
          at: chestTarget,
          r: 3.4,
          run: () => void adapter.openAxe(),
        });
      if (packAvailable() && inReach(packAt))
        targets.push({
          id: 'railway-pack-chest',
          verb: 'Open',
          at: packTarget,
          r: 3.4,
          run: () => void adapter.openPack(),
        });
      if (!rail(adapter.read.world()).jump && Math.hypot(p.x - deviceAt.x, p.z - deviceAt.z) <= 3 && Math.abs(p.y - deviceAt.y) <= 2.2)
        targets.push({
          id: 'railway-jump-device',
          verb: 'Take it',
          at: jumpTarget,
          run: () => void adapter.claimJump(),
        });
      return targets;
    },
    update(dt: number, now: number) {
      const w = adapter.read.world();
      // The sloping route sends the low laying gantry through this crossing. Join it only
      // after accepted construction and the local machine envelope have both passed.
      if (lip) {
        machineAt.set(0, 0, -Infinity);
        machineFrom?.(machineAt);
        lip.visible = tech.p1LipClear(UNITS_LAID[panelsAt(w, adapter.read.tick())] ?? 0, machineAt.z);
        if (lip.visible && !lipBody)
          lipBody = land.addStatic(
            { kind: 'box', hx: 1.2, hy: 0.25, hz: lipLength / 2 },
            lip.position,
            lip.quaternion,
            undefined,
            owner,
          );
        else if (!lip.visible && lipBody) {
          owner.removeBody(lipBody);
          lipBody = null;
        }
      }
      chest.visible = axeAvailable();
      if (chest.visible) chest.position.copy(chestAt).y += Math.max(0, Math.sin(now * 0.004)) * 0.06;
      packChest.visible = packAvailable();
      if (packChest.visible) packChest.position.copy(packAt).y += Math.max(0, Math.sin(now * 0.004 + 1.3)) * 0.06;
      const packOn = backSeam.pack?.() ?? false;
      wearPack(me.entered ? me.avatar : null, packOn);
      for (const r of remotes.values()) wearPack(r.visible && r.entered ? r.avatar : null, packOn);
      for (const [avatar, frame] of frames)
        if (!avatar.parent) {
          frame.removeFromParent();
          frames.delete(avatar);
        }
      for (const object of [ring, ring2, core]) object.visible = !rail(w).jump;
      // Keep the faint unclaimed locator; acquiring the power never expands it into a screen-filling beam.
      shaft.visible = !rail(w).jump;
      ring.rotation.z = now * 0.0007;
      ring2.rotation.y = now * 0.001;
      core.rotation.y = now * 0.0012;
    },
    /** Entity fixedPre order 42: the same post-controller second-jump seam as the approved prototype. True when the air
     * jump fired this step (move-order.ts re-arms an open canopy on it). */
    fixedPre() {
      const before = jumps;
      api.airJump();
      return jumps !== before;
    },
    airJump() {
      const b = me.body;
      // An unlock that arrives in the air never adds a jump to that flight: the charge comes on landing.
      const unlocked = rail(adapter.read.world()).jump;
      if (unlocked && !knew && me.coyote <= 0) charge = false;
      knew = unlocked;
      // Not with a footing on your back (docs/plans/works-late-game.md, step 2b): the plain jump only.
      if (!b || fallArrival.active || me.swimming || inputState.seated || inputState.held || me.down || account(adapter.read.world(), adapter.read.pid)?.foot) {
        second = false;
        return;
      }
      if (me.coyote > 0) {
        if (b.velocity.y < 1.5) charge = true;
        second = false;
        return;
      }
      const movement = adapter.read.movement();
      if (me.jumpQueued > 0 && unlocked && charge) {
        charge = false;
        second = true;
        me.jumpQueued = 0;
        b.velocity.y = Math.max(b.velocity.y, movement.jumpImpulse);
        // The player controller stores a unit input vector in wish, not metres per second.
        const wish = Math.hypot(me.wish.x, me.wish.z);
        if (wish > 0.1) {
          const speed = Math.max(Math.hypot(b.velocity.x, b.velocity.z), 5.6 * wish);
          b.velocity.x += ((me.wish.x / wish) * speed - b.velocity.x) * movement.jumpTurn;
          b.velocity.z += ((me.wish.z / wish) * speed - b.velocity.z) * movement.jumpTurn;
        }
        jumps++;
        const p = b.interpolatedPosition;
        if (!reducedMotion) sparkle.sparkleBurst(p.x, p.y - PLAYER_R, p.z, emit, readableIntensity());
      }
      if (!second) return;
      if (b.velocity.y <= 0) {
        second = false;
        return;
      }
      // Never on top of the controller's float for a still-rising first jump: that one's weightless (apex-float.ts).
      if (b.velocity.y < movement.jumpApexSpeed) b.force.y = airJumpApexForce(b.force.y, PLAYER_MASS * GRAVITY);
      const dx = me.wish.x * (me.sprint ? 9.5 : 5.6) - b.velocity.x;
      const dz = me.wish.z * (me.sprint ? 9.5 : 5.6) - b.velocity.z;
      const length = Math.hypot(dx, dz);
      if (length > 0.01) {
        const k = Math.min(1, ((movement.jumpSteer - 14) * FIXED) / length);
        b.velocity.x += dx * k;
        b.velocity.z += dz * k;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      offAccepted();
      for (const frame of frames.values()) frame.removeFromParent();
      frames.clear();
      root.removeFromParent();
      for (const geometry of geometries) geometry.dispose();
      material.dispose();
      teal.dispose();
      shaftMaterial.dispose();
    },
  };
  owner.cleanup(api.dispose);
  return api;
}
