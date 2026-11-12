// Local playtest observations, never a gameplay or prediction input.
import type { RailwayIntent } from './railway-intents.ts';
import { aperture, forge, jobs, qjobs, rail, works, type ReadWorld } from '../sim/railway-rows.ts';
import type { World } from '../ecs/index.ts';
import type { PlayData } from '../proto/mark.ts';
import { RAIL_TRAINS } from '../sim/railway-lines.ts';

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
    'rail.glide': 'glider gained',
    'rail.jump': 'second jump gained',
    'rail.lever': 'quarry lever pulled',
    'rail.seaSwitch': 'sea switch pulled',
    'rail.pack': 'pack gained',
    'rail.boilerTake': 'boiler taken',
    'rail.boilerFit': 'boiler fitted',
    'rail.call': 'train called',
    'rail.breaker': 'breaker taken',
    'rail.strike': 'seam struck',
    'rail.brace': 'leaf braced',
    'rail.kiln': 'kiln filled',
    'rail.footTake': 'footing shouldered',
    'rail.footSet': 'footing set',
    'rail.cradle': 'cradle rails',
    'rail.turn': 'table turned',
    'rail.steelTake': 'steel kit taken',
    'rail.steel': 'works fed',
    'rail.install': 'boiler installed',
    'rail.depotTake': 'depot pick up',
    'rail.depotRailTake': 'depot pick up',
    'rail.deposit': 'deposit',
    'rail.beamDeposit': 'deposit',
  };
  const name = names[intent.op];
  if (!name) return [];
  if ('station' in intent) data.station = intent.station;
  if ('kind' in intent) data.material = intent.kind === 2 ? 'rails' : intent.kind === 1 ? 'stone' : 'logs';
  if (intent.op === 'rail.steelTake') data.material = intent.kind === 1 ? 'rails' : 'logs';
  if (intent.op === 'rail.beamDeposit') data.material = 'beam';
  if (intent.op === 'rail.depotTake') data.material = 'logs';
  if (intent.op === 'rail.depotRailTake') data.material = 'rails';
  if (intent.op === 'rail.call') data.halt = intent.id;
  if (intent.op === 'rail.strike') data.seam = intent.id;
  if (intent.op === 'rail.footTake') data.rack = intent.rack;
  if (intent.op === 'rail.footSet') data.site = intent.site;
  return [[name, data]];
}

/** Scalar edges only. A first snapshot/refill establishes a baseline, never replays historical achievements. Reads the
 * rows of a whole world (the client's confirmed one; the job rows' start and completion need no tick). */
export function createRailwayProgressMarks() {
  let previous: Map<string, boolean> | null = null;
  return (w: ReadWorld | World, baseline = false): RailwayMark[] => {
    const facts = new Map<string, boolean>();
    jobs(w).forEach((job, i) => {
      facts.set(`stretch funded T${i + 1}`, job.start >= 0);
      facts.set(`stretch laid T${i + 1}`, !!job.completion);
    });
    qjobs(w).forEach((job, i) => {
      facts.set(`stretch funded Q${i + 1}`, job.start >= 0);
      facts.set(`stretch laid Q${i + 1}`, !!job.completion);
    });
    facts.set('forge lit', forge(w).lit >= 0);
    facts.set('trains unlocked', rail(w).trains >= 0);
    // The twelfth pier footing as this page saw it arrive; the view's finale marks 'crossing finale' when it plays.
    facts.set('crossing footed', works(w).crossing >= 0);
    // Ring Island's gap (v27): the fourteenth bent footing, the rivet.
    const ring = aperture(w);
    facts.set('gap footed', ring.set >= 14);
    facts.set('ring joined', ring.joined >= 0);
    const marks: RailwayMark[] = [];
    if (previous && !baseline)
      for (const [name, value] of facts)
        if (value && previous.get(name) === false) marks.push([name, { authority: 'server' }]);
    previous = facts;
    return marks;
  };
}

/** Local body observations. Boarding another car is the same ride; shared completion alone is not an arrival. */
export function createRailwayJourneyMarks() {
  let riding: number | null = null;
  let reachedPier = false;
  return (
    position: Readonly<{ x: number; y: number; z: number }>,
    platform: string | undefined,
    trains: boolean,
    pierLaid: boolean,
    swimming: boolean,
  ): RailwayMark[] => {
    // A train's car is `railway:train<slot>-<car>` (one a RAIL_TRAINS slot, v26); the mark names its line.
    const match = trains && !swimming && /^railway:train(\d)(?:-[0-2])?$/.exec(platform ?? '');
    const line = match ? (RAIL_TRAINS[Number(match[1])]?.line ?? null) : null;
    const marks: RailwayMark[] = [];
    if (line !== null && line !== riding) marks.push(['train ride', { line, authority: 'local' }]);
    riding = line;
    // Pier end s=739, pinned world metres from line2-b5-b8.md. Height excludes swimming beneath its deck.
    const dx = position.x - 1402.2,
      dz = position.z + 367.5;
    if (!reachedPier && pierLaid && !swimming && Math.abs(position.y - 24.3) < 2 && dx * dx + dz * dz < 36) {
      reachedPier = true;
      marks.push(['pier reached', { authority: 'local' }]);
    }
    return marks;
  };
}
