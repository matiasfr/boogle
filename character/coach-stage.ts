// Actual built GLB with its quantization transforms retained; only the diagnostic stop clock is synthetic.
import * as THREE from 'three/webgpu';
import { coachStepAmount, poseCoachSteps } from '../src/entities/railway/coach-motion.ts';
export const COACH_REVIEW_SECONDS = 4;
export function coachStage(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      meshes.push(o);
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        if (material instanceof THREE.MeshStandardNodeMaterial) {
          material.roughness = 0.85;
          material.metalness = 0;
          material.vertexColors = true;
        }
      }
    }
  });
  const steps = meshes
    .filter((m) => m.name.startsWith('coach_step_'))
    .map((mesh) => {
      const hinge = new THREE.Group();
      hinge.name = mesh.name + '_hinge';
      hinge.position.fromArray(mesh.userData.hinge as number[]);
      hinge.userData.side = mesh.userData.side;
      group.add(hinge);
      hinge.updateWorldMatrix(true, false);
      hinge.attach(mesh);
      return hinge;
    });
  return (time: number) => {
    const t = time % COACH_REVIEW_SECONDS;
    // Two labelled stand/depart examples, one platform on either side. No claim about train dwell timing.
    const phase = t % 2;
    poseCoachSteps(steps, t < 2 ? -1 : 1, coachStepAmount(Math.min(phase - 0.5, 1.75 - phase)));
  };
}
