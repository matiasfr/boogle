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
    id: 'sky',
    title: 'A sky worth lingering under',
    step: 'depth',
    status: 'parked',
    answer: {
      on: '2026-11-03',
      verdict: 'The original is still my preference; I like the original cloud shape more.',
      next: 'Parked by the owner. The game keeps its sky and clouds.',
    },
    url: '/?proto=sky',
    question: 'Do these clouds and this horizon keep the sky you liked and make it better?',
    what: 'The original light blue, with rounded white clouds that glow orange at sunset and a soft sea horizon.',
    since: '2026-11-03',
    spawn: { x: 0, z: -30, yaw: -0.59 },
  },
  {
    id: 'onehand',
    title: 'One thing in your hands',
    step: 'depth',
    status: 'retired',
    url: '/?classic=1',
    merged: { label: 'One held thing in the game', url: '/?classic=1' },
    question: 'Do you miss the hotbar?',
    what: 'No hotbar on screen and nothing to cycle: pick something up and what you held lands at your feet.',
    since: '2026-11-02',
    retired: {
      why: 'merged',
      note: 'Owner: “No I didn’t [miss it] at all. I think in that case we cut it.” One thing in your hands is now the game.',
    },
  },
  {
    id: 'fall',
    title: 'The fall into the world',
    step: 'depth',
    status: 'graduated',
    answer: {
      on: '2026-11-02',
      verdict: 'The idea is very sound. When I smash through it and the letters come through the air, that’s a yes.',
      next: 'Done: it is the game’s first visit. This link replays it; what a returning player gets is next.',
    },
    url: '/?room=proto-fall&proto=fall&tod=0.2',
    question: 'Did that make you laugh?',
    what: 'Your Buddy riding a flat trolley above the clouds while you pick. Jump in runs it off the end of the rail; steer down through the cloud, smash through BOOGLE in the sky and the letters fall with you.',
    since: '2026-11-02',
  },
  {
    id: 'water',
    title: 'That water, in our world',
    step: 'depth',
    status: 'graduated',
    archived: 'archive/water',
    answer: {
      on: '2026-11-04',
      verdict: "it's okay to remove and switch to the new water for now... We can always bring that back later.",
      next: 'The real Place and crossing sea; classic home keeps its cheaper sea pending CI qualification.',
    },
    url: '/?proto=place',
    question: 'Does this look like the demo, here?',
    what: "Ultra Water's full-scale island, small waves, caustics and atmosphere inside our renderer.",
    since: '2026-11-02',
  },
  {
    id: 'place',
    title: 'A real place',
    step: 8,
    status: 'live',
    url: '/?room=proto-place&proto=place',
    question: 'Did splitting up beat staying together?',
    what: 'In co-op, load rails onto the cart and ride to your partner, then carry a beam together and make a see-saw.',
    since: '2026-11-02',
    spawn: { x: 903, z: 14, yaw: -0.25 }, // at the village's edge, with the shelf, the path, the forge and the stub ahead
    verb: 'chops',
    variants: [
      {
        name: 'cove',
        url: '/?proto=place&v=cove&terrain=cove&room=proto-place-cove&fresh=1',
        what: 'Does this shore feel like a place you want to walk into? One layered sandstone headland beside the climb.',
      },
      {
        name: 'village',
        url: '/?proto=place&v=village&intro=1',
        what: 'The previous village landing and coast, for comparison with the walk up from shore.',
      },
    ],
  },
  {
    id: 'net',
    title: 'The line feeds the town',
    step: 6,
    status: 'live',
    url: '/?room=proto-net&proto=net&layout=net-line',
    question: 'When the village steps up, do you want to go connect the next camp?',
    what: 'Connect a camp by rail: its crates ride to the village by themselves, the village steps up, the train speeds up and the rail fills the next work site.',
    since: '2026-11-02',
    spawn: { x: -24.5, z: 31, yaw: 0.02 }, // in the village, looking up the line at Camp 1's smoke
    verb: 'links',
    variants: [
      {
        name: 'haul',
        url: '/?room=proto-net&proto=net&layout=net-line&v=haul',
        what: 'The town still grows and the train still speeds up, but you haul every section by hand.',
      },
      {
        name: 'depot',
        url: '/?room=proto-net&proto=net&layout=net-line&v=depot',
        what: 'Each camp connected puts up a depot the wagon keeps stocked: one press takes a load, and the next trip is shorter.',
      },
    ],
  },
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
    variants: [
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
    status: 'retired',
    url: '/?room=proto-wagon&proto=wagon',
    merged: { label: 'The wagon', url: '/?room=proto-wagon&proto=wagon' },
    question: 'Does riding feel good enough to ride twice for no reason?',
    what: 'Stand on a moving flatbed; jump off at speed.',
    since: '2026-11-01',
    retired: {
      why: 'merged',
      note: 'Owner: “Still fine.” Standing on a moving deck stays as it is, and the wagon carries that verdict from here.',
    },
  },
  {
    id: 'wagon',
    title: 'Ride: the wagon',
    step: 3,
    status: 'answered',
    answer: {
      on: '2026-11-02',
      verdict: 'I think it’s fine just as a transportation.',
      next: 'The trackside show and the seat are cut; the wagon stays a ride you stand on. Choosing a single pace comes later.',
    },
    url: '/?room=proto-wagon&proto=wagon',
    question: 'Would you ride it twice for no reason, and does each laid section make the ride feel like yours?',
    what: 'A greybox steam wagon on the laid rails: lay the route (panel, or −/+ for one section at a time), hop on a flatbed. On the island the step puts you on its deck.',
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
    ],
  },
  {
    id: 'moves',
    archived: 'archive/moves',
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
  },
  {
    id: 'soapbox',
    title: 'Soapbox cart',
    step: 5,
    status: 'retired',
    retired: {
      why: 'cut',
      note: 'Owner, 2 Nov: remove the soapbox mini-game; the old island isn’t the right place for it. The code stays behind ?proto=soapbox in case it comes back somewhere else.',
    },
    url: '/?proto=soapbox',
    answer: {
      on: '2026-11-01',
      verdict: 'Pretty fun.',
      next: 'The RC-car soapbox stays; races with these carts are an idea for later.',
    },
    question: 'Do you keep driving after the finish?',
    what: 'New: the finish shows your time and leaves you in control: drive on anywhere on the island. Stop (or press Interact while the time shows) for Back to the top and a new run. Same RC car and ~9 s run off the massif’s summit, drift for a boost, ghost of your best run.',
    since: '2026-11-01',
    spawn: { x: -61.5, z: -95, yaw: -1.571 }, // behind the cart on the summit, looking down the ridge
    variants: [
      { name: 'bouncy', url: '/?proto=soapbox&v=bouncy', what: 'Soft, long-travel springs: big roll and bounce.' },
      { name: 'tight', url: '/?proto=soapbox&v=tight', what: 'Stiff, short springs and more grip: planted.' },
      {
        name: 'drift',
        url: '/?proto=soapbox&v=drift',
        what: 'A loose rear: long drifts and the full drift boost (the others get 0.75x).',
      },
    ],
  },
  {
    id: 'babble',
    title: "The Boogler's voice",
    step: 'depth',
    status: 'graduated',
    answer: {
      on: '2026-11-02',
      verdict: 'Sounding pretty great. Ship it; we can always tweak the voice later.',
      next: 'In the game: the default take, one sound per syllable, for every player.',
    },
    url: '/', // in the game now (src/render/npc-voice.ts; src/proto/babble is gone)
    question: 'Does he sound like a ridiculous host you want to hear again, even when he stops showing off?',
    what: 'Talk to The Boogler: he speaks in Animal Crossing-style babble as his line types, pausing on punctuation.',
    since: '2026-11-02',
    verb: 'chatting',
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
    archived: 'archive/board',
    title: 'Departures board',
    step: 3,
    status: 'answered',
    answer: {
      on: '2026-11-01',
      verdict: 'The poles looked fine to start with.',
      next: 'Stops start with the pole sign; the plaque is gone.',
    },
    url: '/?room=proto-board&proto=board',
    question: 'Do hubs-only jumps make you want to ride between stops?',
    what: 'Only hubs (Court and Lighthouse, the two ends) jump: their big board takes you to the other hub, or tells you which wagon to ride to a stop. Stops have a small sign. The wagon runs fast.',
    since: '2026-11-01',
    verb: 'trips',
  },
  {
    id: 'groove',
    archived: 'archive/groove',
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
    what: 'Two scaffold bays rise by spawn: left from a Blender kit with a glTF drop clip, right built in code.',
    since: '2026-11-01',
    note: 'The asset pipeline’s first model (docs/plans/asset-pipeline.md).',
    spawn: { x: 14, z: 27, yaw: 0 }, // the usual spawn, the two bays in front of you
  },
  {
    id: 'hero',
    title: 'Play as the hero',
    step: 'depth',
    status: 'graduated',
    answer: {
      on: '2026-11-02',
      verdict: 'Yeah, I’m liking this a lot. Let’s ship it.',
      next: 'Done: the Buddy is the player’s body, with ?body=capsule for the old one, and its camera is the follow camera.',
    },
    url: '/',
    question: 'Does this feel like the character you want to play as?',
    what: 'The Buddy, a simple, slightly plump figure in your colour, with today’s direct controller and a closer camera. New: logs on its back with both hands at its chest, items in its hand, swimming, sitting and flopping fitted to its body.',
    since: '2026-11-01',
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
    what: 'Two places with a prop around the court: one hole of ball golf (tee at the court’s west edge), a mushroom hop line (south-west). Bests stay in this browser.',
    since: '2026-11-01',
    spawn: { x: 7, z: 26, yaw: 1.94 }, // the hop line first (hop leads); each variant takes you to its own toy
    variants: [
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
    url: '/?classic=1',
    merged: { label: 'Returning-player arrival in the game', url: '/?classic=1' },
    question: 'Opening the link cold, were you playing within 10 seconds without reading anything?',
    verb: 'first moves',
    what: 'No lobby: you land facing the court with the ball rolling toward you, a two-line controls card, and timings on the bar. Rename in the menu’s Room page.',
    since: '2026-11-01',
    retired: {
      why: 'merged',
      note: 'Its direct entry is now how every returning player arrives (2 Nov); first visits get a short name-and-colour card, and the rename moved to the menu’s Room page.',
    },
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
