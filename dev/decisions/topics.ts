// The decision log's topics and the calls the split makes (owner, 10 November 2026: "Should we optimize storage of
// decisions to keep the record but save context reads?", "Yes"). Data only: dev/decisions/split.ts applies it to the
// pre-split docs/decisions.md and docs/agent-calls.md. Entries are keyed by their bold lead, word for word. Nothing here
// rewords an entry: it says which file an entry lives in, which entries a later one superseded in full (they move to the
// archive verbatim), and how its "Current rules" line reads when the lead alone is not a rule.

export type TopicId = 'core-loop' | 'rail' | 'rewards' | 'characters' | 'look' | 'audio' | 'controls' | 'process';

export type Topic = {
  id: TopicId;
  title: string;
  file: string;
  /** The old log's "### " sections under "## Decided" that move here whole, in this order. */
  sections: string[];
  holds: string;
};

/** The old current-decision index's topics, each with the old log's sections it routed to. */
export const TOPICS: Topic[] = [
  {
    id: 'core-loop',
    title: 'Core loop, pacing and progression',
    file: 'docs/decisions-core-loop.md',
    sections: ['The audit picks (2 November)', 'The shape of the game'],
    holds:
      'The audit picks; The shape of the game; length, abilities, upgrades and the train garage, finds, signposting, loop order',
  },
  {
    id: 'rail',
    title: 'Rail, construction, levels and travel',
    file: 'docs/decisions-rail.md',
    sections: ['Trains and the world'],
    holds:
      'Trains and the world; track, stations and halts, Home station, Ring Island, the map blockout, the express, construction',
  },
  {
    id: 'rewards',
    title: 'Rewards, co-op and town roles',
    file: 'docs/decisions-rewards.md',
    sections: ['Progress and rewards'],
    holds: 'Progress and rewards; the shared wallet, Boogles and fares, resources and hauling',
  },
  {
    id: 'characters',
    title: 'Characters, cosmetics and story',
    file: 'docs/decisions-characters.md',
    sections: ['Characters and story'],
    holds: 'Characters and story; Buddy, The Boogler, wearables and the Pause wardrobe',
  },
  {
    id: 'look',
    title: 'Graphics, water, sky and devices',
    file: 'docs/decisions-look.md',
    sections: ['Look'],
    holds: 'Look; water, sky, light and shading, terrain, browsers and devices',
  },
  {
    id: 'audio',
    title: 'Audio',
    file: 'docs/decisions-audio.md',
    sections: ['Sound (listening-pack audit, 2026-11-01)'],
    holds: 'Sound (listening-pack audit, 2026-11-01)',
  },
  {
    id: 'controls',
    title: 'Controls, HUD and arrival',
    file: 'docs/decisions-controls.md',
    sections: ['Controls'],
    holds: 'Controls; one thing in hand, cinematics and shared moments, first visit, resets, the pause menu',
  },
  {
    id: 'process',
    title: 'Architecture, tools and prototype lifecycle',
    file: 'docs/decisions-process.md',
    sections: ['Process'],
    holds: 'Process; architecture, ECS and replication, prototypes, playtests, tooling and how agents work',
  },
];

export const OPEN_FILE = 'docs/decisions-open-questions.md';
export const ARCHIVE_FILE = 'docs/decisions-archive.md';
export const ROUTING_FILE = 'docs/decisions.md';
export const CALLS_FILE = 'docs/agent-calls.md';
export const MANIFEST_FILE = 'dev/decisions/manifest.json';

