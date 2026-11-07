// Shared tools are accepted railway facts; meshes, reveals and the second jump are Local/Owner views.
// This leaf imports authored shapes/layout only, never Place's job, tech, ladder or coop owners.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { createRewardReveal } from '../../render/reward-reveal.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { GRAVITY, PLAYER_MASS, FIXED } from '../../constants.ts';
import { T1_CRATE_PARTS } from '../../render/t1-reward-parts.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { AXE_REWARD, JUMP_REWARD } from './reward-data.ts';
import { linePanels } from '../../sim/railway-line-layout.ts';

/** Stock units line one has closed after each count of laid rail pairs. */
const UNITS_LAID = [0];
for (const pair of linePanels()) UNITS_LAID.push(UNITS_LAID.at(-1)! + pair.stock);
/** Seconds the device's shaft flares when the jump is found. */
const FLARE_S = 3;

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
  const [layout, tech, land, spatial, shapes, axes, flat] = await Promise.all([
    import('../../proto/place/layout.ts'),
    import('../../proto/place/tech-layout.ts'),
    import('../../proto/place/land.ts'),
    import('../../proto/place/spatial-station.ts'),
    import('../../proto/place/part-geometry.ts'),
    import('../../proto/place/axe-models.ts'),
    import('../../proto/flat.ts'),
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
  const line = layout.LINKS[0]!;
  const frame = spatial.frameBesideLine(line.stations[2]!, line.line, line.dir);
  const chestAt = new THREE.Vector3(frame.x + frame.lx * 3.4, 0, frame.z + frame.lz * 3.4);
  chestAt.y = land.H(chestAt.x, chestAt.z) + 0.7;
  const stand = mesh(new THREE.BoxGeometry(2.2, 0.7, 2.2), flat.flat('#c3ae83'));
  stand.position.copy(chestAt).y -= 0.35;
  land.addStatic({ kind: 'box', hx: 1.1, hy: 0.35, hz: 1.1 }, stand.position, undefined, undefined, owner);
  const chest = mesh(shapes.merged(T1_CRATE_PARTS), material);
  chest.position.copy(chestAt);
  chest.visible = false;
  const chestTarget = chestAt.clone().add(new THREE.Vector3(0, 1.3, 0));

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
  let axeReveals = 0,
    jumpReveals = 0,
    jumps = 0;
  let charge = true,
    second = false,
    knew = false,
    flare = 0,
    disposed = false;
  // Only the finder gets the card (docs/brainstorms/coop-abilities.md, option E); everyone else's flourish is
  // ability-arrival.ts. The device's tall shaft flares for everyone, so far players see where it came from.
  const mine = (event: { pid: string }) => event.pid === adapter.inspect().pid;
  const offAccepted = adapter.onAccepted((event) => {
    if (event.accepted <= 0) return;
    if (event.op === 'rail.axe') {
      if (reveal.youGot({ key: 'axe', ...AXE_REWARD, model: properModel.clone(true), from: chestAt.clone() }))
        axeReveals++;
    }
    if (event.op === 'rail.jump') {
      flare = FLARE_S;
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
  const axeAvailable = () => {
    const s = adapter.inspect();
    return s.ready && !s.axe && s.activeStation === 2 && s.stations[2]?.stock === 40;
  };
  const api = {
    inspect: () => ({
      axeChest: { x: chestAt.x, y: chestAt.y, z: chestAt.z, available: axeAvailable() },
      jumpDevice: {
        x: deviceAt.x,
        y: deviceAt.y,
        z: deviceAt.z,
        available: adapter.inspect().ready && !adapter.inspect().jump,
      },
      axeReveals,
      jumpReveals,
      jumps,
      charge,
      second,
    }),
    targets(): Interactable[] {
      const s = adapter.inspect(),
        p = me.body?.position;
      if (!s.ready || !p) return [];
      const targets: Interactable[] = [];
      if (axeAvailable() && inReach(chestAt))
        targets.push({
          id: 'railway-axe-chest',
          verb: 'Open',
          at: chestTarget,
          r: 3.4,
          run: () => void adapter.openAxe(),
        });
      if (!s.jump && Math.hypot(p.x - deviceAt.x, p.z - deviceAt.z) <= 3 && Math.abs(p.y - deviceAt.y) <= 2.2)
        targets.push({
          id: 'railway-jump-device',
          verb: 'Take it',
          at: jumpTarget,
          run: () => void adapter.claimJump(),
        });
      return targets;
    },
    update(dt: number, now: number) {
      const state = adapter.inspect();
      // The sloping route sends the low laying gantry through this crossing. Join it only
      // after accepted construction and the local machine envelope have both passed.
      if (lip) {
        machineAt.set(0, 0, -Infinity);
        machineFrom?.(machineAt);
        lip.visible = tech.p1LipClear(UNITS_LAID[state.panelCount] ?? 0, machineAt.z);
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
      for (const object of [ring, ring2, core]) object.visible = !state.jump;
      // The flare: up fast, held, then gone with the device's glow.
      flare = Math.max(0, flare - dt);
      const k = flare > 0 ? Math.min(1, (FLARE_S - flare) / 0.25, flare / 1.2) : 0;
      shaft.visible = !state.jump || k > 0;
      shaft.scale.set(1 + 7 * k, 1, 1 + 7 * k);
      shaftMaterial.opacity = 0.1 + 0.8 * k;
      ring.rotation.z = now * 0.0007;
      ring2.rotation.y = now * 0.001;
      core.rotation.y = now * 0.0012;
    },
    /** Entity fixedPre order 42: the same post-controller second-jump seam as the approved prototype. */
    fixedPre() {
      const b = me.body;
      // An unlock that arrives in the air never adds a jump to that flight: the charge comes on landing.
      const unlocked = adapter.inspect().jump;
      if (unlocked && !knew && me.coyote <= 0) charge = false;
      knew = unlocked;
      if (!b || fallArrival.active || me.swimming || inputState.seated || inputState.held || me.down) {
        second = false;
        return;
      }
      if (me.coyote > 0) {
        if (b.velocity.y < 1.5) charge = true;
        second = false;
        return;
      }
      const movement = adapter.inspect();
      if (me.jumpQueued > 0 && movement.jump && charge) {
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
      }
      if (!second) return;
      if (b.velocity.y <= 0) {
        second = false;
        return;
      }
      if (b.velocity.y < movement.jumpApexSpeed) b.force.y += PLAYER_MASS * GRAVITY * 0.5;
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
