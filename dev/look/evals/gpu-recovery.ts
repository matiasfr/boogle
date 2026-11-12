// npm run look -- --real --warm 1 --hud --query 'gpuCase=hidden-loss' --action dev/look/evals/gpu-recovery.ts --name gpu-loss
// needs: a deliberate device loss (the file synthesises it from gpuCase); docs/research/gpu-recovery.md runs it through node .look/see-client.ts look
// Broker action regression: --real --hud --action dev/look/evals/gpu-recovery.ts
// gpuCase=hidden|loss|hidden-loss|error|sustained|recovered|burst|throw; gpuBaseline=1 records the old failure without assertions.
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
const marks: { name: string; data: import('../../../src/proto/mark.ts').PlayData | undefined }[] = [];
watchPlayMarks((name, data) => {
  if (!name.startsWith('graphics') && name !== 'gpu error') return;
  marks.push({ name, data });
  console.log('GPU mark ' + JSON.stringify({ name, data }));
});
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, why: string) {
  const deadline = performance.now() + 60000;
  while (!check()) {
    if (performance.now() > deadline) throw new Error(`GPU regression deadline: ${why}`);
    await wait(20);
  }
}
const room = window.boogle.net.room;
const url = location.href;
let calls = 0;
let inject = false;
let injectedDraws = 0;
let batches = 0;
const device = (renderer.backend as unknown as { device: GPUDevice }).device;
const invalidBuffer = () => device.createBuffer({ size: 4, usage: 0 });
const render = pipeline.render.bind(pipeline);
pipeline.render = () => {
  calls++;
  if (mode === 'throw') throw new Error('GPU regression: createCommandEncoder failed');
  render();
  if (inject) {
    injectedDraws++;
    invalidBuffer();
    // Several failures followed by a clean submission must recover, including two separated bursts.
    if (mode === 'recovered' && injectedDraws % 40 === 0) {
      inject = false;
      batches++;
    }
  }
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
  device.destroy();
  await device.lost;
} else if (mode === 'error' || mode === 'burst') {
  // Real WebGPU validation error, not a manufactured callback.
  for (let i = 0; i < (mode === 'burst' ? 80 : 1); i++) invalidBuffer();
} else if (mode === 'sustained' || mode === 'recovered') {
  inject = true;
}
if (!baseline && ['error', 'burst', 'sustained', 'recovered'].includes(mode)) {
  if (mode === 'sustained') {
    await until(() => marks.some((m) => m.name === 'graphics stopped'), 'sustained errors were not stopped');
  } else {
    await until(() => marks.some((m) => m.name === 'graphics recovered'), 'no clean GPU submission after errors');
    if (mode === 'recovered') {
      inject = true;
      await until(
        () => batches === 2 && marks.filter((m) => m.name === 'graphics recovered').length >= 2,
        'second burst did not recover',
      );
    }
    const resumed = calls;
    await until(() => calls > resumed + 12, 'render calls did not continue after recovery');
  }
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
  injectedDraws,
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
  if (['hidden', 'error', 'burst', 'recovered'].includes(mode)) {
    if (calls === before) throw new Error('Rendering did not resume');
    if (!document.getElementById('lobby')?.hidden || marks.some((m) => m.name === 'graphics stopped'))
      throw new Error('A recovered error showed the failure UI');
  } else if (calls !== before || button.textContent !== 'Reload' || button.disabled || !note?.includes('Reload')) {
    throw new Error('Failure did not stop frames and expose Reload');
  }
  if (mode.includes('loss') && !result.stopped) throw new Error('three device-loss guard was not preserved');
  if (mode === 'sustained') {
    const stop = marks.find((m) => m.name === 'graphics stopped');
    if (stop?.data?.cause !== 'persistent-gpu-error' || stop.data.failedDraws !== 60 || injectedDraws < 60)
      throw new Error('Stopped without 60 checked failing draw submissions');
  }
  if (mode === 'recovered' && injectedDraws !== 80) throw new Error('Did not test two 40-draw error bursts');
  console.log('GPU assertions passed');
  document.documentElement.dataset.gpuRecovery = 'passed';
}
export {};
