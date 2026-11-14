// The Boogler's statue on the town green: his own proportions (src/boogler/shape.ts) frozen in one pose and one
// stone grey, on a stepped round plinth. One merged mesh, so one draw. Static: no rig, no face texture, no frame work.
// The record (content/prefabs/town.ts, `town.statue`) gives the scale, the plinth's steps and the colour; its origin
// is the plinth's foot and the statue faces local +z, the way a building's door does.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BOOGLER_SHAPE } from '../../boogler/shape.ts';
import { material } from '../../render/materials.ts';
import { registerBuilder } from '../builders.ts';
import type { JsonObject } from '../types.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'town.boogler-statue': true;
  }
}

const { body, hand, foot, hat, face } = BOOGLER_SHAPE;
/** The pose: his left hand lifted in a wave beside his head, his hat tipped a little toward it. */
const POSE = { wave: { x: 0.76, y: 0.54, z: -0.08 }, hatLean: 0.07 };
/** How far the carved eyes and smile stand out of the body, at his own size. */
const RELIEF = 0.03;

/** A point on his body's surface from the face's coordinates (shape.ts: metres from the face's centre, y down). */
function onFace(x: number, y: number, out = 0) {
  const lon = x / body.r,
    lat = -y / body.halfHeight,
    r = body.r + out;
  return new THREE.Vector3(
    r * Math.cos(lat) * Math.sin(lon),
    body.y + (body.halfHeight + out) * Math.sin(lat),
    -r * Math.cos(lat) * Math.cos(lon),
  );
}

function figure() {
  const parts: THREE.BufferGeometry[] = [];
  const ball = (r: number, at: THREE.Vector3Like, scale: readonly number[] = [1, 1, 1], w = 12, h = 8) =>
    parts.push(new THREE.SphereGeometry(r, w, h).scale(scale[0]!, scale[1]!, scale[2]!).translate(at.x, at.y, at.z));
  ball(1, { x: 0, y: body.y, z: 0 }, [body.r, body.halfHeight, body.r], 24, 12);
  ball(hand.r, { x: -hand.x, y: hand.y, z: hand.z });
  ball(hand.r, POSE.wave);
  for (const sx of [-1, 1]) ball(foot.r, { x: sx * foot.x, y: foot.y, z: foot.z }, foot.scale);
  // The hat, on the top of his head, tipped about the middle of its brim.
  const crownH = hat.high - hat.brimH;
  const hatParts = mergeGeometries([
    new THREE.CylinderGeometry(hat.brimR, hat.brimR, hat.brimH, 16).translate(0, hat.brimH / 2, 0),
    new THREE.CylinderGeometry(hat.crownR * hat.flare, hat.crownR, crownH, 12).translate(0, hat.brimH + crownH / 2, 0),
  ]);
  parts.push(hatParts.rotateZ(-POSE.hatLean).translate(0, body.y + body.halfHeight - hat.sink, 0));
  // The face, carved proud of the stone: two eyes and the smile, where his texture draws them.
  for (const sx of [-1, 1]) {
    const at = onFace(sx * face.eye.x, face.eye.y);
    ball(1, at, [face.eye.rx, face.eye.ry * 0.9, RELIEF], 10, 6);
  }
  const { smile } = face,
    steps = 8;
  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: steps + 1 }, (_, i) => {
      const a = smile.from + ((smile.to - smile.from) * i) / steps;
      return onFace(smile.r * Math.cos(a), smile.y + smile.r * Math.sin(a), RELIEF * 0.2);
    }),
  );
  parts.push(new THREE.TubeGeometry(curve, steps, RELIEF * 0.6, 5, false));
  // Tube and sphere geometries disagree on indexing details only by attribute set: all carry position, normal, uv.
  return mergeGeometries(parts);
}

export function booglerStatue(p: JsonObject) {
  const { colour, scale, plinth } = p;
  if (
    typeof colour !== 'string' ||
    !colour.startsWith('#') ||
    typeof scale !== 'number' ||
    !Array.isArray(plinth) ||
    !plinth.length
  )
    throw new Error('town.boogler-statue: expected colour, scale and plinth steps');
  const parts: THREE.BufferGeometry[] = [];
  let top = 0;
  for (const step of plinth) {
    if (!Array.isArray(step) || typeof step[0] !== 'number' || typeof step[1] !== 'number')
      throw new Error('town.boogler-statue: a plinth step is [radius, height]');
    parts.push(new THREE.CylinderGeometry(step[0], step[0], step[1], 16).translate(0, top + step[1] / 2, 0));
    top += step[1];
  }
  // He faces -z at his own size; the statue faces +z.
  parts.push(figure().scale(scale, scale, scale).rotateY(Math.PI).translate(0, top, 0));
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geometry, material('stone', { colour: colour as `#${string}` }));
  mesh.name = 'town:boogler-statue';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { object: mesh, dispose: () => geometry.dispose() };
}
registerBuilder('town.boogler-statue', booglerStatue);
