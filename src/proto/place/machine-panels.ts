// Local rigid transforms only. Both the live machine and asset stage use this choreography.
import * as THREE from 'three/webgpu';
import { material } from '../../render/materials.ts';
import { merged } from './part-geometry.ts';
import { panelEase, panelPose } from './track-panels.ts';

export const PANEL_BEAM_Y = 4;
export const PANEL_STACK_X = 3.4;
export const panelSlot = (n: number, out: THREE.Vector3) =>
  out.set(n % 2 ? PANEL_STACK_X : -PANEL_STACK_X, 0.6 + Math.floor(n / 2) * 0.09, 0);

/** Stored panels share one 36-triangle slab/rail silhouette. The carried track stays detailed. */
export function panelMagazine(capacity: number) {
  const geometry = merged([
    ['b', 0, 0, 0, 2.3, 0.04, 1, '#c98a3e'],
    ['b', -0.5, 0.04, 0, 0.1, 0.04, 1, '#4c5058'],
    ['b', 0.5, 0.04, 0, 0.1, 0.04, 1, '#4c5058'],
  ]);
  const mat = material('paintedToy', { normals: 'authored' }).clone();
  mat.color.set('#ffffff');
  mat.vertexColors = true;
  const mesh = new THREE.InstancedMesh(geometry, mat, capacity);
  mesh.name = 'panel-magazine';
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.count = 0;
  return mesh;
}

