// Every prototype the owner can playtest, for boogle.club/protos/ and bar-less ?proto= sessions.
// A new prototype adds or updates its entry here in the same PR and flips it to 'live' when it ships
// (docs/agents/shipping.md, "Shipping"). Live first on the page, then building; graduated,
// answered and parked cards go in the page's compact Answered list with the owner's verdict; retired last. Order
// within a status is the order below.

/** live: still asking. graduated: a yes, and it moves into the game. answered: the question has its answer (it may
 * come back later in another form). parked: can't be answered yet (it waits for something). retired: ended (`retired`). */
export type ProtoStatus = 'live' | 'building' | 'graduated' | 'answered' | 'parked' | 'retired';
/** The statuses the protos page lists under Answered, each card with its `answer`. */
export const ANSWERED: ProtoStatus[] = ['graduated', 'answered', 'parked'];

export type Spawn = { x: number; z: number; yaw: number };

export type Proto = {
  id: string;
  title: string;
  /** The find-the-fun step it answers (docs/plans/find-the-fun.md), or 'depth' for a depth track. */
  step: number | 'depth';
  status: ProtoStatus;
  /** Path and query from the site root. */
  url: string;
  /** The one gut question the prototype asks. */
  question: string;
  /** One line: what's new to feel. No checklists: the owner plays it and knows. */
  what: string;
  /** The day it was added (YYYY-MM-DD). */
  since: string;
  /** One extra line under the title. */
  note?: string;
  /** Other takes on the same question (`&v=<name>`), each a link under Play. A variant's
   * own `spawn` replaces the card's when that variant is playing. */
  variants?: { name: string; url: string; what: string; spawn?: Spawn }[];
  /** Where the prototype session drops you on load, next to the verb (world metres; yaw as the camera's, 0 looks
   * toward -z, forward = (-sin, -cos)). Leave it out to start at the usual spawn. */
  spawn?: Spawn;
  /** The prototype's verb, for the trace's time-to-verb: a counter (`protoCount`) whose first bump is it, or one of the
   * trace's activities ('riding', 'driving', 'carrying'). Only it counts, so another toy's ride or carry
   * isn't this card's verb. Left out, the first ride, drive or carry is. */
  verb?: string;
  /** A graduated, answered or parked card: the day, the owner's verdict in his words (one line) and what happens next.
   * A live card has one when its first question is settled and it is back asking something new. */
  answer?: { on: string; verdict: string; next: string };
  /** Removed from `main` and saved under this git tag (`archive/<name>`): there's nothing to play. */
  archived?: string;
  /** A retired experiment's current home, shown instead of a stale Play selector. */
  merged?: { label: string; url: string };
  /** Why a retired prototype ended: cut (the answer was no), merged (into another), superseded (a later one asks it). */
  retired?: { why: 'cut' | 'merged' | 'superseded'; note?: string };
};

