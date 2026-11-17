import type * as THREE from 'three/webgpu';
/** The same quarter-second travel lowers at rest and folds up as departure begins. */
export const coachStepAmount = (standingSeconds: number) => Math.min(1, Math.max(0, standingSeconds / 0.25));
export function poseCoachSteps(steps: readonly THREE.Object3D[], side: number, amount: number) {
  for (const step of steps) step.rotation.z = step.userData.side === side ? (-side * Math.PI * amount) / 2 : 0;
}
