// Local return-pose queries need a physics step after each scenery reconstruction.
// A render frame (including a zero-delta first frame) is not that step.
export function createPoseReadiness(physicsTime: () => number) {
  let builtAt = physicsTime();
  return {
    rebuilt() {
      builtAt = physicsTime();
    },
    ready() {
      return physicsTime() > builtAt;
    },
  };
}
