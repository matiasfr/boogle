// Setup for the saved-town motion/cost comparisons. Does not stage progression.
const { cam } = await import('/src/player/player.ts' as string);
const { bindings } = await import('/src/render/water/live.ts' as string);
const { setGraphics } = await import('/src/graphics-settings.ts' as string);
const { tool } = await import('/src/debug/dev/looks.ts' as string);
cam.yaw = 0;
cam.pitch = -0.22;
cam.dist = 5.2;
await setGraphics('resolution', 1);
await setGraphics('frameLimit', 'display');
await setGraphics('meter', false);
await tool.run('lock', { locked: true });
const variant = Number(new URLSearchParams(location.search).get('groundVariant') ?? 0);
const binding = bindings.get('ground.edges');
if (!binding) throw new Error('Ground comparison did not load');
binding.set(variant);
console.log('GROUND SETUP', JSON.stringify({ variant: binding.get(), distance: cam.dist, pitch: cam.pitch }));
export {};
