import type { PlayData } from '../mark.ts';

const contributionMarks = new Set([
  'deposit',
  'yard left',
  'kiln filled',
  'cradle rails',
  'footing set',
  'works fed',
  'leg frame fed',
  'boiler fitted',
]);

/** One elapsed time in milliseconds per first-fall session, from this player's accepted hand-in. */
export function firstContribution() {
  let contributed = false;
  return (name: string, data: PlayData | undefined, ms: number, touchdown: number | undefined) => {
    if (
      contributed ||
      touchdown === undefined ||
      ms < touchdown ||
      data?.authority !== 'server' ||
      data.mine !== true ||
      !contributionMarks.has(name)
    )
      return undefined;
    contributed = true;
    return ms - touchdown;
  };
}