/** Entries at the top of the old "## Decided" (before its first section), by lead. */
export const TOP_TOPIC: Record<string, TopicId> = {
  '2026-11-10, Boogles buy town upgrades, source upgrades and passenger cars; never engine or cargo parts, never materials':
    'rewards',
  '2026-11-10, priority call: migrate the game out of `src/proto` onto the ECS, railway first; then chunk, cull and stream the world; device tests run remotely':
    'process',
  '2026-11-10, open calls answered: Ring Island': 'rail',
  '2026-11-10, open calls answered: the rail map': 'rail',
  '2026-11-10, open calls answered: the train upgrade screen': 'core-loop',
  '2026-11-10, open calls answered: yards at halts': 'rail',
  '2026-11-10, open calls answered: the express and interchanges': 'rail',
  '2026-11-10, open calls answered: riders and Boogles': 'rewards',
  '2026-11-10, open calls answered: terrain and sealed buildings': 'look',
  '2026-11-10, open calls answered: older calls': 'rail',
  '2026-11-10, idea under brainstorm: call an express at the larger stations, and interchanges between lines': 'rail',
  '2026-11-10, the currency is called Boogles; passenger trade is under brainstorm': 'rewards',
  '2026-11-10, big junctions are designed stations, not the generic halt': 'rail',
  '2026-11-10, the train garage: a works copy on the table, the first car free, the Roundhouse grows later, cars per line':
    'core-loop',
  '2026-11-10, trains may be longer than platforms; the passenger cars align; sources load by cargo loaders': 'rail',
  '2026-11-10, a track that ends has buffers and is marked a terminal; otherwise it runs through or loops; and track has no visible kinks':
    'rail',
  "2026-11-10, dress Buddy from Pause: You is Pause's first page; the curio shelf is display only": 'characters',
  '2026-11-10, the railway is double track': 'rail',
  '2026-11-10, block out the whole map, then build areas one at a time': 'rail',
  '2026-11-10, Ring Island: the Meet, the shard religion, steel as the longer boiler': 'rail',
  "2026-11-10, the late game's five open questions: every recommendation taken": 'rail',
  '2026-11-10, trains stop on request, at the halt and aboard': 'rail',
  '2026-11-10, Turn the table only when ready': 'rail',
  "2026-11-10, the forge's roof and chimney are a later upgrade": 'rail',
  '2026-11-10, Firefox is supported, at P2': 'look',
  'Halt boards show the island map': 'rail',
  "2026-11-10, the curio shelf and the finders' bay share one axis, for now": 'rail',
  '2026-11-10, the train engine pass starts with a previz the owner approves': 'rail',
  "2026-11-10, the train engine's cab fits Buddy": 'rail',
  '2026-11-10, the starting engine is A; the longer boiler is an upgrade': 'rail',
  '2026-11-10, the passenger car is redesigned with benches, and the first one already looks good': 'rail',
  '2026-11-10, shared moments play for everyone': 'controls',
  "2026-11-10, the sea is rebuilt small: Water B's depth plane, Ultra Water deleted": 'look',
  'Home station B: the curio shelf leaves the north end wall': 'rail',
  "Home station B: the hall's end walls are low": 'rail',
  'A live line map stands at the Home station; halts get real split-flap signs': 'rail',
  'Four more answers': 'controls',
  'Loop graph tooling': 'process',
  'Loop orders': 'core-loop',
  'Signposting: words and beacons are allowed sparingly': 'core-loop',
  "Station 6 takes nothing by hand until trains run; upgrade choices are made in the world; Home's stalls stand at 160°, 190° and 220°":
    'core-loop',
  "The water's target is Super Mario Sunshine, lighting and grading included, and it must be cheap on a phone": 'look',
  'The boiler fit is the first upgrade a player chooses; the cart stays at 24 rails': 'core-loop',
  'Home gets one coherent station': 'rail',
  'The boiler is hauled on a rope like the great log, a little faster': 'rail',
  'The gold finds are cut; the crystals stay': 'core-loop',
  'The hotbar is cut: one thing in your hands': 'controls',
  'The ball bump is cut': 'controls',
};

