// Local geometry only: the stage and the equipped tool share these owned meshes.
import * as THREE from 'three/webgpu';
import { flat } from '../flat.ts';

export type AxeTier = 'starter' | 'proper' | 'multi' | 'proper-multi';
const isProper = (tier: AxeTier) => tier === 'proper' || tier === 'proper-multi';
const hasPick = (tier: AxeTier) => tier === 'multi' || tier === 'proper-multi';

/** Metres, +Y along the shaft, blade toward -Z; owned geometry and preset clones. */
function buildAxe(proper: boolean) {
  const length = proper ? 0.8 : 0.64;
  const width = proper ? 0.36 : 0.25;
  const height = proper ? 0.24 : 0.18;
  const thickness = proper ? 0.1 : 0.085;
  const front = width * 0.82,
    back = width * 0.18,
    bevel = 0.008;
  const group = new THREE.Group();
  group.name = proper ? 'axe-proper' : 'axe-starter';
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, length, 0.07), flat('#a9794c').clone());
  handle.name = 'axe-handle';
  handle.position.y = length * 0.44;
  // A broad flared cheek, small bevels and a metal eye seat the head around the shaft.
  const profile = new THREE.Shape();
  profile.moveTo(-back, -height * 0.33);
  profile.lineTo(width * 0.28, -height * 0.33);
  profile.lineTo(front, -height * 0.5);
  profile.lineTo(front, height * 0.5);
  profile.lineTo(width * 0.28, height * 0.33);
  profile.lineTo(-back, height * 0.33);
  profile.closePath();
  const head = new THREE.Mesh(
    new THREE.ExtrudeGeometry(profile, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 1,
      steps: 1,
    })
      .translate(0, 0, -thickness / 2)
      .rotateY(Math.PI / 2),
    flat(proper ? '#dfe4ec' : '#6b6f78', proper ? 0.25 : 0.7).clone(),
  );
  head.name = 'axe-head';
  head.position.y = length * 0.86;
  head.geometry.computeBoundingBox();
  let cuttingFront = -head.geometry.boundingBox!.min.z,
    cuttingTop = length * 0.86 + head.geometry.boundingBox!.max.y;
  const collar = new THREE.Mesh(
    new THREE.BoxGeometry(thickness + 0.025, height * 0.72, 0.13),
    flat(proper ? '#a9b5c3' : '#565e69', 0.45).clone(),
  );
  collar.name = 'axe-eye';
  collar.position.y = length * 0.86;
  group.add(handle, head, collar);
  if (proper) {
    const edgeHeight = height + 0.02;
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(thickness + 0.018, edgeHeight, 0.025),
      flat('#f2b134', 0.4).clone(),
    );
    edge.name = 'axe-edge';
    edge.position.set(0, length * 0.86, -front - 0.01);
    group.add(edge);
    cuttingFront = front + 0.01 + 0.025 / 2;
    cuttingTop = length * 0.86 + edgeHeight / 2;
  }
  const pickLength = proper ? 0.25 : 0.19;
  const pick = new THREE.Mesh(
    new THREE.ConeGeometry(proper ? 0.06 : 0.05, pickLength, 6).rotateX(Math.PI / 2),
    flat('#8d929c', 0.5).clone(),
  );
  pick.name = 'axe-pick';
  // +Z tip; its broad base overlaps the back of the cheek instead of pointing into it.
  pick.position.set(0, length * 0.86, back - 0.025 + pickLength / 2);
  group.add(pick);
  group.traverse((o) => {
    o.castShadow = true;
  });
  return { group, pick, length, front: cuttingFront, leadingY: cuttingTop };
}

/** One actual tool for reward displays, without a hidden second tier affecting their bounds. */
export function makeAxeModel(tier: AxeTier) {
  const axe = buildAxe(isProper(tier));
  if (!hasPick(tier)) {
    axe.pick.removeFromParent();
    axe.pick.geometry.dispose();
    axe.pick.material.dispose();
  }
  return axe.group;
}
export function makeAxes() {
  const root = new THREE.Group();
  root.name = 'wear_axe';
  const axes = [buildAxe(false), buildAxe(true)];
  root.add(...axes.map((axe) => axe.group));
  const markers = Object.fromEntries(
    ['handle-start', 'handle-end', 'blade-contact', 'grip-left', 'grip-right'].map((name) => {
      const marker = new THREE.Object3D();
      marker.name = 'axe-' + name;
      root.add(marker);
      return [name, marker];
    }),
  );
  function setTier(tier: AxeTier) {
    const proper = isProper(tier);
    axes[0]!.group.visible = !proper;
    axes[1]!.group.visible = proper;
    for (const a of axes) a.pick.visible = hasPick(tier);
    const { length, front, leadingY } = axes[proper ? 1 : 0]!;
    markers['handle-start']!.position.set(0, -length * 0.06, 0);
    markers['handle-end']!.position.set(0, length * 0.94, 0);
    markers['blade-contact']!.position.set(0, leadingY, -front);
    markers['grip-left']!.position.set(0, 0.18, 0);
    markers['grip-right']!.position.set(0, 0.03, 0);
  }
  setTier('starter');
  return { root, setTier };
}
