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
  /** The one gut question the prototype asks. */
  question: string;
  /** One line: what's new to feel. No checklists: the owner plays it and knows. */
  what: string;
  /** The day it was added (YYYY-MM-DD). */
  since: string;
  /** One extra line under the title. */
  note?: string;
  /** The prototype has a "Copy values" button whose line belongs in the playtest entry. */
  values?: boolean;
  /** Other takes on the same question (`&v=<name>`), each a button under Play; the entry asks which one won. */
  variants?: { name: string; url: string; what: string }[];
  /** Where the in-game prototype bar drops you on load, next to the verb (world metres; yaw as the camera's, 0 looks
   * toward -z, forward = (-sin, -cos)). Leave it out to start at the usual spawn. */
  spawn?: { x: number; z: number; yaw: number };
  /** Why a retired prototype ended: cut (the answer was no), merged (into another), superseded (a later one asks it). */
  retired?: { why: 'cut' | 'merged' | 'superseded'; note?: string };
};

export const PROTOS: Proto[] = [
  {
    id: 'haul',
    title: 'The haul',
    step: 1,
    status: 'live',
    url: '/?room=proto-haul&proto=haul',
    question: 'Which way of moving logs is the most fun?',
    what: "Logs on your back from the palm bundles, poured into the rail's work site. Tuning panel top right.",
    since: '2026-11-01',
    spawn: { x: 4, z: 10, yaw: -0.67 }, // by the palm nearest the first work site, looking past it to the site
    values: true,
    variants: [
      {
        name: 'barrow',
        url: '/?room=proto-haul-barrow&proto=haul&v=barrow',
        what: 'A wheelbarrow that holds 150 (E to push); too fast downhill and it spills. Tip it into the ring.',
      },
      {
        name: 'toss',
        url: '/?room=proto-haul-toss&proto=haul&v=toss',
        what: 'Hold click near the site: your logs fly into the ring by handfuls.',
      },
    ],
  },
  {
    id: 'ride',
    title: 'Ride: platform carry',
    step: 2,
    status: 'live',
    url: '/?proto=ride',
    question: 'Does riding feel good enough to ride twice for no reason?',
    what: 'Stand on a moving flatbed; jump off at speed.',
    since: '2026-11-01',
    spawn: { x: 3, z: 37, yaw: 0.79 }, // beside the flatbed at its first stop, looking at it
    note: 'Add &ridespeed=6 to the address to change the flatbed’s speed.',
  },
  {
    id: 'wagon',
    title: 'Ride: the wagon',
    step: 3,
    status: 'live',
    url: '/?room=proto-wagon&proto=wagon',
    question: 'Would you ride it twice for no reason, and does each laid section make the ride feel like yours?',
    what: 'A greybox steam wagon on the laid rails: lay the route (panel, or −/+ for one section at a time), hop on a flatbed.',
    since: '2026-11-01',
    spawn: { x: 7, z: 9, yaw: -0.52 }, // by the first work site, looking down the line
    variants: [
      {
        name: 'lively',
        url: '/?room=proto-wagon&proto=wagon&v=lively',
        what: 'Rockier and bouncier over the joints, more smoke, a camera jolt per joint while riding.',
      },
      {
        name: 'fast',
        url: '/?room=proto-wagon&proto=wagon&v=fast',
        what: 'Lively at about double the speed (6.5 m/s, sets the room’s pace); jumping off slides you in a dust trail.',
      },
    ],
  },
  {
    id: 'lay',
    title: 'Laying a section',
    step: 3,
    status: 'live',
    url: '/?room=proto-lay&proto=lay&v=crawl',
    question: 'Is laying a section satisfying or dead time?',
    what: 'Fill the Track ring (top left), Start the machine (E): today’s 50 s run with thumping sleepers, clanking rails and chuffs. Hop on its deck to ride.',
    since: '2026-11-01',
    variants: [
      {
        name: 'quick',
        url: '/?room=proto-lay&proto=lay&v=quick',
        what: 'The same run in 14 s: the payoff comes fast.',
      },
      {
        name: 'push',
        url: '/?room=proto-lay&proto=lay&v=push',
        what: 'It lays only while you walk into its back: about 25 s of shoving solo, faster with friends.',
      },
    ],
  },
  {
    id: 'era',
    title: 'Era swap (greybox)',
    step: 4,
    status: 'live',
    url: '/?room=proto-era&proto=era',
    question: "Does the island change enough at an era's end?",
    what: 'Lay all sections, start opening day at the lighthouse platform, watch the court.',
    since: '2026-11-01',
    spawn: { x: 6, z: -40, yaw: 0 }, // south of the lighthouse platform, looking at it
  },
  {
    id: 'soapbox',
    title: 'Soapbox cart',
    step: 5,
    status: 'live',
    url: '/?proto=soapbox',
    question: 'Is driving fun?',
    what: 'A ~20 s run off the rocky massif’s summit (north-west): the ridge, a drop down the face, a palm slalom and the bay shore. E to get in, hold Jump to drift.',
    since: '2026-11-01',
    spawn: { x: -61.5, z: -95, yaw: -1.571 }, // behind the cart on the summit, looking down the ridge
    variants: [
      { name: 'grip', url: '/?proto=soapbox&v=grip', what: 'Planted and precise: short, tidy drifts.' },
      {
        name: 'drifty',
        url: '/?proto=soapbox&v=drifty',
        what: 'Loose rear, long drifts; let go of a long one (hot sparks) for a little boost.',
      },
    ],
  },
  {
    id: 'build',
    title: 'Construction you can watch',
    step: 'depth',
    status: 'live',
    url: '/?room=proto-build&proto=build',
    question: 'Is watching it go up satisfying?',
    what: 'Press Pour 10 logs (top left) four times and watch the helper hut go up. New: a ghost of the hut, pieces flying in to a beat with a rising tune, and a scaffold you can kick over.',
    since: '2026-11-01',
    spawn: { x: 11, z: 12.5, yaw: -0.36 }, // looking at the Helper ring and the hut's plot
  },
  {
    id: 'uisfx',
    title: 'UI that answers',
    step: 'depth',
    status: 'live',
    url: '/?proto=uisfx',
    question: 'Does the UI feel alive and satisfying without getting in the way?',
    what: 'HUD sounds (hotbar tick, prompt pop, take thunk, full deny, haul count), presses that squash, a haul count that ticks up, bigger text on darker glass. Compare with plain /.',
    since: '2026-11-01',
  },
  {
    id: 'look',
    title: 'Graphics ceiling',
    step: 'depth',
    status: 'building',
    url: '/?proto=look',
    question: 'Which look should Boogle aim for?',
    what: 'Code-only graphics presets on the real island.',
    since: '2026-11-01',
  },
  {
    id: 'assets',
    title: 'Blender kit vs code',
    step: 'depth',
    status: 'live',
    url: '/?proto=assets',
    question: 'Can you tell the Blender-made scaffold from the code-built one?',
    what: 'Two scaffold bays rise by spawn: left from a Blender kit with a glTF drop clip, right built in code.',
    since: '2026-11-01',
    note: 'The asset pipeline’s first model (docs/plans/asset-pipeline.md).',
  },
  {
    id: 'layout',
    title: 'Island layout',
    step: 'depth',
    status: 'live',
    url: '/?room=proto-layout&layout=<name>',
    question: 'Which layout feels best to walk?',
    what: 'Walk a layout option in greybox: lighthouse-line (recommended), east-bay or west-cove. Compare them on the map at claude.ai/artifact/BQuFyGfrXwuzSm9KeKq1fT.',
    since: '2026-11-01',
  },
];