/** For a top-of-log entry not in TOP_TOPIC (one added on another branch before a re-run): first match wins, then rail. */
export const TOP_KEYWORDS: [RegExp, TopicId][] = [
  [/\b(boogles?|wallet|currency|fares?|economy|money|bucks|coins?)\b/i, 'rewards'],
  [/\b(sound|music|audio|voices?|honks?)\b/i, 'audio'],
  [
    /\b(water|sea|sky|shading|toon|terrain|lighting|graphics|render|firefox|safari|browser|textures?|palette)\b/i,
    'look',
  ],
  [/\b(buddy|boogler|characters?|cosmetics?|wardrobe|hats?|wearables?)\b/i, 'characters'],
  [/\b(pause|controls?|buttons?|cinematics?|hud|reset|arrival|menu)\b/i, 'controls'],
  [
    /\b(ecs|architecture|agents?|tools?|tooling|playtests?|prototypes?|ship|merge|models?|review|orchestrator|research)\b/i,
    'process',
  ],
  [/\b(upgrades?|progression|pacing|hours|abilit(y|ies)|glider|jump|hook|finds?)\b/i, 'core-loop'],
];

/**
 * Entries a later entry superseded in full, by lead (`nth` picks one of several entries with the same lead, from 1).
 * They move verbatim to the topic's section of the archive. A partial supersession keeps the entry in force and adds
 * a note to its Current rules line (ANNOTATIONS).
 */
export const SUPERSEDED: { lead: string; nth?: number; by: string }[] = [
  {
    lead: 'While nobody plays:',
    by: 'its own note, "Superseded 2026-11-06: an empty world is paused"; Rewards, 2026-11-06, economy principles amended',
  },
  {
    lead: 'Three things you earn, none of them a shared wallet',
    by: 'its own note, "superseded 2026-11-06: progression and the wallet are shared"; Rewards, 2026-11-06, economy principles amended',
  },
  {
    lead: '2026-11-10, toon shading style B is the default look, without its rim',
    by: 'its own note, "superseded the same day"; Look, 2026-11-10, baseline shading is the default again; toon B removed',
  },
  {
    lead: 'Halt boards show the island map',
    nth: 1,
    by: 'the longer copy of the same entry (same words, plus the 10 November low display), which stays in Rail',
  },
  {
    lead: '2026-11-01, only hub stations are fast travel',
    by: 'Rail, 2026-11-10, open calls answered: the express and interchanges ("Supersedes: 1 November, only hub stations are fast travel")',
  },
  {
    lead: '2026-11-10, idea under brainstorm: call an express at the larger stations, and interchanges between lines',
    by: 'Rail, 2026-11-10, open calls answered: the express and interchanges ("This turns the idea logged above ... into a direction to build")',
  },
  {
    lead: 'The island grows through eight technology eras.',
    by: 'Core loop, 2026-11-02, the game runs closer to 8 hours ("The eight eras below are the long list, no longer the plan")',
  },
  {
    lead: '2026-11-02, the player is the Tracklayer',
    by: 'Characters, 2026-11-02, the Buddy is the one player figure ("The Tracklayer entries below are history")',
  },
  {
    lead: '2026-11-03, the original sky and clouds stay; `?proto=sky` is parked',
    by: 'Look, 2026-11-03, use the Ultra Water demo sky ("This supersedes the earlier decision to keep the original sky below")',
  },
  {
    lead: "2026-11-03, the water uses the demo's mobile settings on mobile and its default on desktop, as a starting point",
    by: 'Look, 2026-11-10, the sea is rebuilt small (Ultra Water deleted; "Supersedes ... the 4 and 3 November calls\' Ultra water")',
  },
  {
    lead: '2026-11-08, playtest checkpoint: pause after the hook shot and Q5',
    by: 'Process, 2026-11-09, nothing waits for a playtest ("Supersedes ... the 8 November playtest checkpoint")',
  },
  {
    lead: '2026-11-02, be cautious removing prototypes for now',
    by: 'Process, 2026-11-06, conform to tested engine architecture, "No prototypes on `main`" ("Supersedes 2 November\'s "be cautious removing prototypes" and its archive policy")',
  },
  {
    lead: '2026-11-02, finished prototypes are archived, not kept on `main`',
    by: 'Process, 2026-11-06, conform to tested engine architecture, "No prototypes on `main`" (the archive policy it supersedes)',
  },
  {
    lead: '2026-11-01, playtests are solo-first.',
    by: 'Process, 2026-11-07, evaluate shared progression adventures ("superseding "solo first"")',
  },
  {
    lead: '2026-11-01, the RC-car soapbox stays',
    by: 'Process, 2026-11-02, the soapbox is removed ("Replaces the entry below")',
  },
];

