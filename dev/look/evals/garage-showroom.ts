// npm run look -- --eval dev/look/evals/garage-showroom.ts --until window.__garageDone --size 3840x2880 --name garage-sheet
// The engine garage mock's stills: mounts dev/look/garage-showroom.ts over the running game (see that file).
const { showroom } = (await import('/dev/look/garage-showroom.ts' as string)) as typeof import('../garage-showroom.ts');
await showroom();
export {};