export function panelMechanism(parent: THREE.Object3D) {
  const root = new THREE.Group();
  root.name = 'panel-mechanism';
  parent.add(root);
  const beam = new THREE.Group(),
    trolley = new THREE.Group();
  const sleeves = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  const jaws = [new THREE.Group(), new THREE.Group()];
  beam.name = 'panel-beam-pivot';
  trolley.name = 'panel-trolley-slide';
  root.add(beam, trolley);
  trolley.add(sleeves[0]!);
  sleeves[0]!.add(sleeves[1]!);
  sleeves[1]!.add(sleeves[2]!);
  sleeves[2]!.add(...jaws);
  sleeves.forEach((s, i) => (s.name = `panel-hoist-${i}-slide`));
  jaws.forEach((s, i) => (s.name = `panel-jaw-${i}-slide`));
  const payload = new THREE.Object3D();
  payload.name = 'panel-payload-frame';
  root.add(payload);
  const batches: { mesh: THREE.InstancedMesh; pivots: THREE.Object3D[]; local: THREE.Matrix4[] }[] = [];
  const inverse = new THREE.Matrix4(),
    matrix = new THREE.Matrix4();
  const updateBatches = () => {
    inverse.copy(root.matrixWorld).invert();
    for (const { mesh, pivots, local } of batches) {
      pivots.forEach((pivot, i) => {
        matrix.multiplyMatrices(inverse, pivot.matrixWorld).multiply(local[i]!);
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  const stock = new THREE.Vector3(),
    aim = new THREE.Vector3(),
    last = new THREE.Vector3(),
    beamEnd = new THREE.Vector3();
  let lastYaw = 0,
    lastStockX = PANEL_STACK_X,
    initialized = false,
    hasContact = false;
  return {
    root,
    beam,
    trolley,
    sleeves,
    jaws,
    payload,
    install(parts: Map<string, THREE.Object3D>) {
      const attach = (name: string, to: THREE.Object3D) => {
        const part = parts.get(name);
        if (part) to.add(part);
      };
      attach('lay_gantry_beam', beam);
      attach('lay_paint_trolley', trolley);
      const instance = (name: string, pivots: THREE.Object3D[], local: THREE.Matrix4[]) => {
        const source = parts.get(name);
        if (!(source instanceof THREE.Mesh)) return;
        source.updateMatrix();
        // Retain GLB decode transforms. Only the fixed section width differs between sleeves;
        // motion still comes from three independent slides, never animated scaling.
        for (const transform of local) transform.multiply(source.matrix);
        const mesh = new THREE.InstancedMesh(source.geometry, source.material, pivots.length);
        mesh.name = `${name}-instances`;
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        root.add(mesh);
        batches.push({ mesh, pivots, local });
      };
      instance(
        'lay_cream_upper',
        sleeves,
        [1, 0.25 / 0.32, 0.18 / 0.32].map((width) => new THREE.Matrix4().makeScale(width, 1, width)),
      );
      instance('lay_iron_left', jaws, [new THREE.Matrix4(), new THREE.Matrix4().makeRotationY(Math.PI)]);
      root.updateWorldMatrix(true, true);
      updateBatches();
    },
    /** Target is the exact bed panel frame expressed in this rigid body frame. */
    pose(phase: number, n: number, target: THREE.Vector3, yaw: number, finalReturn = false) {
      const p = panelPose(phase);
      panelSlot(Math.max(0, n - 1), stock);
      if (!initialized) {
        last.copy(stock).setY(3.5);
        lastStockX = stock.x;
        initialized = true;
      }
      let y: number, open: number;
      if (finalReturn || p.returning) {
        const t = finalReturn ? panelEase(phase) : p.returnT;
        aim.lerpVectors(last, stock, t);
        y = THREE.MathUtils.lerp(last.y + 0.25, 3.75, panelEase(t * 2));
        open = 0.24;
      } else {
        aim.lerpVectors(stock, target, p.carry);
        const startY = stock.y + 0.25;
        y =
          phase < 0.36
            ? THREE.MathUtils.lerp(3.75, startY, p.drop)
            : phase < 0.8
              ? THREE.MathUtils.lerp(startY, 3.75, p.lift)
              : THREE.MathUtils.lerp(3.75, target.y + 0.25, panelEase((phase - 0.8) / 0.2));
        open = 0.24 * (1 - p.grip);
      }
      const returning = finalReturn || p.returning;
      const returnT = finalReturn ? panelEase(phase) : p.returnT;
      const baseX = returning ? THREE.MathUtils.lerp(lastStockX, stock.x, returnT) : stock.x;
      // The empty beam slides across the header while its trolley comes home.
      beamEnd.copy(target);
      // Before the first contact there is no panel target. Aim along the track instead of
      // through the local origin, which turns the 14 m boom sideways into the camp buildings.
      if (!hasContact && target.lengthSq() < 1e-8) beamEnd.set(baseX, 0, 14);
      if (returning && hasContact) beamEnd.lerpVectors(last, target, returnT);
      const dx = beamEnd.x - baseX,
        dz = beamEnd.z - stock.z;
      beam.position.set(baseX, PANEL_BEAM_Y, stock.z);
      beam.rotation.y = Math.atan2(dx, dz);
      if (returning) {
        // Keep the trolley on the beam throughout its return, including the cross-slide.
        const home = hasContact ? 1 - returnT : 0;
        aim.set(baseX + dx * home, aim.y, stock.z + dz * home);
      }
      trolley.position.set(aim.x, PANEL_BEAM_Y, aim.z);
      trolley.rotation.y =
        p.returning || finalReturn ? lastYaw * (1 - (finalReturn ? phase : p.returnT)) : yaw * p.carry;
      const extension = (PANEL_BEAM_Y - y) / 3;
      for (const sleeve of sleeves) sleeve.position.y = -extension;
      jaws[0]!.position.x = -open;
      jaws[1]!.position.x = open;
      payload.position.copy(p.picked && !finalReturn ? aim : stock);
      payload.position.y = p.picked && !finalReturn ? y - 0.25 : stock.y;
      payload.rotation.y = p.picked && !finalReturn ? yaw * p.carry : 0;
      if (phase >= 0.98 && !finalReturn) {
        last.copy(target);
        lastYaw = yaw;
        lastStockX = stock.x;
        hasContact = true;
      }
      root.updateWorldMatrix(true, true);
      updateBatches();
      return payload.matrixWorld;
    },
  };
}
