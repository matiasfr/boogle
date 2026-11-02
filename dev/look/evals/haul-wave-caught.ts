// The wave catches you on the sandbar with a load: the crest arrives 1.5 s in, you tumble, half your logs fly up the
// beach and settle as piles (src/proto/haul/wave.ts):
// BOOGLE_QUERY='proto=haul&v=wave' npm run look -- --eval dev/look/evals/haul-wave-caught.ts --cam 22,7,48 --look 2,0.5,62 --warm 0.2 --seconds 6 --frames 12
const H = (await import('/dev/look/evals/haul-pilot.ts' as string)) as typeof import('./haul-pilot.ts');
const win = window as unknown as { __wave?: { phase: { phase: string }; caught: number; next: (s: number) => void } };
const { rules } = (await import(
  '/src/world/game-world.ts' as string
)) as typeof import('../../../src/world/game-world.ts');
await H.fill(24);
H.stand(3, 67.5, 0, 0.6); // on the sandbar
for (let k = 0; k < 50 && !win.__wave; k++) await new Promise((r) => setTimeout(r, 100));
H.overlay(() => {
  const piles = rules.piles.piles.list.reduce((t: number, p: { n: number }) => t + p.n, 0);
  return `${win.__wave!.phase.phase} | logs on your back ${H.myCount()} | in piles ${piles}`;
});
setTimeout(() => win.__wave!.next(1.5), 200);

export {}; // a module for the type checker; look.ts strips this line (an eval body, not imported)
