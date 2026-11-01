// Every prototype the owner can playtest, for boogle.club/protos/ (docs/plans/find-the-fun.md). A new `?proto=`
// prototype adds or updates its entry here in the same PR, and flips it to 'live' when it ships (AGENTS.md, "Shipping").
// Live first on the page, then building, then retired; order within a status is the order below.

export type ProtoStatus = 'live' | 'building' | 'retired';

export type Proto = {
  id: string;
  title: string;
  /** The find-the-fun step it answers (docs/plans/find-the-fun.md), or 'depth' for a depth track. */
  step: number | 'depth';
  status: ProtoStatus;
  /** Path and query from the site root. A `<name>` placeholder gets a text box on the page. */
  url: string;
  /** The playtest questions, answered one line each. */
  questions: string[];
  /** A short solo checklist. */
  tryThis: string[];
  /** Its playtest kit, on GitHub. */
  kit?: string;
  /** The day it was added (YYYY-MM-DD). */
  since: string;
  /** One extra line under the title. */
  note?: string;
  /** The prototype has a "Copy values" button whose line belongs in the playtest entry. */
  values?: boolean;
};

const DOCS = 'https://github.com/matiasfr/boogle/blob/main/docs/';

export const PROTOS: Proto[] = [
  {
    id: 'haul',
    title: 'The haul',
    step: 1,
    status: 'live',
    url: '/?room=proto-haul&proto=haul',
    questions: [
      'Does carrying a wobbly stack feel good with no goal?',
      'Does filling a rail section feel like effort or a chore?',
      'Which numbers changed how it felt, and to what?',
    ],
    tryThis: [
      'Haul with no goal for 2 minutes: take logs (E), walk, jump. Don’t pour.',
      'Get past the soft cap (orange chip) and jump; try a few spill and soft-cap values.',
      'Fill Section 1 from its gold ring; count the trips. Reset haul, change the cost, fill it again.',
      'Try faster and slower pours, bigger and smaller handfuls.',
      'Start the machine (E at the sign) and watch the 50 s run to the end.',
    ],
    kit: `${DOCS}playtest-kits/haul.md`,
    since: '2026-11-01',
    note: 'Use a fresh room (proto-haul-2) for a clean save. Tap the Haul kit title to fold it.',
    values: true,
  },
  {
    id: 'ride',
    title: 'Ride: platform carry',
    step: 2,
    status: 'live',
    url: '/?proto=ride',
    questions: [
      'Does riding feel smooth?',
      'Did you ride twice for no reason?',
      'Does jumping off at speed feel good?',
    ],
    tryThis: [
      'Hop on at a stop.',
      'Stand through the corners.',
      'Walk around on the deck while it moves.',
      'Jump off sideways at speed.',
    ],
    since: '2026-11-01',
    note: 'Add &ridespeed=6 to the address to change the flatbed’s speed.',
  },
  {
    id: 'era',
    title: 'Era swap (greybox)',
    step: 4,
    status: 'building',
    url: '/?room=proto-era&proto=era',
    questions: ['Does the island change enough at an era’s end?', 'Would a solo player notice from the court?'],
    tryThis: ['Stand on the court and start opening day.', 'Walk the island after the swap and look for what changed.'],
    since: '2026-11-01',
  },
  {
    id: 'soapbox',
    title: 'Soapbox cart',
    step: 5,
    status: 'building',
    url: '/?proto=soapbox',
    questions: ['Is driving fun?', 'Would you do another run?'],
    tryThis: ['Drive the lighthouse path top to bottom.', 'Do a second run and try a different line.'],
    since: '2026-11-01',
  },
  {
    id: 'look',
    title: 'Graphics ceiling',
    step: 'depth',
    status: 'building',
    url: '/?proto=look',
    questions: ['Which preset reads best?', 'Does anything look noisy?'],
    tryThis: ['Flip through every preset from the same spot.', 'Turn the camera slowly and watch edges and shadows.'],
    since: '2026-11-01',
  },
  {
    id: 'layout',
    title: 'Island layout',
    step: 'depth',
    status: 'building',
    url: '/?room=proto-layout&layout=<name>',
    questions: ['Which layout feels best to walk?', 'Is anything too far or too empty?'],
    tryThis: ['Walk from home to every landmark.', 'Look out from the highest point.'],
    since: '2026-11-01',
    note: 'The layout lab artifact link will be added here.',
  },
];
