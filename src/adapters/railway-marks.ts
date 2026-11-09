// Local playtest observations, never a gameplay or prediction input.
import type { RailwayIntent } from './railway.ts';
import type { Railway } from '../sim/railway.ts';
import type { PlayData } from '../proto/mark.ts';

export type RailwayMark = [name: string, data: PlayData];

/** Called only with the server's accepted amount, including confirmations of predicted actions. */
export function railwayActionMarks(intent: RailwayIntent, amount: number, mine: boolean): RailwayMark[] {
  if (amount <= 0) return [];
  const data: PlayData = { by: amount, mine, authority: 'server' };
  const names: Partial<Record<RailwayIntent['op'], string>> = {
    'rail.wake': 'woke',
    'rail.chop': 'chop',
    'rail.beamChop': 'chop',
    'rail.mine': 'mined',
    'rail.axe': 'proper axe gained',
    'rail.hook': 'hook shot gained',
    'rail.jump': 'second jump gained',
    'rail.lever': 'quarry lever pulled',
    'rail.seaSwitch': 'sea switch pulled',
    'rail.pack': 'pack gained',
    'rail.cartCall': 'cart called',
    'rail.depotTake': 'depot pick up',
    'rail.depotRailTake': 'depot pick up',
    'rail.deposit': 'deposit',
    'rail.beamDeposit': 'deposit',
  };
  const name = names[intent.op];
  if (!name) return [];
  if ('station' in intent) data.station = intent.station;
  if ('kind' in intent) data.material = intent.kind === 2 ? 'rails' : intent.kind === 1 ? 'stone' : 'logs';
  if (intent.op === 'rail.beamDeposit') data.material = 'beam';
  if (intent.op === 'rail.depotTake') data.material = 'logs';
  if (intent.op === 'rail.depotRailTake') data.material = 'rails';
  return [[name, data]];
}

/** Scalar edges only. A first snapshot/refill establishes a baseline, never replays historical achievements. */
export function createRailwayProgressMarks() {
  let previous: Map<string, boolean> | null = null;
  return (state: Railway, baseline = false): RailwayMark[] => {
    const facts = new Map<string, boolean>();
    const jobs = [state, ...(state.line?.jobs ?? [])];
    jobs.forEach((job, i) => {
      facts.set(`stretch funded T${i + 1}`, job.start >= 0);
      facts.set(`stretch laid T${i + 1}`, !!job.completion);
    });
    state.line2?.jobs.forEach((job, i) => {
      facts.set(`stretch funded Q${i + 1}`, job.start >= 0);
      facts.set(`stretch laid Q${i + 1}`, !!job.completion);
    });
    facts.set('forge lit', !!state.line2 && state.line2.forge.lit >= 0);
    const marks: RailwayMark[] = [];
    if (previous && !baseline)
      for (const [name, value] of facts)
        if (value && previous.get(name) === false) marks.push([name, { authority: 'server' }]);
    previous = facts;
    return marks;
  };
}