/** A Current rules line's own text, where the lead is a heading rather than a rule. Built from the entry's words. */
export const OVERRIDES: Record<string, string> = {
  '2026-11-10, open calls answered: Ring Island':
    'Ring Island: buffers about 15 m past the island halt with a crossover before it (a buffered end, not a loop); start its first landform step; Get unstuck before the Meet returns you to the Pier halt; keep "Rivet", and "RINGWORKS" for now; the raised drawbridge seen from Home stays at true scale',
  '2026-11-10, open calls answered: the rail map':
    'Rail map: line 2 grows into one ring line, as the working map; Bell Rock on two levels (the bay line on top, the north–south line at the water); after the Meet the Railhead stays its halt and the Pier becomes homeward-only; a speed part only where it saves about ten seconds a trip; the two ruled-out legs leave the live blockout view as their own reviewed change',
  '2026-11-10, open calls answered: the train upgrade screen':
    'Train upgrade screen: start its first build; an install is a hold of about a second, no dialog; players away keep their camera, hear the whistle and see the part go on at Home; "Try it" stays, lighter, for parts you can\'t install yet; roof and lamps on the passenger car are a look; the longer boiler, the first steel install, is free',
  '2026-11-10, open calls answered: yards at halts':
    'Yards: a yard at each halt, taken where it lies (trains later carry it); it never fills, past 24 of a kind it grows in strapped bundles of 8; it appears when the track reaches the halt site, none at the Pier for now; upgrade steel waits as a visible stack in the Roundhouse bay; Drop puts one thing off your back (hold: all of it)',
  '2026-11-10, open calls answered: the express and interchanges':
    "The express: by stage (the service train with a headboard, later a passenger set the room buys); built when v27 is live and Home's hall map exists; every open stop reachable from the first junction by a connecting train, an interchange removes the walk; a 20 s wait with a bell, anyone aboard can go now; the fast-travel jump becomes a ride, hubs and the board stay; an express runs past a pulled lever and the next train serves them",
  '2026-11-10, open calls answered: riders and Boogles':
    "Riders and Boogles: fares and seats go into the economy model and the 2D page first, then a flagged prototype; Boogles come from fares only, and materials and Boogles never convert; nothing runs while the room is empty, the next join finds one capped coin sack; The Boogler's face on the coin; the shop stays free",
  '2026-11-10, open calls answered: terrain and sealed buildings':
    'Terrain round two is fixed on the wedge, then applied to all of Home after a quiet-machine performance run; sealed buildings open in order: the two cottages on the way in from the dock, the other two, then a room behind the Ring Island works wall',
  '2026-11-10, open calls answered: older calls':
    'Older calls: one lever per platform side; the passenger car has four seats (built); engine cab windows are open frames, as built; the 16 MiB sky cube is replaced with a gradient and cloud sprites',
  "2026-11-10, the late game's five open questions: every recommendation taken":
    "Late game: the cradle takes only its 8 rails and the kiln casts 14; a footing is carried at 3 m/s with sprint and the plain jump only; the forge's roof and chimney go on free at the twelfth pier footing; once the wagon is out the table is not offered again",
  'Four more answers':
    'Four more answers: nothing is drawn under you on a jump; whoever fits the boiler gets a "Steam" card; no "Throw" in the live game until replication R3; model routes as set that day',
};

