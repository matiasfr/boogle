// Every prototype the owner can playtest, for boogle.club/protos/ (docs/plans/find-the-fun.md). A new `?proto=`
// prototype adds or updates its entry here in the same PR, and flips it to 'live' when it ships (AGENTS.md, "Shipping").
// Live first on the page, then building, then retired; order within a status is the order below.

export type ProtoStatus = 'live' | 'building' | 'retired';

export type Spawn = { x: number; z: number; yaw: number };

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
  /** Other takes on the same question (`&v=<name>`), each a button under Play; the entry asks which one won. A variant's
   * own `spawn` replaces the card's when that variant is playing. */
  variants?: { name: string; url: string; what: string; spawn?: Spawn }[];
  /** Where the in-game prototype bar drops you on load, next to the verb (world metres; yaw as the camera's, 0 looks
   * toward -z, forward = (-sin, -cos)). Leave it out to start at the usual spawn. */
  spawn?: Spawn;
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
    spawn: { x: 7, z: 9, yaw: -0.52 }, // by the first work site (the Track ring and the machine), looking down the line
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
    question: 'From the court, can you tell at a glance which era it is?',
    what: 'Lay all sections, start opening day at the lighthouse platform: a gathering call (smoke, a tolling bell, a ring that burns down) until everyone is there, the 10 s bell, then blocks, sky, fog and sound change together, two old huts stay, and a before/after postcard comes up.',
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
    what: 'A ~10 s run off the rocky massif’s summit (north-west): the ridge, a drop down the face, a long right across the lowland. E to get in; hold Jump to drift, let go on blue or pink sparks for a boost. New: a ghost of your best run to race, with a split at the finish, and a camera that ducks and pulls in under the trees instead of going through them.',
    since: '2026-11-01',
    spawn: { x: -61.5, z: -95, yaw: -1.571 }, // behind the cart on the summit, looking down the ridge
    variants: [
      { name: 'grip', url: '/?proto=soapbox&v=grip', what: 'Planted and precise: short, tidy drifts.' },
      {
        name: 'drifty',
        url: '/?proto=soapbox&v=drifty',
        what: 'Loose rear, long drifts and the full drift boost (the others get 0.75x).',
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
    id: 'board',
    title: 'Departures board',
    step: 3,
    status: 'live',
    url: '/?room=proto-board&proto=board&v=hop',
    question: 'Does the board make the island feel connected and quick to get around?',
    what: 'A flap-display sign at each station; E picks a station. v=hop travels at once, v=ride tells you which wagon to catch.',
    since: '2026-11-01',
    note: 'Press “Lay the whole route” first. Swap &v=hop for &v=ride; &laid=1 or 2 tries a shorter line.',
  },
  {
    id: 'groove',
    title: 'The groove',
    step: 'depth',
    status: 'live',
    url: '/?room=proto-groove&proto=groove',
    question: 'Does the island feel more alive and fun with the groove?',
    what: 'A placeholder house loop on one shared beat: quiet when idle, grooving when you move, full on the wagon, a one-beat drop when you wipe out. Honks and clacks land on the beat and in key. The chip top right mutes it.',
    since: '2026-11-01',
    variants: [
      {
        name: 'silent-first',
        url: '/?room=proto-groove&proto=groove&v=silent-first',
        what: 'Silence until you first move; never silent after.',
      },
      {
        name: 'always',
        url: '/?room=proto-groove&proto=groove&v=always',
        what: 'Always some music, even standing at spawn.',
      },
    ],
  },
  {
    id: 'look',
    title: 'Graphics ceiling',
    step: 'depth',
    status: 'live',
    url: '/?proto=look&look=ipad',
    question: 'Which look should Boogle aim for?',
    what: 'Code-only graphics on the real island: presets and layers top right, Y for the steam palette, Measure frame for ms.',
    since: '2026-11-01',
    note: 'Write-up and numbers: docs/proposals/visual-target.md.',
    variants: [
      { name: 'today', url: '/?proto=look&look=today', what: 'The shipped look, for comparison.' },
      {
        name: 'diorama',
        url: '/?proto=look&look=diorama',
        what: 'Painted: sky-coloured fog, violet shade, soft lines.',
      },
      { name: 'toybox', url: '/?proto=look&look=toybox', what: 'Toys: rim-lit plastic characters, contact shadows.' },
      { name: 'high', url: '/?proto=look&look=high', what: 'Cascaded shadows, AO and TRAA too: the desktop ceiling.' },
    ],
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
    id: 'minis',
    title: 'Mini-game toys',
    step: 'depth',
    status: 'live',
    url: '/?proto=minis',
    question: 'Which of these would you play again unprompted?',
    what: 'Three places with a prop around the court: a crate stack on a stump (east), one hole of ball golf (tee at the court’s west edge), a mushroom hop line (south-west). Bests stay in this browser.',
    since: '2026-11-01',
    variants: [
      {
        name: 'topple',
        url: '/?proto=minis&v=topple',
        what: 'Knock six crates off the stump with the ball or your body; it rebuilds itself 4 s after the last falls.',
        spawn: { x: 15.9, z: 26.2, yaw: -2.28 }, // on the court side of the stump, the crates just right of you
      },
      {
        name: 'golf',
        url: '/?proto=minis&v=golf',
        what: 'E at the tee, then throws and bumps into the striped bucket past the palms. Par 3; carrying costs a stroke per 3 m.',
        spawn: { x: 8, z: 22, yaw: 1.3 }, // beside the tee (just right of you), looking west down the hole
      },
      {
        name: 'hop',
        url: '/?proto=minis&v=hop',
        what: 'Bounce down five mushrooms to the flag without touching the sand. E to go again.',
        spawn: { x: 7, z: 26, yaw: 1.94 }, // north-east of the start crate, the mushroom line running off to the left
      },
    ],
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
  {
    id: 'arrive',
    title: 'Arrival: the first 30 seconds',
    step: 'depth',
    status: 'live',
    url: '/?room=proto-arrive&proto=arrive&v=direct',
    question: 'Opening the link cold, were you playing within 10 seconds without reading anything?',
    what: 'No lobby: you land facing the court with the ball rolling toward you, a two-line controls card, and timings on the bar. Rename in the menu’s Room page.',
    since: '2026-11-01',
    variants: [
      {
        name: 'lobby',
        url: '/?room=proto-arrive&proto=arrive&v=lobby',
        what: 'Today’s flow (name, colour, Jump in; the full card), timed the same way.',
      },
    ],
  },
];
