// driven by: npm run session -- start --rail-seed awake --eval dev/look/evals/grant-c5-carry.ts --size 960x600
// Matched C5 presentation stills. Stages the existing read-only carry seam, not accepted inventory or a played route.
// npm run session -- start --rail-seed awake --eval dev/look/evals/grant-c5-carry.ts --size 960x600
// session eval 'window.__c5Carry(8, 8)' then session step 1 then session still c5-before-desktop-full
// Repeat at 390x844; stop the session before editing production source. T1 separately exercises real pickups/deposits.
const { me } = await import('/src/player/player.ts' as string);
const { backSeam } = await import('/src/player/haul-back.ts' as string);
const { railwayCommands } = await import('/src/entities/railway/state.ts' as string);
const { fallArrival } = await import('/src/fall/arrival.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!railwayCommands()?.read.ready() || !me.avatar || !me.body || fallArrival.active) await wait(50);
await wait(1500);
const shot = window as Window & {
  __c5Carry?: (logs: number, comfortable: number, rails?: number, stone?: number) => void;
};
shot.__c5Carry = (logs, comfortable, rails = 0, stone = 0) => {
  backSeam.count = () => logs;
  backSeam.pack = () => comfortable === 16;
  backSeam.carry = () => ({
    logs,
    rails,
    stone,
    comfortable,
    capacity: comfortable * 1.5,
    big: null,
    flyingLogs: 0,
    attention: true,
  });
};
shot.__c5Carry(0, 8);
const p = me.body.position;
window.__debugCam!.set([p.x + 3.2, p.y + 2.2, p.z + 5], [p.x, p.y + 0.6, p.z], 45);
export {};
