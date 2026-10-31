// Atlas layout constants: SVG geometry, tiers, colours. PURE (no DOM, no d3), so tests and dev/atlas/cli.mjs can read
// it. What a box says (title, subtitle) is narrative and lives in docs/atlas/concepts.json; only geometry is here.
// An agent should not move coordinates: the citation report checks every reference to these ids.

export const LAYERS = [
  {
    id: 'L0',
    name: 'What players see and do',
    short: 'Features',
    c: '--l0',
    dirs: ['features'],
    note: 'Plug-ins, auto-loaded by main.js. None imports another.',
  },
  {
    id: 'L1',
    name: 'Game systems',
    short: 'Systems',
    c: '--l1',
    dirs: ['player', 'physics', 'render', 'boot', 'boogler', 'guest', 'decomp', 'pois', 'island', 'debug', '(core)'],
    note: 'The player, physics, rendering, characters and places that features build on.',
  },
  {
    id: 'L2',
    name: 'Shared world',
    short: 'World',
    c: '--l2',
    dirs: ['adapters', 'world', 'world/rules', 'sim'],
    note: 'Lockstep state every peer agrees on, and the meshes that follow it.',
  },
  {
    id: 'L3',
    name: 'Network',
    short: 'Network',
    c: '--l3',
    dirs: ['netplay', 'net'],
    note: 'Presence, remote players and the room over PeerJS.',
  },
  { id: 'L4', name: 'Server', short: 'Server', c: '--l4', dirs: ['server'], note: 'Signaling and the snapshot store.' },
];

// Sync kinds: display name and CSS variable. Descriptions live in concepts.json "kinds".
export const KINDS = {
  lock: { name: 'Lockstep', c: '--k-lock' },
  adapter: { name: 'Lockstep adapter', c: '--k-adapter' },
  host: { name: 'Host', c: '--k-host' },
  owner: { name: 'Owner', c: '--k-owner' },
  msg: { name: 'Message', c: '--k-msg' },
  local: { name: 'Local', c: '--k-local' },
};

// The "How it works" diagram. `c` is the concept id (title and card), `lock` draws the lockstep stripe. Titles and
// subtitles come from concepts.json ("concepts[c].title", "boxes[<box id>]").
export const BOX = {
  'you.features': { x: 40, y: 66, w: 520, h: 62, c: 'features' },
  'you.registries': { x: 40, y: 144, w: 160, h: 116, c: 'registries' },
  'you.loop': { x: 215, y: 144, w: 345, h: 52, c: 'loop' },
  'you.systems': { x: 215, y: 208, w: 345, h: 52, c: 'systems' },
  'you.world': { x: 40, y: 276, w: 330, h: 76, c: 'world', lock: 1 },
  'you.netplay': { x: 385, y: 276, w: 175, h: 76, c: 'netplay' },
  'you.input': { x: 40, y: 368, w: 160, h: 52, c: 'input' },
  'you.screen': { x: 385, y: 368, w: 175, h: 52, c: 'screen' },
  'fr.features': { x: 726, y: 66, w: 238, h: 62, c: 'features' },
  'fr.systems': { x: 726, y: 144, w: 238, h: 52, c: 'systems' },
  'fr.netplay': { x: 726, y: 208, w: 238, h: 52, c: 'netplay' },
  'fr.world': { x: 726, y: 276, w: 238, h: 76, c: 'world', lock: 1 },
  'fr.screen': { x: 726, y: 368, w: 238, h: 52, c: 'screen' },
  server: { x: 330, y: 470, w: 340, h: 60, c: 'server' },
};

// Wire lanes down the middle of the diagram (x is 645 for all of them).
export const LANES = { msg: { y: 97 }, owner: { y: 222 }, host: { y: 262 }, lock: { y: 362 } };

// Routes between these two ids bend through a waypoint: the lockstep lane runs under Netplay.
export const ROUTE_VIA = [{ a: 'you.world', b: 'lane:lock', via: [378, 362] }];

// Is this id a route end the How diagram can draw: a BOX id, or `lane:<channel>`?
export const validRef = (id) => (typeof id === 'string' && id.startsWith('lane:') ? id.slice(5) in LANES : id in BOX);

export const CHANNEL_IDS = ['owner', 'host', 'lock', 'msg'];
export const VIEWS = ['how', 'map', 'focus', 'flow', 'frame'];

// What src/main.js runs before the physics step, in order (all phase 'pre' in the Frame view).
export const PRE_STEP = [
  ['updateRemotes', -500],
  ['resolveBallOwner', -400],
  ['updateIntent', -300],
  ['prepareBall', -200],
  ['world.step', -100],
];

// Where each view's idea comes from. They describe the atlas, not Boogle, so they stay in code.
export const REFS = {
  how: '<b>How it works</b> borrows from the C4 model’s dynamic diagrams and from explorable explanations (Nicky Case, Bartosz Ciechanowski): one picture, then step through a real action.',
  layers: '<b>Layers</b> borrows from the C4 model (Structurizr): boxes in labelled tiers, opened in place.',
  pack: '<b>Circles</b> borrows from GitHub Next’s repo visualization and Observable’s zoomable circle packing. Click to zoom, background to zoom out.',
  treemap: '<b>Treemap</b> borrows from SpaceMonger and WinDirStat: area is lines of code, nothing hidden.',
  focus:
    '<b>Focus</b> borrows from Sourcetrail: one file in the middle, what uses it on the left, what it uses on the right. Click a neighbour to move.',
  flow: '<b>Network flow</b> is a Sankey diagram: band width is the number of keys a file puts on each channel.',
  frame:
    '<b>Frame</b> borrows from the Chrome DevTools and Perfetto flame chart: one frame, left to right, in run order.',
};
