// Every prototype the owner can playtest, for boogle.club/protos/ and the playlist on the `?play` island
// (docs/plans/find-the-fun.md, "One path"). A new `?proto=` prototype adds or updates its entry here in the same PR,
// flips it to 'live' when it ships (AGENTS.md, "Shipping"), and either joins the island (ISLAND in src/proto/flags.ts,
// its loader asking `protoOn`) or says why it is a `chapter`. Live first on the page, then building; graduated,
// answered and parked cards go in the page's compact Answered list with the owner's verdict; retired last. Order
// within a status is the order below.
import { ISLAND } from '../src/proto/flags.ts';

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
  /** The default take in one line, shown on the bar under the variant buttons while it plays (variants: their `what`). */
  defaultWhat?: string;
  /** Other takes on the same question (`&v=<name>`), each a button under Play; the entry asks which one won. A variant's
   * own `spawn` replaces the card's when that variant is playing. */
  variants?: { name: string; url: string; what: string; spawn?: Spawn }[];
  /** Where the in-game prototype bar drops you on load, next to the verb (world metres; yaw as the camera's, 0 looks
   * toward -z, forward = (-sin, -cos)). Leave it out to start at the usual spawn. */
  spawn?: Spawn;
  /** The prototype's verb, for the trace's time-to-verb: a counter (`protoCount`) whose first bump is it, or one of the
   * trace's activities ('riding', 'driving', 'carrying'). Only it counts, so on the island another toy's ride or carry
   * isn't this card's verb. Left out, the first ride, drive or carry is. */
  verb?: string;
  /** A graduated, answered or parked card: the day, the owner's verdict in his words (one line) and what happens next. */
  answer?: { on: string; verdict: string; next: string };
  /** Why a retired prototype ended: cut (the answer was no), merged (into another), superseded (a later one asks it). */
  retired?: { why: 'cut' | 'merged' | 'superseded'; note?: string };
  /** Why a live prototype can't share the `?play` island (it reshapes the world or clashes with another toy): the
   * playlist opens its own address for it, a chapter. Every live card is either in ISLAND or has this. */
  chapter?: string;
};

