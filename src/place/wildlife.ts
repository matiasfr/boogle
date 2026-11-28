import * as THREE from 'three/webgpu';
import { despawn, spawn, type GameEntity } from '../entity/entity.ts';
import { autoRung, graphicsInitial } from '../graphics-settings.ts';
import { onStart } from '../loop.ts';
import { me } from '../player/state.ts';
import { resident } from '../render/lod-level.ts';

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
