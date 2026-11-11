// Existing sprite factories under the old/new surface gains. Diagnostic placement, no production material patch.
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { label } = (await import(
  '/src/proto/place/label.ts' as string
)) as typeof import('../../../src/proto/place/label.ts');
const { makeLabel } = (await import(
  '/src/player/avatars.ts' as string
)) as typeof import('../../../src/player/avatars.ts');
const { installWarp } = (await import('/dev/look/warp.ts' as string)) as typeof import('../warp.ts');
const { captureShots } = (await import('/dev/look/shot-page.ts' as string)) as typeof import('../shot-page.ts');
const { paintNative } = (await import('/dev/look/sheet-render.ts' as string)) as typeof import('../sheet-render.ts');
const station = label(3, 1.5);
station.set('Station 1', 'logs 0/24');
station.sprite.position.set(903, 43, 20);
const name = makeLabel('Boogle');
name.position.set(903, 45, 20);
scene.add(station.sprite, name);
if (!window.__warp) installWarp();
await captureShots(
  {
    name: 'unlit',
    query: 'proto=place&dev=1',
    size: [innerWidth, innerHeight],
    cameras: [{ name: 'labels', cam: [903, 44, 26], look: [903, 44, 20], fov: 40 }],
    variants: [
      { name: 'gain16', look: 'current', values: { 'post.centre': 0.16 } },
      { name: 'gain12', look: 'current', values: { 'post.centre': 0.12 } },
    ],
  },
  paintNative,
);
export {};
