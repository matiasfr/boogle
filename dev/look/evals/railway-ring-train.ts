// R4b proof: wait (the warm-up's --until) for a line-2 train to be on the bents past the pier head, in the stretch the
// camera frames (world z -605 to -545, about u 173 to 233), then let the capture run. Look only.
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const w = window as unknown as { __trainOnBents?: boolean };
w.__trainOnBents = false;
const poll = () => {
  const trains = inspectRailway()?.line2View?.trains ?? [];
  w.__trainOnBents = trains.some((t) => t.line === 1 && t.cars.some((c) => c.z < -545 && c.z > -605));
  requestAnimationFrame(poll);
};
poll();
export {};
