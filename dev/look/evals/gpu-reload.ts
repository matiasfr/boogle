// Broker look action: exercise the actual Reload button in a disposable same-origin room.
// Reuses the GPU loss action and an accepted gift edit; no second browser harness. Gift edits are classic lockstep
// ops, which only a classic-registry room accepts (the current game's server refuses them): hence the Place entry.
const frame = document.createElement('iframe');
frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647';
const room = `gpu-reload-${Date.now().toString(36)}`;
frame.src = `/?proto=place&sw=0&room=${room}&gpuCase=hidden-loss`;
document.body.append(frame);
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, label: string) {
  const end = performance.now() + 90000;
  while (!check()) {
    if (performance.now() > end) throw new Error(`GPU reload: ${label}`);
    await wait(100);
  }
}
const ready = () => {
  const child = frame.contentWindow;
  return !!(
    child?.performance.getEntriesByName('boot:interactive').length &&
    child.boogle?.me.entered &&
    child.boogle.net.state === 'live' &&
    child.boogle.sync.worldStatus().ready
  );
};
await until(ready, 'child did not enter a live room');
const child = frame.contentWindow!;
type Gift = { id: number; src: number; i: number; j: number };
const gifts = () => frame.contentWindow!.boogle.gifts as { items: Gift[]; nextId: number };
const nextId = gifts().nextId;
const item = () => gifts().items.find((g) => g.id >= nextId && g.src === 0 && g.i === 230 && g.j === 205);
if (!child.boogle.sync.submitEdit({ op: 'gift.toss', i: 230, j: 205, k: 1, y: -1, n: 7, l: [0, 100, 0, 0, 0, 0] }))
  throw new Error('GPU reload: edit was not queued');
await until(() => !!item(), 'server did not apply the gift');
const id = item()!.id;
const beforeUrl = child.location.href;
const oldDocument = child.document;
await new Promise<void>((resolve, reject) => {
  const script = child.document.createElement('script');
  script.type = 'module';
  script.src = '/dev/look/evals/gpu-recovery.ts';
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('GPU recovery action failed to load'));
  child.document.body.append(script);
});
await until(() => child.document.documentElement.dataset.gpuRecovery === 'passed', 'loss assertions did not finish');
const reload = child.document.getElementById('enter') as HTMLButtonElement;
if (reload.textContent !== 'Reload' || reload.disabled) throw new Error('GPU reload: no usable Reload button');
console.log('GPU reload clicking ' + JSON.stringify({ room, gift: id }));
reload.click();
await until(() => frame.contentDocument !== oldDocument && ready(), 'reload did not rejoin');
await until(() => item()?.id === id, 'accepted gift disappeared after reload');
if (frame.contentWindow!.location.href !== beforeUrl) throw new Error('GPU reload changed the URL');
console.log('GPU reload assertions passed ' + JSON.stringify({ room, giftBefore: id, giftAfter: item()!.id }));
export {};
