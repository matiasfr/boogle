// A clean dash home: Take logs on the sandbar with 14 s to go, then a sprint back along the spit and up past the
// stakes before the surge (src/proto/haul/wave.ts):
// BOOGLE_QUERY='proto=haul&v=wave' npm run look -- --hud --eval dev/look/evals/haul-wave-dash.ts --cam 20,9,40 --look 2,0,58 --warm 0.2 --seconds 14 --frames 14
const H = (await import('/dev/look/evals/haul-pilot.ts' as string)) as typeof import('./haul-pilot.ts');
const win = window as unknown as { __wave?: { phase: { phase: string }; caught: number; next: (s: number) => void } };
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
H.stand(-5, 71, 0, 0.6); // on the sandbar
for (let k = 0; k < 50 && !win.__wave; k++) await new Promise((r) => setTimeout(r, 100));
H.overlay(() => `${win.__wave!.phase.phase} | logs ${H.myCount()} | caught: wave ${win.__wave!.caught}`);
setTimeout(async () => {
  win.__wave!.next(14);
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
  await new Promise((r) => setTimeout(r, 700));
  await H.walk(
    [
      [2, 67],
      [2, 54],
      [1, 42],
      [1, 32],
    ],
    { sprint: true, seconds: 13 },
  );
}, 300);

export {}; // a module for the type checker; look.ts strips this line (an eval body, not imported)
