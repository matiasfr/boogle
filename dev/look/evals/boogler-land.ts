// driven by: node dev/bake-boogler-land.ts through the existing look broker. No custom browser launcher.
const { readBooglerLand } = (await import(
  '/dev/boogler-land-input.ts' as string
)) as typeof import('../../boogler-land-input.ts');
console.log('BOOGLER LAND ' + JSON.stringify(await readBooglerLand()));
export {};
