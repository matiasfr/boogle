import * as THREE from 'three/webgpu';
import { float, instanceIndex, positionGeometry, positionLocal, sin, time, vec3 } from 'three/tsl';
import { createPool } from '../render/instances.ts';
import { patchNode } from '../render/material-patch.ts';
import { despawn, spawn, type GameEntity } from '../entity/entity.ts';
import { autoRung, graphicsInitial } from '../graphics-settings.ts';
import { onStart } from '../loop.ts';
import { me } from '../player/state.ts';
import { resident } from '../render/lod-level.ts';
import { lapSlots } from '../sim/railway-lap.ts';
import { RAIL_TRAINS } from '../sim/railway-lines.ts';

// Speeds are in m/s. Legacy thresholds in metres per frame are multiplied by 60 to preserve the 60 FPS response.
export function sampledSpeed(distance: number, dt: number) {
  return dt > 0 ? distance / dt : 0;
}

export function wildlifeEngineIds(line?: number) {
  const slots = line === undefined ? RAIL_TRAINS.keys() : lapSlots(line, true);
  const ids = Array.from(slots, (slot) => `railway:train${slot}-0`);
  return line === undefined ? ['railway:T1:loco', ...ids] : ids;
}

export function reducedWildlife() {
  const rung = graphicsInitial('detail', ['auto', 'full', 'sea', 'shadows', 'lowest'], 'auto');
  return rung === 'auto' ? autoRung() > 0 : rung !== 'full';
}

export function wings() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        0, 0.09, 0.34, -0.12, 0, -0.23, 0.12, 0, -0.23, 0, -0.07, 0.3, 0.12, 0, -0.23, -0.12, 0, -0.23, -0.08, 0.04,
        0.12, -0.78, 0.16, -0.13, -0.14, 0.02, -0.23, 0.08, 0.04, 0.12, 0.14, 0.02, -0.23, 0.78, 0.16, -0.13,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

export function wildlifePool(kind: 'school' | 'flock' | 'swarm', count: number, color: string, animated = true) {
  const aquatic = kind === 'school',
    bird = kind === 'flock';
  const material = new THREE.MeshStandardNodeMaterial({
    color,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const beat = sin(time.mul(bird ? 7 : aquatic ? 13 : 22).add(float(instanceIndex).mul(1.7)));
  if (animated)
    patchNode(material, 'positionNode', (prev) =>
      (prev ?? positionLocal).add(
        aquatic
          ? vec3(beat.mul(positionGeometry.z.min(0)).mul(0.28), 0, 0)
          : vec3(0, beat.mul(positionGeometry.x.abs()).mul(bird ? 0.32 : 0.18), 0),
      ),
    );
  const geometry = aquatic ? new THREE.ConeGeometry(0.12, 0.56, 5).rotateX(Math.PI / 2) : wings();
  return createPool(geometry, material, count);
}

export function wildlifeZone(
  kind: string,
  x: number,
  z: number,
  enter: number,
  leave: number,
  mount: () => GameEntity,
) {
  onStart(() => {
    let active: GameEntity | null = null;
    spawn({
      kind,
      update() {
        const p = me.body?.position;
        const near = p && resident(Math.hypot(p.x - x, p.z - z), !!active, enter, leave);
        if (near && !active) active = mount();
        else if (!near && active) {
          despawn(active);
          active = null;
        }
      },
    });
  });
}
