import type { PlayData } from '../mark.ts';

const contributionMarks = new Set([
  'deposit',
  'yard left',
  'kiln filled',
  'cradle rails',
  'footing set',
  'works fed',
  'leg frame fed',
  'woke',
  'route pickup taken',
  'route barrier opened',
  'quarry lever pulled',
  'sea switch pulled',
  'breaker taken',
  'seam struck',
  'leaf braced',
  'boiler fitted',
  'table turned',
  'upgrade installed',
  'boiler installed',
]);

/** One elapsed time in milliseconds per first-fall session, from an accepted action by this player. */
export function firstContribution() {
  let contributed = false;
  return (name: string, data: PlayData | undefined, ms: number, touchdown: number | undefined) => {
    if (
      contributed ||
      touchdown === undefined ||
      ms < touchdown ||
      data?.authority !== 'server' ||
      data.mine !== true ||
      !(contributionMarks.has(name) || (name === 'chop' && data.material === 'beam'))
    )
      return undefined;
    contributed = true;
    return ms - touchdown;
  };
}
