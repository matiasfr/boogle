// Regression for the round-4 freeze: soft co-op reconciliation replaces the forge while a local rail is flying.
// Run through look --eval with proto=place&coop=1. No timing luck or second browser is needed.
const { forge, HAND_LOGS, snapForge, updateForge, resetForge } = (await import(
  '/src/proto/place/forge.ts' as string
)) as typeof import('../../../src/proto/place/forge.ts');
const { captureShared, applyShared } = (await import(
  '/src/proto/place/job.ts' as string
)) as typeof import('../../../src/proto/place/job.ts');
const { clearTrips, updatePieces } = (await import(
  '/src/place/pieces.ts' as string
)) as typeof import('../../../src/place/pieces.ts');
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { TUNE } = (await import(
  '/src/place/layout.ts' as string
)) as typeof import('../../../src/place/layout.ts');
const shared = captureShared();
const replace = (rails: number) => applyShared({ ...shared, forge: { logs: HAND_LOGS, crates: 0, rails, made: 30 } });
const check = (label: string, expected: number) => {
  const overflow: string[] = [];
  scene.traverse((o) => {
    const mesh = o as import('three/webgpu').InstancedMesh;
    if (mesh.isInstancedMesh && mesh.count > mesh.instanceMatrix.count)
      overflow.push(`${mesh.name || mesh.uuid}: ${mesh.count}/${mesh.instanceMatrix.count}`);
  });
  console.log(`FORGE ${label}: rails=${forge.rails}, expected=${expected}, overflow=${JSON.stringify(overflow)}`);
  if (forge.rails !== expected || overflow.length) throw new Error(`FORGE ${label} failed`);
};
clearTrips();
replace(23);
snapForge();
updateForge(TUNE.railEvery, () => {}); // reserve the last slot; the flight lasts 0.55 s
replace(24); // same applyShared path as coop.reconcile, without clearTrips
updatePieces(0.6); // the old flight must neither credit the new rack nor release a new reservation
check('full snapshot during flight', 24);

replace(23);
updateForge(TUNE.railEvery, () => {});
replace(0);
updateForge(TUNE.railEvery, () => {});
updatePieces(0.6);
check('old and new flights together', 1);
for (let k = 0; k < 60; k++) {
  updateForge(TUNE.railEvery, () => {});
  updatePieces(TUNE.railEvery);
}
updatePieces(1);
check('refill stops at capacity', 24);

replace(23);
updateForge(TUNE.railEvery, () => {});
resetForge();
updatePieces(0.6);
check('reset during flight', 0);

clearTrips();
replace(24);
snapForge();
console.log('FORGE regression passed');
export {};
