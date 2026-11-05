// Local geometry only: the stage and the equipped tool share these owned meshes.
import * as THREE from 'three/webgpu';
import { flat } from '../flat.ts';

export type AxeTier = 'starter' | 'proper' | 'multi' | 'proper-multi';
export function makeAxes() {
  const root = new THREE.Group();
  root.name = 'wear_axe';
  const axes = [false, true].map((proper) => {
    const length = proper ? 1.08 : 0.8;
    const width = proper ? 0.52 : 0.26;
    const height = proper ? 0.34 : 0.17;
    const group = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, length, 0.07), flat('#a9794c').clone());
    handle.name = 'axe-handle';
    handle.position.y = length * 0.44;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, height, width),
      flat(proper ? '#dfe4ec' : '#6b6f78', proper ? 0.25 : 0.7).clone(),
    );
    head.name = 'axe-head';
    head.position.set(0, length * 0.86, -width * 0.41);
    group.add(handle, head);
    if (proper) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.36, 0.06), flat('#f2b134', 0.4).clone());
      edge.position.set(0, length * 0.86, -width * 0.76);
      group.add(edge);
    }
    const pick = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, proper ? 0.42 : 0.3, 6).rotateX(-Math.PI / 2),
      flat('#8d929c', 0.5).clone(),
    );
    pick.name = 'axe-pick';
    pick.position.set(0, length * 0.86, proper ? 0.3 : 0.2);
    group.add(pick);
    group.traverse((o) => {
      o.castShadow = true;
    });
    root.add(group);
    return { group, pick, length, width };
  });
  const markers = Object.fromEntries(
    ['handle-start', 'handle-end', 'blade-contact', 'grip-left', 'grip-right'].map((name) => {
      const marker = new THREE.Object3D();
      marker.name = 'axe-' + name;
      root.add(marker);
      return [name, marker];
    }),
  );
  function setTier(tier: AxeTier) {
    const proper = tier === 'proper' || tier === 'proper-multi';
    axes[0]!.group.visible = !proper;
    axes[1]!.group.visible = proper;
    for (const a of axes) a.pick.visible = tier === 'multi' || tier === 'proper-multi';
    const { length, width } = axes[proper ? 1 : 0]!;
    markers['handle-start']!.position.set(0, -length * 0.06, 0);
    markers['handle-end']!.position.set(0, length * 0.94, 0);
    markers['blade-contact']!.position.set(0, length * 0.86, -width * 0.91);
    markers['grip-left']!.position.set(0, 0.23, 0);
    markers['grip-right']!.position.set(0, 0.04, 0);
  }
  setTier('starter');
  return { root, setTier };
}
