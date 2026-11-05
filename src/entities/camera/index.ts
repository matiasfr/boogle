// The third-person camera: follows the player's body, kept out of solid things by its arm (src/player/camera-arm.ts), and
// takes the sky and the sun along. Moved here as it was; the state and view split comes later
// (docs/plans/entity-architecture.md, step 12). `cam` and `camConstraints` stay in src/player/.
import * as THREE from 'three/webgpu';
import { SEA, reducedMotion } from '../../constants.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { groundHeight } from '../../island/terrain.ts';
import { getMask } from '../../physics/engine.ts';
import { groundProbe } from '../../physics/physics.ts';
import { waterField } from '../../physics/water-field.ts';
import { makeCameraArm } from '../../player/camera-arm.ts';
import { cam, camConstraints, camForward, me } from '../../player/player.ts';
import { camera, sky, sun } from '../../render/scene.ts';
import { SUN_DIR } from '../../render/sun-dir.ts';

// After every visual sync, before the clouds (props.ts, -190) and the features.
defineKind('camera', { update: -200 });

const camPos = new THREE.Vector3(),
  camLook = new THREE.Vector3(),
  camFrom = new THREE.Vector3(),
  fwd = new THREE.Vector3();
const camArm = makeCameraArm();
// Plain loops and shared objects below: this runs every frame (npm run hitches).
function constrained(look: THREE.Vector3, pos: THREE.Vector3) {
  for (let k = 0; k < camConstraints.length; k++) if (camConstraints[k]!(look, pos)) return true;
  return false;
}
const ORIGIN = { x: 0, y: 0, z: 0 };
const camFloor = (x: number, z: number) => {
  if (!waterField.moving) return Math.max(groundHeight(x, z) + 0.45, me.swimming ? SEA - 3 : SEA + 0.3);
  const water = waterField.sampleAt('camera', { x, y: camPos.y, z });
  return Math.max(groundProbe.under(x, camPos.y, z) + 0.45, water.height + (me.swimming ? -3 : 0.3));
};
function updateCamera(elapsed: number) {
  if (!me.entered || !me.body) {
    const a = reducedMotion ? 0.9 : 0.9 + elapsed * 0.04;
    camera.position.set(Math.cos(a) * 66, 26, Math.sin(a) * 66);
    camera.lookAt(0, 3, 0);
  } else {
    const ip = me.body.interpolatedPosition;
    camForward(fwd);
    const rx = Math.cos(cam.yaw),
      rz = -Math.sin(cam.yaw);
    camLook.set(ip.x + rx * 0.55, ip.y + 1.35, ip.z + rz * 0.55);
    camPos.copy(camLook).addScaledVector(fwd, -cam.dist);
    if (!constrained(camLook, camPos)) {
      // Up over the ground first, so a slope lifts the camera instead of pulling it in; then the arm, out of whatever's
      // left in the way (a ridge, a wall). It collides with what you collide with: outside the caves, not their rock.
      camPos.y = Math.max(camPos.y, camFloor(camPos.x, camPos.z));
      camArm.solve(camFrom.set(ip.x, ip.y + 1.35, ip.z), camPos, getMask(me.body));
      camPos.y = Math.max(camPos.y, camFloor(camPos.x, camPos.z));
    } else camArm.reset();
    camera.position.copy(camPos);
    camera.lookAt(camLook.addScaledVector(fwd, 8));
  }
  sky.position.copy(camera.position);
  const focus = me.body ? me.body.interpolatedPosition : ORIGIN;
  sun.target.position.set(focus.x, focus.y, focus.z);
  sun.position.set(focus.x + SUN_DIR.x * 80, focus.y + SUN_DIR.y * 80, focus.z + SUN_DIR.z * 80);
}

spawn({ kind: 'camera', update: ({ elapsed }) => updateCamera(elapsed) });
