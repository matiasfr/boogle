// Broker action regression: --real --hud --action dev/look/evals/gpu-recovery.ts
// gpuCase=hidden|loss|hidden-loss|error|throw; gpuBaseline=1 records the old failure without assertions.
// Visibility is a synthetic Page Visibility sequence, not OS suspension or Safari eviction.
const query = new URLSearchParams(location.search);
const mode = query.get('gpuCase') ?? 'hidden-loss';
const baseline = query.has('gpuBaseline');
const { renderer, pipeline } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { watchPlayMarks } = (await import(
  '/src/proto/mark.ts' as string
)) as typeof import('../../../src/proto/mark.ts');
const marks: { name: string; data: unknown }[] = [];
watchPlayMarks((name, data) => {
  if (!name.startsWith('graphics') && name !== 'gpu error') return;
  marks.push({ name, data });
  console.log('GPU mark ' + JSON.stringify({ name, data }));
});
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const room = window.boogle.net.room;
const url = location.href;
let calls = 0;
const render = pipeline.render.bind(pipeline);
pipeline.render = () => {
  calls++;
  if (mode === 'throw') throw new Error('GPU regression: createCommandEncoder failed');
  render();
};
const hidden = mode === 'hidden' || mode === 'hidden-loss';
function visibility(value: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  Object.defineProperty(document, 'hidden', { configurable: true, value: value === 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
}
if (hidden) visibility('hidden');
await wait(250);
const hiddenCalls = calls;
if (mode.includes('loss')) {
  // Exercise the real GPUDevice.lost promise; three intentionally ignores reason=destroyed.
  const device = (renderer.backend as unknown as { device: GPUDevice }).device;
  device.destroy();
  await device.lost;
} else if (mode === 'error') {
  const device = (renderer.backend as unknown as { device: GPUDevice }).device;
  // Real WebGPU validation error, not a manufactured callback.
  device.createBuffer({ size: 4, usage: 0 });
}
await wait(250);
if (hidden) {
  visibility('visible');
  delete (document as unknown as Record<string, unknown>).visibilityState;
  delete (document as unknown as Record<string, unknown>).hidden;
}
await wait(500);
const before = calls;
await wait(250);
const note = document.getElementById('lobby-sub')?.textContent;
const button = document.getElementById('enter') as HTMLButtonElement;
const result = {
  mode,
  hiddenCalls,
  callsAfterFault: calls - before,
  note,
  button: button.textContent,
  disabled: button.disabled,
  sameRoom: window.boogle.net.room === room,
  sameUrl: location.href === url,
  stopped: (renderer as unknown as { _isDeviceLost: boolean })._isDeviceLost,
  marks,
};
console.log('GPU result ' + JSON.stringify(result));
if (!baseline) {
  if (hidden && hiddenCalls !== 0) throw new Error('Rendering continued while hidden');
  if (!result.sameRoom || !result.sameUrl) throw new Error('Recovery changed the room or navigated');
  if (mode === 'hidden') {
    if (calls === before) throw new Error('Rendering did not resume');
  } else if (calls !== before || button.textContent !== 'Reload' || button.disabled || !note?.includes('Reload')) {
    throw new Error('Failure did not stop frames and expose Reload');
  }
  if (mode.includes('loss') && !result.stopped) throw new Error('three device-loss guard was not preserved');
  console.log('GPU assertions passed');
  document.documentElement.dataset.gpuRecovery = 'passed';
}
export {};
