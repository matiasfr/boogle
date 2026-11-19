// The first bought house's dressing (docs/brainstorms/first-house-resident.md, step 2): a warm lamp in its front
// window, on once the room is up, so a lit window says someone's home before you reach the door. A pane, not a light:
// it reads by day as well as at dusk and costs no light in the scene. On the room's `over` group, which rooms.ts shows
// only once the building's done and the camera's within its dressing radius, and which goes with the roof when you're
// in: the front wall it sits on sinks then. Local.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROOM_FLOOR } from '../../place/layout.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import type { Room } from './rooms.ts';

/** The house kit's front windows (building-plans.ts `housePlan`): centred `w * 0.27` either side of the door, their
 * sill 42% of the way up the wall, 1.1 m wide, 1 m tall and 0.14 m thick, standing 0.04 m proud of the wall line. The
 * lamp's in the one on the room's +x side, where his table goes. */
const WINDOW = { across: 0.27, up: 0.42, tall: 1, w: 0.96, h: 0.86, proud: 0.04, half: 0.07 };
/** Linear, over 1: the path lamps' warm glow (src/entities/railway/path.ts), a touch softer, behind glass. */
const LAMP = new THREE.Color(2.4, 1.6, 0.6);

export function createFirstHouseLamp(room: Room) {
  const y = (room.high - ROOM_FLOOR) * WINDOW.up + WINDOW.tall / 2,
    x = room.w * WINDOW.across,
    front = room.d / 2 + WINDOW.proud;
  // One face out over the window's glass, one in, a hair off each side of it.
  const out = new THREE.PlaneGeometry(WINDOW.w, WINDOW.h).translate(x, y, front + WINDOW.half + 0.005);
  const inner = new THREE.PlaneGeometry(WINDOW.w, WINDOW.h).rotateY(Math.PI).translate(x, y, room.d / 2 - 0.095);
  const lamp = new THREE.Mesh(
    mergeGeometries([out, inner]),
    readableUnlit(new THREE.MeshBasicNodeMaterial({ color: LAMP })),
  );
  lamp.name = 'town:first-house-lamp';
  room.over.add(lamp);
  return lamp;
}