export const PROTOS: Proto[] = [
  {
    id: 'place',
    title: 'A real place',
    step: 8,
    status: 'live',
    url: '/',
    question: 'Did splitting up beat staying together?',
    what: 'In co-op, load rails onto the cart and ride to your partner, then carry a beam together and make a see-saw.',
    since: '2026-11-02',
    spawn: { x: 903, z: 14, yaw: -0.25 }, // at the village's edge, with the shelf, the path, the forge and the stub ahead
    verb: 'chops',
  },
  {
    id: 'net',
    title: 'The line feeds the town',
    step: 6,
    status: 'retired',
    retired: { why: 'superseded', note: 'Classic state retired on 13 November 2026; the live railway owns the route.' },
    merged: { label: 'Play Boogle', url: '/' },
    url: '/?room=proto-net&proto=net&layout=net-line',
    question: 'When the village steps up, do you want to go connect the next camp?',
    what: 'Connect a camp by rail: its crates ride to the village by themselves, the village steps up, the train speeds up and the rail fills the next work site.',
    since: '2026-11-02',
    spawn: { x: -24.5, z: 31, yaw: 0.02 }, // in the village, looking up the line at Camp 1's smoke
    verb: 'links',
  },
  {
    id: 'wagon',
    title: 'Ride: the wagon',
    step: 3,
    status: 'retired',
    answer: {
      on: '2026-11-02',
      verdict: 'I think it’s fine just as a transportation.',
      next: 'The trackside show and the seat are cut; the wagon stays a ride you stand on. Choosing a single pace comes later.',
    },
    retired: { why: 'superseded', note: 'Classic state retired on 13 November 2026; the live railway owns the route.' },
    merged: { label: 'Play Boogle', url: '/' },
    url: '/?room=proto-wagon&proto=wagon',
    question: 'Would you ride it twice for no reason, and does each laid section make the ride feel like yours?',
    what: 'A greybox steam wagon on the laid rails: lay the route (panel, or −/+ for one section at a time), hop on a flatbed. On the island the step puts you on its deck.',
    since: '2026-11-01',
    spawn: { x: 13, z: -9, yaw: 3.0 }, // at the second station (Palm Walk), the wagon coming up the line towards you
    verb: 'riding',
  },
  {
    id: 'look',
    title: 'Graphics ceiling',
    step: 'depth',
    status: 'answered',
    answer: {
      on: '2026-11-01',
      verdict: 'Pretty good … we may want to iterate a little more.',
      next: 'The current look is okay for now; no more look work until there’s a reason.',
    },
    url: '/?proto=look&look=ipad&v=ipad',
    question: 'Which look should Boogle aim for?',
    what: 'Code-only graphics on the real island: presets and layers top right, Y for the steam palette, Measure frame for ms.',
    since: '2026-11-01',
    note: 'Write-up and numbers: docs/proposals/visual-target.md.',
    variants: [
      { name: 'today', url: '/?proto=look&look=today&v=today', what: 'The shipped look, for comparison.' },
      {
        name: 'diorama',
        url: '/?proto=look&look=diorama&v=diorama',
        what: 'Painted: sky-coloured fog, violet shade, soft lines.',
      },
      {
        name: 'toybox',
        url: '/?proto=look&look=toybox&v=toybox',
        what: 'Toys: rim-lit plastic characters, contact shadows.',
      },
      {
        name: 'high',
        url: '/?proto=look&look=high&v=high',
        what: 'Cascaded shadows, AO and TRAA too: the desktop ceiling.',
      },
    ],
  },
  {
    id: 'layout',
    title: 'Island layout',
    step: 'depth',
    status: 'parked',
    answer: {
      on: '2026-11-01',
      verdict: 'The current island is not in line with the overall vision.',
      next: 'Parked until the island is redesigned around its activities and locales; lighthouse-line is out.',
    },
    url: '/?room=proto-layout&proto=layout&v=lighthouse-line&layout=lighthouse-line',
    question: 'Which layout feels best to walk?',
    what: 'Walk a layout option in greybox: lighthouse-line (recommended), east-bay or west-cove. Compare them on the map at claude.ai/artifact/BQuFyGfrXwuzSm9KeKq1fT.',
    since: '2026-11-01',
    variants: [
      {
        name: 'east-bay',
        url: '/?room=proto-layout&proto=layout&v=east-bay&layout=east-bay',
        what: 'The line along the east bay.',
      },
      {
        name: 'west-cove',
        url: '/?room=proto-layout&proto=layout&v=west-cove&layout=west-cove',
        what: 'The line round the west cove.',
      },
    ],
  },
  {
    id: 'crossing',
    title: 'The long crossing',
    step: 7,
    status: 'answered',
    answer: {
      on: '2026-11-02',
      verdict:
        'Default was pretty well balanced; Vast felt like a novelty that would wear off, and Express a little too fast.',
      next: 'A crossing starts at about a minute (1.2 km at 20 m/s), the top speed is for the end-game trains, and you can sit on the train. The sea pass is "a good step for the water"; more look work comes later.',
    },
    url: '/?room=proto-crossing&proto=crossing&tod=0.07',
    question: 'Does this start to look like the shot you picked?',
    what: 'The crossing in the late-morning look you picked from the previz, after Mario Sunshine: a new sea, sky and timber, with sun glitter on the water. Step on a flatbed and ride.',
    since: '2026-11-02',
    spawn: { x: 48, z: 5, yaw: 3.142 }, // on the home platform beside the flatbeds, looking down the line at the far island
    verb: 'rides',
    variants: [
      {
        name: 'express',
        url: '/?room=proto-crossing&proto=crossing&v=express&tod=0.07',
        what: 'The same 1.2 km at 50 m/s: about half a minute. Is an upgrade a thrill?',
        spawn: { x: 48, z: 5, yaw: 3.142 },
      },
      {
        name: 'vast',
        url: '/?room=proto-crossing&proto=crossing&v=vast&tod=0.07',
        what: 'The same train over 4 km of sea: about a minute and a half.',
        spawn: { x: 48, z: 5, yaw: 3.142 },
      },
    ],
  },
];
