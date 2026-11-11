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
const { readableUnlit, readableIntensity } = (await import(
  '/src/render/readable-unlit.ts' as string
)) as typeof import('../../../src/render/readable-unlit.ts');
const { label } = (await import(
  '/src/proto/place/label.ts' as string
)) as typeof import('../../../src/proto/place/label.ts');
const material = label(1, 1).sprite.material as unknown as import('three/webgpu').SpriteNodeMaterial;
const patched = material.colorNode;
if (readableUnlit(material).colorNode !== patched) throw new Error('Repeated readable patch doubled compensation');
material.dispose();
material.map?.dispose();
if (bindings.has('readable.referenceGain')) throw new Error('Independent readable gain survived');
await showWaterTuning(() => {});
const panel = document.querySelector<HTMLElement>('[data-water-panel]')!;
const section = panel.querySelector<HTMLDetailsElement>('[data-water-section="Post"]')!;
section.open = true;
const input = (key: string) => panel.querySelector<HTMLInputElement>(`input[type="number"][data-water-key="${key}"]`)!;
for (const [key, value] of [['post.centre', 0.18]] as const) {
  const field = input(key);
  if (!field) throw new Error('Missing visible control: ' + key);
  field.value = String(value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  if (bindings.get(key)?.get() !== value) throw new Error('Control did not reach shader binding: ' + key);
}
const saved = JSON.parse(localStorage.getItem('boogle.water-tuning.v1') ?? 'null');
if (saved?.changes?.['post.centre'] !== 0.18)
  throw new Error('Fixed exposure controls did not persist');
if (Math.abs(readableIntensity() * 0.18 - 1) > 1e-12)
  throw new Error('Reward compensation did not follow surface gain');
panel.querySelector<HTMLButtonElement>('[data-water-action="copy"]')!.click();
const copied = JSON.parse(panel.querySelector('textarea')!.value);
if (copied.changes['post.centre'] !== 0.18)
  throw new Error('Copy settings omitted fixed calibration');
console.log('EXPOSURE CONTROLS ' + JSON.stringify({ saved, snapshot: lookSnapshot() }));
panel.querySelector<HTMLButtonElement>('[data-water-group="Post"]')!.click();
if (input('post.centre').valueAsNumber !== 0.12)
  throw new Error('Post reset did not restore fixed calibration');
if (Math.abs(readableIntensity() * 0.12 - 1) > 1e-12) throw new Error('Reward compensation did not reset');
for (const [key, expected] of [
  ['sky.keyGain', 1.12],
  ['sky.fillGain', 3.2],
] as const) {
  const field = input(key);
  if (field.valueAsNumber !== expected || Number(field.max) < expected)
    throw new Error('Light control does not show its production default: ' + key);
  field.value = '1';
  field.dispatchEvent(new Event('input', { bubbles: true }));
}
panel.querySelector<HTMLButtonElement>('[data-water-group="Light fill"]')!.click();
if (bindings.get('sky.keyGain')!.get() !== 1.12 || bindings.get('sky.fillGain')!.get() !== 3.2)
  throw new Error('Light reset did not restore production defaults');
section.open = true;
section.scrollIntoView({ block: 'start' });
console.log('EXPOSURE CONTROLS reset passed');
export {};