/** A note on a Current rules line where a later entry changed part of the rule. Keyed by entry or sub-bullet lead. */
export const ANNOTATIONS: Record<string, string> = {
  '2026-11-10, open calls answered: riders and Boogles':
    'what Boogles may buy: replaced the same day by "Boogles buy town upgrades, source upgrades and passenger cars"',
  "2026-11-10, the late game's five open questions: every recommendation taken":
    'answer 2, two-handled levers at middle halts: replaced by "open calls answered: older calls", one lever per platform side',
  '2026-11-10, trains stop on request, at the halt and aboard':
    'levers: one per platform side ("older calls"); an express may run past a pulled lever ("the express and interchanges")',
  '2026-11-10, the currency is called Boogles; passenger trade is under brainstorm':
    'passenger trade: answered by "open calls answered: riders and Boogles"',
  "2026-11-10, the forge's roof and chimney are a later upgrade":
    'trigger: the twelfth pier footing ("the late game\'s five open questions")',
  '2026-11-10, big junctions are designed stations, not the generic halt':
    'answer 5\'s buffers-or-loop question: buffers with a crossover ("open calls answered: Ring Island")',
  "2026-11-10, every building can be walked into; Ring Island's land is detailed and organic":
    'the reviewed layout\'s loop: buffers with a crossover instead ("open calls answered: Ring Island")',
  '2026-11-10, train stools: low, in the middle, rider properly seated':
    'seats: the passenger car has four bench seats ("the passenger car is redesigned with benches"; "older calls")',
  'The boiler fit is the first upgrade a player chooses; the cart stays at 24 rails':
    'where choices are reached: in the world ("Station 6 takes nothing by hand until trains run; upgrade choices are made in the world")',
  '2026-11-06, roughly six hours, close for one to three players':
    'wearables: the shop stays free ("open calls answered: riders and Boogles")',
  '2026-11-02, the game runs closer to 8 hours, and starts with fewer eras': 'length: roughly 6 hours since 2026-11-06',
  'Length and sessions:': 'now roughly 6 hours (2026-11-06)',
  'While nobody plays,': 'amended 2026-11-06: the world is paused; one capped away credit on the next join',
  'Water:': 'the Ultra water is deleted: "the sea is rebuilt small" (2026-11-10)',
  'Eras:': 'eras became better materials (Changed, 2026-11-02, "Materials replace eras")',
  '2026-11-05, early work before the replay':
    '"nothing merges while the owner is playing": replaced by "nothing waits for a playtest" (2026-11-09)',
  '2026-11-08, start Split-rock Works and the Roundhouse now':
    'merging only after B5–B8 was played: replaced by "nothing waits for a playtest" (2026-11-09)',
  '2026-11-05, design proposals and exposure':
    'Whistle: replaced by "cut the Call cart to forge handle" (2026-11-09); Proper axe: replaced by "the great beam" (2026-11-07)',
  '2026-11-05, after the solo iPhone run': 'cut trees "out of sight": replaced by "regrowth only needs to be slow"',
  '2026-11-03, surface swimming and automatic high-fall plunges, no dive controls':
    'the underwater look, droplets and marine snow: removed by "the sea is rebuilt small" (2026-11-10); swimming and plunges stand',
  '2026-11-04, finish the water switch and keep the old sea only in history':
    'the new (Ultra) water itself: deleted by "the sea is rebuilt small" (2026-11-10)',
  "2026-11-04, new water is the default for tonight's Place replay":
    'the new (Ultra) water itself: deleted by "the sea is rebuilt small" (2026-11-10)',
  '2026-11-02, make the Ultra Water demo scene the starting point':
    'Ultra Water deleted by "the sea is rebuilt small" (2026-11-10), which does not name this entry',
  '2026-11-02, start from Ultra Water and tune it, keeping its features':
    'Ultra Water deleted by "the sea is rebuilt small" (2026-11-10), which does not name this entry',
  "2026-11-02, Ultra Water's water is a target, graded poppier":
    'Ultra Water deleted by "the sea is rebuilt small" (2026-11-10), which does not name this entry',
  "2026-11-02, an invite doesn't land you next to your friend":
    'friends are reached by the ride, not fast travel ("the express and interchanges", 2026-11-10)',
  '2026-11-01, migrate to game entities now, ahead of the slice':
    '"still no ECS": reopened 2026-11-06, then "entity model: build E"',
  'Kept from SETTLED:':
    '"every system is ignorable": replaced for the rail loop by the audit picks ("Skipping the rail")',
};

