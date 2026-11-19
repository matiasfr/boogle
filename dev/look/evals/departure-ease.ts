// npm run look -- --real --rail-seed q5-carry --eval dev/look/evals/departure-ease.ts --action dev/look/evals/departure-ease-act.ts --video --seconds 30 --cam 1178,31,-38.3 --look 1174.5,25,-24.6 --name departure-ease --question "Can a player at Q5's frame step aboard the layer as it pulls away?"
// (the camera: 9 m beside the track 14 m past Q5's start, looking back at the frame the layer leaves.)
// G31/G32 proof (v63, a laying machine eases out over 50 ticks): on the accepted q5-carry seed (Q5's 24 rails in its
// frame, its 24 logs on the depot rack) carry the logs in by ordinary inputs, holding the last load back at the rack.
// The action (./departure-ease-act.ts) delivers it, which funds Q5, and steps aboard once the server starts laying.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const bot = makeBot({
  recover: () => {
    throw new Error('departure ease setup needed recovery');
  },
});
const fail = (beat: string) => {
  throw new Error(`departure ease: ${beat}`);
};
if (!(await R.railReady())) fail('railway never ready');
const view = () => R.inspectRailway()!.line2View as { depot: number[] | null; frames: { x: number; z: number }[] };
const job = () => R.line2Station(4);
if (job().start >= 0 || job().railStock !== 24 || job().stock !== 0)
  fail('needs q5-carry: rails in, no logs, unfunded');
const frame = view().frames[4]!;
// The frame unloads a back on its own; carry loads in until only the last one is left, and keep it at the rack.
for (let trip = 0; ; trip++) {
  if (trip > 4) fail('too many depot trips');
  const depot = view().depot ?? fail('no depot rack');
  if (!(await bot.use(depot[0]!, depot[2]!, 'take Q5 depot logs', /^Pick up$/))) fail('depot rack not offered');
  if (!(await bot.work(() => R.railBack().carry > 0, 5000, 380))) fail('depot logs not taken');
  if (job().stock + R.railBack().carry >= 24) break;
  if (!(await bot.walk(frame.x, frame.z, 2.4))) fail('walk to the frame');
  if (!(await bot.until(() => R.railBack().carry === 0, 30000, 'frame unloads'))) fail('frame did not unload');
}
if (job().start >= 0) fail('funded too early');
console.log(`DEPARTURE setup ${JSON.stringify({ stock: job().stock, carry: R.railBack().carry })}`);
(window as Window & { __departurePrepared?: boolean }).__departurePrepared = true;
export {};
