// The finished forge's walk-in reward. Local geometry/cutaway; no production, payment or freight state.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../../constants.ts';
import { getMask, type Body } from '../../physics/engine.ts';
import { makeCameraArm } from '../../player/camera-arm.ts';
import { camConstraints, me } from '../../player/player.ts';
import { camera, scene } from '../../render/scene.ts';
import { readableGlow } from '../../render/readable-unlit.ts';
import { flat } from '../../render/flat.ts';
import { draw, makeSet } from '../../render/boxes.ts';
import { ROOM_GROUP, staticBody } from '../../place/land.ts';
import { ROOM_CAM } from './rooms.ts';
import { kitMaterial } from '../railway/seat.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import { instantiate, workshopChair } from '../../prefab/instantiate.ts';
import { workshopKit } from './workshop-kit.ts';
import { fireboxParts, makeForgeFire } from './workshop-fire.ts';
import { merged } from '../../render/part-geometry.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Plan } from '../../place/building-plans.ts';
import type { DropSet } from '../../place/pieces.ts';

export const WORKSHOP_DOOR = { x: -2.9, w: 2.8, rows: 3 };
export function makeWorkshop(plan: Plan, set: DropSet, ready: () => boolean) {
  const { x, y, z } = plan;
  // Plan footprints include 0.8 m of foundation apron; walls sit on the authored building dimensions.
  const hw = plan.hw - 0.8,
    hd = plan.hd - 0.8;
  const floor = y + 0.5,
    high = 4.6;
  const door = WORKSHOP_DOOR;
  const g = new THREE.Group();
  g.position.set(x, floor, z);
  g.visible = false;
  scene.add(g);
  const solidSpecs: { x: number; y: number; z: number; w: number; h: number; d: number; room: boolean }[] = [];
  const box = (xx: number, yy: number, zz: number, w: number, h: number, d: number, color: string, solid = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(color));
    m.position.set(xx, yy, zz);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    if (solid) solidSpecs.push({ x: xx, y: yy, z: zz, w, h, d, room: false });
    return m;
  };
  // Two shallow steps over the existing foundation. They end to the left of the rack/output lane.
  box(door.x, -0.375, hd + 1.25, door.w, 0.25, 0.9, '#9e9686');
  box(door.x, -0.125, hd + 0.7, door.w, 0.25, 0.4, '#b6aa92');
  // Furnace remains on its existing output axis. A solid guard keeps visitors out of the rail flight.
  box(0, 0.6, hd - 1.65, 3.3, 1.2, 0.16, '#536567');
  box(-1.65, 0.6, hd - 0.85, 0.16, 1.2, 1.6, '#536567');
  box(1.65, 0.6, hd - 0.85, 0.16, 1.2, 1.6, '#536567');
  // The firebox: the same solid, drawn as brick round a real sooty recess with a hood and flue; the flames, coals,
  // sparks and light in it are the fire's own (workshop-fire.ts).
  solidSpecs.push({ x: 0, y: 1, z: hd - 0.85, w: 2.8, h: 1.8, d: 0.65, room: false });
  const firebox = new THREE.Mesh(merged(fireboxParts(hd - 0.85)), kitMaterial);
  firebox.castShadow = firebox.receiveShadow = true;
  g.add(firebox);
  const flames = makeForgeFire(g, hd - 0.85, g.position);
  const glass = readableGlow(
    new THREE.MeshStandardNodeMaterial({ color: '#7a310c', emissive: '#ff5a0a', emissiveIntensity: 0.8 }),
  );
  // Furnishing: one merged mesh (the floor, bench, anvil, logs, rails...) and one for the lanterns' glass.
  const kitOwner = createOwnedView();
  g.add(kitOwner.root);
  const kit = workshopKit(hw, hd, kitOwner);
  const furnishing = new THREE.Mesh(kit.geometry, kitMaterial);
  furnishing.castShadow = furnishing.receiveShadow = true;
  g.add(furnishing);
  const panes = new THREE.Mesh(
    mergeGeometries(kit.glass.map((p) => new THREE.BoxGeometry(0.22, 0.28, 0.22).translate(p.x, p.y, p.z)))!,
    glass,
  );
  g.add(panes);
  const chairIndex = solidSpecs.length;
  const chairOwner = createOwnedView();
  g.add(chairOwner.root);
  const chair = instantiate(workshopChair.prefab, workshopChair, { owner: chairOwner, gates: { open: ready } });
  const wall = (xx: number, yy: number, zz: number, w: number, h: number, d: number) =>
    solidSpecs.push({ x: xx, y: yy, z: zz, w, h, d, room: true });
  wall(0, high / 2 - 0.5, -hd, hw * 2 + 0.4, high, 0.4);
  wall(-hw, high / 2 - 0.5, 0, 0.4, high, hd * 2);
  wall(hw, high / 2 - 0.5, 0, 0.4, high, hd * 2);
  for (const side of [-1, 1]) {
    const edge = door.x + (side * door.w) / 2,
      width = hw - side * edge;
    wall(edge + (side * width) / 2, high / 2 - 0.5, hd, width, high, 0.4);
  }
  const doorTop = 0.5 + (door.rows * (high - 0.5)) / Math.round((high - 0.5) / 0.82);
  wall(door.x, (doorTop + high) / 2 - 0.5, hd, door.w, high - doorTop, 0.4);
  wall(0, high + 0.6, 0, hw * 2 + 0.4, 1.2, hd * 2 + 0.4);
  const proxy = makeSet(plan.pieces);
  proxy.mesh.material = new THREE.MeshBasicNodeMaterial({ colorWrite: false, depthWrite: false });
  draw(proxy, () => 1);
  proxy.mesh.visible = false;
  scene.add(proxy.mesh);
  const bodies: Body[] = [];
  const bodyOwner = createOwnedView();
  let wasReady = false,
    inside = false;
  const hidden = new Float32Array(plan.pieces.length);
  const arm = makeCameraArm(),
    from = new THREE.Vector3();
  const constraint = (_look: THREE.Vector3, pos: THREE.Vector3) => {
    if (!inside || !me.body) return false;
    const p = me.body.interpolatedPosition;
    pos.y = Math.max(pos.y, floor + 0.5);
    arm.solve(from.set(p.x, p.y + 1.35, p.z), pos, getMask(me.body) & ~ROOM_GROUP);
    return true;
  };
  camConstraints.push(constraint);
  return {
    /** Undo everything it added (the production forge's view ends; Place's forge lives for the page). */
    dispose() {
      kitOwner.dispose();
      chairOwner.dispose();
      flames.dispose();
      const i = camConstraints.indexOf(constraint);
      if (i >= 0) camConstraints.splice(i, 1);
      for (const b of bodies) bodyOwner.removeBody(b);
      bodyOwner.dispose();
      bodies.length = 0;
      scene.remove(g);
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      glass.dispose();
      proxy.mesh.removeFromParent();
      proxy.mesh.geometry.dispose();
      (proxy.mesh.material as THREE.Material).dispose();
    },
    snap() {
      hidden.fill(0);
    },
    update(dt: number) {
      const open = ready();
      if (open !== wasReady) {
        wasReady = open;
        g.visible = open;
        if (open)
          for (const [index, s] of solidSpecs.entries()) {
            // Keep today's body insertion order: furnishing, chair, then room walls.
            if (index === chairIndex) {
              kit.setEnabled(true);
              chair.setEnabled(true);
            }
            const body = staticBody(
              { kind: 'box', hx: s.w / 2, hy: s.h / 2, hz: s.d / 2 },
              { x: x + s.x, y: floor + s.y, z: z + s.z },
              undefined,
              s.room ? ROOM_GROUP : undefined,
            );
            bodyOwner.addBody(body);
            bodies.push(body);
          }
        else {
          kit.setEnabled(false);
          chair.setEnabled(false);
          for (const b of bodies) bodyOwner.removeBody(b);
          bodies.length = 0;
        }
      }
      const p = me.body?.interpolatedPosition;
      const inBounds = !!p && p.y < y + high && Math.abs(p.x - x) < hw && Math.abs(p.z - z) < hd + ROOM_CAM.enter;
      const atDoor = !!p && Math.abs(p.x - x - door.x) < door.w / 2 + 0.5 && p.z < z + hd + ROOM_CAM.enter;
      inside = open && inBounds && (inside || atDoor || p!.z < z + hd);
      flames.update(dt, open, inside);
      if (!open) {
        hidden.fill(0);
        proxy.mesh.visible = false;
        return;
      }
      const cx = camera.position.x - x,
        cz = camera.position.z - z;
      let any = false;
      plan.pieces.forEach((b, k) => {
        const roof = k >= plan.WALLS && k < plan.ROOFED;
        const bx = b.x - x,
          bz = b.z - z;
        const wall =
          k < plan.WALLS &&
          b.local.elements[13]! > 1.3 &&
          ((Math.abs(bx + hw) < 0.4 && cx < -hw + ROOM_CAM.nearWall) ||
            (Math.abs(bx - hw) < 0.4 && cx > hw - ROOM_CAM.nearWall) ||
            (Math.abs(bz + hd) < 0.4 && cz < -hd + ROOM_CAM.nearWall) ||
            (Math.abs(bz - hd) < 0.4 && cz > hd - ROOM_CAM.nearWall));
        const want = inside && (roof || wall);
        const t = Math.max(0, Math.min(1, hidden[k]! + (want ? 1 : -1) * (reducedMotion ? 1 : dt / ROOM_CAM.reveal)));
        if (t !== hidden[k]) {
          if (t === 1) set.snap(k, false);
          else set.lift(k, t * t * (roof ? 7 : -high));
          hidden[k] = t;
        }
        any ||= t > 0;
      });
      proxy.mesh.visible = any;
    },
  };
}