/** Where-column documents, normalized (no ../, no anchor), mapped to topics for agent-call rows. */
export const CALL_DOC_TOPIC: Record<string, TopicId> = {
  'brainstorms/glider-placement.md': 'core-loop',
  'plans/glider-b-home-flow.md': 'core-loop',
  'reviews/home-flow.md': 'core-loop',
  'brainstorms/works-signposting.md': 'core-loop',
  'plans/works-signposting-2.md': 'core-loop',
  'brainstorms/upgrade-choices.md': 'core-loop',
  'plans/boiler-first-choice.md': 'core-loop',
  'brainstorms/engine-garage.md': 'core-loop',
  'game-design/place.md': 'core-loop',
  'plans/generic-lines.md': 'rail',
  'plans/rail-map.md': 'rail',
  'plans/world-blockout.md': 'rail',
  'brainstorms/junction-stations.md': 'rail',
  'brainstorms/express-train.md': 'rail',
  'brainstorms/station-deposit.md': 'rail',
  'plans/works-late-game.md': 'rail',
  'plans/home-station.md': 'rail',
  'plans/split-rock-roundhouse.md': 'rail',
  'plans/line2-b5-b8.md': 'rail',
  'brainstorms/ring-island.md': 'rail',
  'plans/ring-island-build1.md': 'rail',
  'plans/engine-previz.md': 'rail',
  'plans/curio-shelves-placement.md': 'rail',
  'brainstorms/passenger-trade.md': 'rewards',
  'brainstorms/money.md': 'rewards',
  'brainstorms/pause-wardrobe.md': 'characters',
  'plans/water-sunshine.md': 'look',
  'game-design/water.md': 'look',
  'plans/terrain-pass.md': 'look',
  'plans/playtest-jump-in.md': 'process',
  'brainstorms/loop-graph.md': 'process',
  'plans/place-retirement.md': 'process',
  'agents/models.md': 'process',
};

/** For a row whose Where names no mapped document: tested against Where then Call, first match wins, then rail. */
export const CALL_KEYWORDS: [RegExp, TopicId][] = [
  [
    /place-retirement|\bdev\/(loop|playtest|sim|scan)\b|dev\/models|\.claude\/|git tags|^worktrees|reviews\/lockstep|owner-calls\.md|^#\d{3,}|^J\d\b|^T\d\b/,
    'process',
  ],
  [/wardrobe|residents\.ts|town-lines|greeter|buddy|boogler/i, 'characters'],
  [
    /camera-pull-out|dismiss-pointer|arrival\.ts|world-reset|hud\.ts|moment-banner|shared-moment|beam-carry-tuning/i,
    'controls',
  ],
  [/render\/|water|\bsky\b|terrain|toon|lighting/i, 'look'],
  [/glider|signpost|tech-layout|place-level|secrets-view|\bfinds?\b|lookout/i, 'core-loop'],
];

/** A row whose Where names railway code is a rail call, whatever its Call text mentions. */
export const RAIL_WHERE =
  /railway|train|boiler|halts?-|crossing|works-view|stock-sign|curio-shelf|crates|far-head|engine|station|roundhouse|footing|help-carry|trophy-plinth|layout\.ts|folk\.ts|Far Head|pack view/i;

/** A ruled row whose status says part of it is still the owner's to answer stays in the live table. */
export const STILL_OPEN = /still open|stays open|was not asked|not asked/;
