// Exercise the existing panel's real inputs, persistence, copy and reset before leaving it open for inspection.
const { showWaterTuning } = (await import(
  '/src/debug/water-tuning.ts' as string
)) as typeof import('../../../src/debug/water-tuning.ts');
const { bindings } = (await import(
  '/src/render/water/live.ts' as string
)) as typeof import('../../../src/render/water/live.ts');
const { lookSnapshot } = (await import(
  '/src/render/water/looks.ts' as string
)) as typeof import('../../../src/render/water/looks.ts');
await showWaterTuning(() => {});
const panel = document.querySelector<HTMLElement>('[data-water-panel]')!;
const section = panel.querySelector<HTMLDetailsElement>('[data-water-section="Post"]')!;
section.open = true;
const input = (key: string) => panel.querySelector<HTMLInputElement>(`input[type="number"][data-water-key="${key}"]`)!;
for (const [key, value] of [
  ['post.centre', 0.18],
  ['post.underwaterEV', 0.8],
] as const) {
  const field = input(key);
  if (!field) throw new Error('Missing visible control: ' + key);
  field.value = String(value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  if (bindings.get(key)?.get() !== value) throw new Error('Control did not reach shader binding: ' + key);
}
const saved = JSON.parse(localStorage.getItem('boogle.water-tuning.v1') ?? 'null');
if (saved?.changes?.['post.centre'] !== 0.18 || saved?.changes?.['post.underwaterEV'] !== 0.8)
  throw new Error('Fixed exposure controls did not persist');
panel.querySelector<HTMLButtonElement>('[data-water-action="copy"]')!.click();
const copied = JSON.parse(panel.querySelector('textarea')!.value);
if (copied.changes['post.centre'] !== 0.18 || copied.changes['post.underwaterEV'] !== 0.8)
  throw new Error('Copy settings omitted fixed calibration');
console.log('EXPOSURE CONTROLS ' + JSON.stringify({ saved, snapshot: lookSnapshot() }));
panel.querySelector<HTMLButtonElement>('[data-water-group="Post"]')!.click();
if (input('post.centre').valueAsNumber !== 0.12 || input('post.underwaterEV').valueAsNumber !== 1.22)
  throw new Error('Post reset did not restore fixed calibration');
section.open = true;
section.scrollIntoView({ block: 'start' });
console.log('EXPOSURE CONTROLS reset passed');
export {};
