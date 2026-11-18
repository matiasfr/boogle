// driven by: npm run session -- start --rail-seed awake --eval dev/look/evals/carry-squares.ts --size 960x600
// The carried squares (docs/plans/separate-capacities.md, step 3): stages the read-only carry seam, not accepted
// inventory or a played route. Stills at 960x600 and 390x844:
//   npm run session -- start --rail-seed awake --eval dev/look/evals/carry-squares.ts --size 960x600
//   session eval 'window.__carrySquares({ logs: 3 })' then session step 1 then session still carry-3-logs
// Arguments: counts { logs, stone, rails, big } and capacities { logs, stone, rails } (8 each by default).
// Stop the session before editing production source. Real pickups and refusals are the T1 bot's and the video's.
const { me } = await import('/src/player/player.ts' as string);
const { backSeam } = await import('/src/player/haul-back.ts' as string);
const { railwayCommands } = await import('/src/entities/railway/state.ts' as string);
const { fallArrival } = await import('/src/fall/arrival.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!railwayCommands()?.read.ready() || !me.avatar || !me.body || fallArrival.active) await wait(50);
await wait(1500);
type Kind = 'logs' | 'stone' | 'rails';
type Load = Partial<Record<Kind, number>> & { big?: 'beam' | 'boiler' | 'footing' | null; refused?: Kind | null };
const shot = window as Window & {
  __carrySquares?: (load: Load, capacity?: Partial<Record<Kind, number>>) => void;
};
shot.__carrySquares = (load, capacity = {}) => {
  const cap = { logs: 8, stone: 8, rails: 8, ...capacity };
  backSeam.count = () => load.logs ?? 0;
  backSeam.pack = () => cap.logs === 16;
  backSeam.carry = () => ({
    logs: load.logs ?? 0,
    stone: load.stone ?? 0,
    rails: load.rails ?? 0,
    big: load.big ?? null,
    capacity: cap,
    flyingLogs: 0,
    attention: true,
    refused: load.refused ?? null,
  });
};
shot.__carrySquares({});
const p = me.body.position;
window.__debugCam!.set([p.x + 3.2, p.y + 2.2, p.z + 5], [p.x, p.y + 0.6, p.z], 45);
export {};