export const PROTOS: Proto[] = [
  {
    id: 'haul',
    title: 'The haul',
    step: 1,
    status: 'answered',
    answer: {
      on: '2026-11-01',
      verdict: 'Default is quite good.',
      next: 'The back bundle stays the way to haul; the magnet he loved moves to pickups later, pulling without a button.',
    },
    url: '/?room=proto-haul&proto=haul',
    question: 'Which way of moving logs is the most fun?',
    what: "Logs on your back from the palm bundles, poured into the rail's work site. Tuning panel top right.",
    since: '2026-11-01',
    spawn: { x: 4, z: 10, yaw: -0.67 }, // by the palm nearest the first work site, looking past it to the site
    verb: 'carrying',
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
      {
        name: 'wave',
        url: '/?room=proto-haul-wave&proto=haul&v=wave',
        what: 'The best bundles sit on a sandbar a wave sweeps every minute or so. Get back above the stakes in time.',
        spawn: { x: 2, z: 33, yaw: 3.142 }, // on the home beach behind the high-water stakes, looking out at the sandbar
      },
      {
        name: 'magnet',
        url: '/?room=proto-haul&proto=haul&v=magnet',
        what: 'Piles notice you from 3 m and logs fly in one by one, ticking up a scale; Take logs spills them out first. &reach=2.2 or 4 to compare.',
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
    verb: 'riding',
    note: 'Add &ridespeed=6 to the address to change the flatbed’s speed.',
    chapter: 'its flatbed’s route crosses the mushroom hop line and the golf hole',
  },
  {
    id: 'wagon',
    title: 'Ride: the wagon',
    step: 3,
    status: 'live',
    url: '/?room=proto-wagon&proto=wagon',
    question: 'Would you ride it twice for no reason, and does each laid section make the ride feel like yours?',
    what: 'A greybox steam wagon on the laid rails: lay the route (panel, or −/+ for one section at a time), hop on a flatbed. On the island the step puts you on its deck.',
    defaultWhat: 'Calm: 3 m/s, a gentle sway over the joints, light smoke.',
    since: '2026-11-01',
    spawn: { x: 13, z: -9, yaw: 3.0 }, // at the second station (Palm Walk), the wagon coming up the line towards you
    verb: 'riding',
    variants: [
      {
        name: 'lively',
        url: '/?room=proto-wagon&proto=wagon&v=lively',
        what: 'Same 3 m/s, but the deck rocks and dips at every rail joint, your view jolts, more smoke.',
      },
      {
        name: 'fast',
        url: '/?room=proto-wagon&proto=wagon&v=fast',
        what: 'Lively at double the speed (6.5 m/s): the island rushes past; jump off and you skid in a dust trail.',
      },
      {
        name: 'stoke',
        url: '/?room=proto-wagon&proto=wagon&v=stoke',
        what: 'Crawls at walking pace until you feed it: carry logs to the loco, E at the firebox, and it speeds up to 6.5 m/s.',
      },
      {
        name: 'grind',
        url: '/?room=proto-wagon&proto=wagon&v=grind&grind=1&laid=3',
        what: 'Jump onto the laid rails to grind them: sparks, a rising hiss, pull back to reverse, fly off the end. Mind the wagon.',
      },
    ],
  },
  {
    id: 'moves',
    title: 'Double jump and glide',
    step: 'depth',
    status: 'answered',
    answer: {
      on: '2026-11-01',
      verdict: 'Yes but not from the start.',
      next: 'Double jump and glide become unlocks later, for platforming.',
    },
    url: '/?proto=moves&jump2=1&glide=1',
    question: 'Do you jump twice just because you can, and does the glide make the island feel smaller?',
    what: 'Press jump again in the air for a second jump; hold it to glide down slowly.',
    verb: 'second jumps',
    since: '2026-11-01',
    note: 'Works on any ?proto= page: add &jump2=1 and/or &glide=1 to its address. On the island: on at this step only.',
    variants: [
      {
        name: 'jump2',
        url: '/?proto=moves&jump2=1&v=jump2',
        what: 'The second jump alone, no glide.',
      },
    ],
  },
  {
    id: 'lay',
    title: 'Laying a section',
    step: 3,
    status: 'graduated',
    answer: {
      on: '2026-11-01',
      verdict: 'Yes it’s wonderful. Quick feels pretty good.',
      next: 'Done: the 14 s run is the game’s only laying run, and the jump at the end is fixed.',
    },
    url: '/?room=proto-lay&proto=lay',
    question: 'Is laying a section satisfying or dead time?',
    what: 'Fill the Track ring (top left), Start the machine (E): a 14 s run with thumping sleepers, clanking rails and chuffs. Hop on its deck to ride.',
    since: '2026-11-01',
    spawn: { x: 7, z: 9, yaw: -0.52 }, // by the first work site (the Track ring and the machine), looking down the line
  },
  {
    id: 'era',
    title: 'Era swap (greybox)',
    step: 4,
    status: 'parked',
    answer: {
      on: '2026-11-01',
      verdict: 'Not sure we have enough depth to tell meaningfully.',
      next: 'Asked again once eras 1–2 have real level design.',
    },
    url: '/?room=proto-era&proto=era',
    question: 'From the court, can you tell at a glance which era it is?',
    what: 'Lay all sections, start opening day at the lighthouse platform: a gathering call (smoke, a tolling bell, a ring that burns down) until everyone is there, the 10 s bell, then blocks, sky, fog and sound change together, two old huts stay, and a before/after postcard comes up.',
    since: '2026-11-01',
    spawn: { x: 6, z: -40, yaw: 0 }, // south of the lighthouse platform, looking at it
    chapter: 'it swaps the whole island’s blocks, sky, fog and sound',
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
    status: 'graduated',
    answer: {
      on: '2026-11-01',
      verdict: 'I absolutely love this kind of animation.',
      next: 'Construction you can watch is how things get built in the game.',
    },
    url: '/', // in the game now: the hut build (src/proto/build is gone)
    question: 'Is watching it go up satisfying?',
    what: 'Press Pour 10 logs (top left) four times and watch the helper hut go up. New: a ghost of the hut, pieces flying in to a beat with a rising tune, and a scaffold you can kick over.',
    since: '2026-11-01',
    spawn: { x: 11, z: 12.5, yaw: -0.36 }, // looking at the Helper ring and the hut's plot
  },
  {
    id: 'uisfx',
    title: 'UI that answers',
    step: 'depth',
    status: 'graduated',
    answer: {
      on: '2026-11-01',
      verdict: 'Yeah this is a massive improvement.',
      next: 'The UI that answers goes into the game.',
    },
    url: '/', // the default HUD now (no ?proto=uisfx)
    question: 'Does the UI feel alive and satisfying without getting in the way?',
    what: 'HUD sounds (hotbar tick, prompt pop, take thunk, full deny, haul count), presses that squash, a haul count that ticks up, bigger text on darker glass. Compare with plain /.',
    since: '2026-11-01',
  },
  {
    id: 'board',
    title: 'Departures board',
    step: 3,
    status: 'live',
    url: '/?room=proto-board&proto=board&v=pole',
    question: 'Do hubs-only jumps make you want to ride between stops?',
    what: 'Only hubs (Court and Lighthouse, the two ends) jump: their big board takes you to the other hub, or tells you which wagon to ride to a stop. Stops have a small sign. The wagon runs fast.',
    since: '2026-11-01',
    note: 'Press “Lay the whole route” first. Swap &v=pole for &v=plaque to compare the stop signs; &laid=1 or 2 tries a shorter line.',
    verb: 'trips',
    chapter: 'it runs its own wagon on the wagon’s line',
    variants: [
      {
        name: 'plaque',
        url: '/?room=proto-board&proto=board&v=plaque',
        what: 'Stops get a painted timetable dial instead of a flap countdown.',
      },
    ],
  },
  {
    id: 'groove',
    title: 'The groove',
    step: 'depth',
    status: 'retired',
    url: '/?room=proto-groove&proto=groove',
    question: 'Does the island feel more alive and fun with the groove?',
    what: 'A placeholder house loop on one shared beat: quiet when idle, grooving when you move, full on the wagon, a one-beat drop when you wipe out. Honks and clacks land on the beat and in key. The chip top right mutes it.',
    since: '2026-11-01',
    retired: { why: 'cut', note: 'Owner: no placeholder music (sound audit, 2 Nov); his own music comes later.' },
  },
  {
    id: 'look',
    title: 'Graphics ceiling',
    step: 'depth',
    status: 'live',
    url: '/?proto=look&look=ipad&v=ipad',
    question: 'Which look should Boogle aim for?',
    what: 'Code-only graphics on the real island: presets and layers top right, Y for the steam palette, Measure frame for ms.',
    since: '2026-11-01',
    note: 'Write-up and numbers: docs/proposals/visual-target.md.',
    chapter: 'it changes how the whole island is drawn',
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
    id: 'assets',
    title: 'Blender kit vs code',
    step: 'depth',
    status: 'answered',
    answer: {
      on: '2026-11-01',
      verdict: 'Both are great; I could tell the Blender one by the plank texture and bevel.',
      next: 'The asset pipeline is proven.',
    },
    url: '/?proto=assets',
    question: 'Can you tell the Blender-made scaffold from the code-built one?',
    what: 'Two scaffold bays rise by spawn: left from a Blender kit with a glTF drop clip, right built in code. Between them a jointed hero rigged by a Blender script: walk up and press Interact to change its outfit (work, castaway, bare), and it waves. &hero=castaway or &hero=bare starts in one; &eyes=googly|flat|bead and &shade=matte|plastic|clay try looks. ?proto=look&look=toybox&hero=bare shows it under the look lab’s presets.',
    since: '2026-11-01',
    note: 'The asset pipeline’s first model (docs/plans/asset-pipeline.md).',
    spawn: { x: 14, z: 27, yaw: 0 }, // the usual spawn, the two bays and the hero in front of you
  },
  {
    id: 'hero',
    title: 'Play as the hero',
    step: 'depth',
    status: 'live',
    url: '/?proto=hero',
    question: 'Does running and jumping as this character feel good enough to keep it?',
    what: 'Every player is the jointed hero. Movement pass 2: it leans from the body, not the whole figure, its stride grows with speed with feet planted, bob locked to the footfalls, arms pumping, air poses, a skid on reversals. Compare with &lean=old, &stride=old, &airpose=old, &skid=old; try ?air=35 for more air control. &ctl=odyssey: a modern-Mario controller (run where you face, turns carve arcs, speed builds, pull back to skid and pivot, more air control).',
    since: '2026-11-01',
    chapter: 'it swaps your body for every toy, so it is judged on its own',
  },
  {
    id: 'minis',
    title: 'Mini-game toys',
    step: 'depth',
    status: 'answered',
    answer: {
      on: '2026-11-01',
      verdict: 'I liked hop the most.',
      next: 'Topple is retired (not engaging), hop leads (platforming as a mini-game), golf comes later in the mini-games pass.',
    },
    url: '/?proto=minis',
    question: 'Which of these would you play again unprompted?',
    what: 'Three places with a prop around the court: a crate stack on a stump (east), one hole of ball golf (tee at the court’s west edge), a mushroom hop line (south-west). Bests stay in this browser.',
    since: '2026-11-01',
    spawn: { x: 15.9, z: 26.2, yaw: -2.28 }, // the topple stump first; each variant takes you to its own toy
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
    chapter: 'it moves the railway and the places on the island',
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
    id: 'arrive',
    title: 'Arrival: the first 30 seconds',
    step: 'depth',
    status: 'retired',
    url: '/?room=proto-arrive&proto=arrive&v=direct',
    question: 'Opening the link cold, were you playing within 10 seconds without reading anything?',
    verb: 'first moves',
    what: 'No lobby: you land facing the court with the ball rolling toward you, a two-line controls card, and timings on the bar. Rename in the menu’s Room page.',
    since: '2026-11-01',
    retired: {
      why: 'merged',
      note: 'Its direct entry is now how every returning player arrives (2 Nov); first visits get a short name-and-colour card, and the rename moved to the menu’s Room page.',
    },
  },
];

export type PlaytestStep = {
  /** A card's id in PROTOS. */
  id: string;
  /** One of the card's `variants` by name; leave it out for the card's own url. */
  variant?: string;
  /** One short line: what to find out. */
  why: string;
  /** Under "When you have time" instead of the numbered run. */
  later?: true;
};

// The "Start here" strip at the top of boogle.club/protos/: the order to play in. Consecutive entries for one card are
// one numbered step. An entry whose card or variant doesn't exist (yet, or any more) is skipped, so a variant can be
// listed before it lands.
export const PLAYTEST_ORDER: PlaytestStep[] = [
  { id: 'wagon', why: 'Would you ride it twice for no reason?' },
  { id: 'wagon', variant: 'fast', why: 'Would you ride it twice for no reason?' },
  { id: 'wagon', variant: 'stoke', why: 'Would you ride it twice for no reason?' },
  { id: 'soapbox', variant: 'drifty', why: 'Would you do another run?' },
  { id: 'ride', why: 'Would you ride the flatbed twice for no reason?' },
  { id: 'board', why: 'Do hubs-only jumps make you want to ride between stops?' },
  { id: 'board', variant: 'plaque', why: 'Do hubs-only jumps make you want to ride between stops?' },
  { id: 'look', variant: 'high', why: 'High or toybox: which look should Boogle aim for?' },
  { id: 'look', variant: 'toybox', why: 'High or toybox: which look should Boogle aim for?' },
  { id: 'hero', why: 'Does running as the hero feel good enough to keep?' },
];

/** Whether a card plays on the `?play` island (else it is a chapter with its own page). */
export const onIsland = (p: Proto) => (ISLAND as readonly string[]).includes(p.id);

/** One step of the playlist: a card, its variants in the order to try them ('' is the card's own url), and why. */
export type PlayStep = { card: Proto; legs: string[]; why: string; later: boolean };

/** The playlist on the `?play` island and the protos page's Start here: PLAYTEST_ORDER with consecutive entries for
 * one card as one step (its legs), skipping cards or variants that don't exist (yet, or any more). */
export function playlist(): PlayStep[] {
  const steps: PlayStep[] = [];
  for (const o of PLAYTEST_ORDER) {
    const card = PROTOS.find((p) => p.id === o.id && p.status === 'live');
    if (!card || (o.variant && !card.variants?.some((v) => v.name === o.variant))) continue;
    const leg = o.variant ?? '';
    const last = steps.at(-1);
    if (last?.card === card) last.legs.push(leg);
    else steps.push({ card, legs: [leg], why: o.why, later: !!o.later });
  }
  return steps;
}

/** A variant's address ('' for the card's own), from the site root. */
export const variantUrl = (p: Proto, v: string) => p.variants?.find((x) => x.name === v)?.url ?? p.url;
