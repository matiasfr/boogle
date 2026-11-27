// Drafted for the owner's edit; none is The Boogler's.
import type { WorksSite } from '../../sim/railway-queries-room.ts';

export const WORKS_LINES = {
  wake: { name: "The camp's track layer", objective: 'Wake the track layer at camp.' }, // draft:
  forge: { name: 'The forge', objective: 'Help at the forge.' }, // draft:
  lever: { name: 'The quarry lever', objective: 'Help at the quarry lever.' }, // draft:
  hook: { name: 'The hook shot', objective: 'Help at the hook shot.' }, // draft:
  sea: { name: 'The sea switch', objective: 'Help at the sea switch.' }, // draft:
  boiler: { name: 'The boiler', objective: 'Help at the boiler.' }, // draft:
  trains: { name: 'The old train', objective: 'Help at the old train.' }, // draft:
  breaker: { name: 'The breaker', objective: 'Help at the breaker.' }, // draft:
  slab: { name: 'The stall slab', objective: 'Help at the stall slab.' }, // draft:
  throat: { name: 'The kiln throat', objective: 'Help at the kiln throat.' }, // draft:
  kiln: { name: 'The kiln', objective: 'Help at the kiln.' }, // draft:
  stall: { name: 'The Roundhouse stall', objective: 'Help at the Roundhouse stall.' }, // draft:
  cradle: { name: 'The cradle', objective: 'Help at the cradle.' }, // draft:
  table: { name: 'The Roundhouse table', objective: 'Help at the Roundhouse table.' }, // draft:
  upgrade: { name: 'The footing wagon', objective: 'Help at the footing wagon.' }, // draft:
  crossing: { name: 'The pier crossing', objective: 'Help at the pier crossing.' }, // draft:
  bents: { name: 'The railhead', objective: 'Help at the railhead.' }, // draft:
  brace: { name: 'The raised leaf', objective: 'Help at the raised leaf.' }, // draft:
  weights: { name: 'The counterweight', objective: 'Help at the counterweight.' }, // draft:
  rivet: { name: 'The rivet', objective: 'Help at the rivet.' }, // draft:
  steelworks: {
    name: "Ring Island's steel works",
    objective: "Light Ring Island's steel works. Ride line 2 to the island; the train brings its kit.",
  }, // draft:
  install: {
    name: 'The longer boiler',
    objective: 'Steel is in the Roundhouse bay. Hold Install at the table for the longer boiler.',
  }, // draft:
  pick: { name: 'The powered pick', objective: 'High Gorge is open. Ride line 2 to its end and climb the stair.' }, // draft:
  seeds: { name: 'The crystal seeds', objective: 'Take the crystal seeds' }, // draft:
  cloth: { name: 'The glider cloth', objective: 'Take the glider cloth' }, // draft:
  lantern: { name: 'The lantern', objective: 'Take the lantern at Lantern Notch (placeholder)' }, // draft:
  arrive: { name: 'The Original Island', objective: 'Ride to the Original Island (placeholder)' }, // draft:
  'incline-gate': { name: 'Incline barrier', objective: "Open the incline's barrier" }, // draft:
  'canopy-gate': { name: 'Canopy barrier', objective: 'Open the barrier to Canopy' }, // draft:
  'plug-gate': { name: 'Plug at the West landing', objective: 'Open the sea-cave plug at the West landing' }, // draft:
  'deep-gate': { name: 'Deep barrier', objective: "Open the deep span's barrier (placeholder)" }, // draft:
  'notch-gate': { name: 'Notch barrier', objective: 'Open the Notch barrier at Canopy Town (placeholder)' }, // draft:
  'causeway-gate': { name: 'Causeway barrier', objective: "Open the causeway's barrier at Bell Rock (placeholder)" }, // draft:
  'stack-1': {
    name: 'High Gorge, section 1',
    objective: "Build the line to High Gorge: section 1 of 4. The frame is on Ring Island's west platform.",
  }, // draft:
  'stack-2': {
    name: 'High Gorge, section 2',
    objective: 'Build the line to High Gorge: section 2 of 4. Ride line 2 to the railhead.',
  }, // draft:
  'stack-3': {
    name: 'High Gorge, section 3',
    objective: 'Build the line to High Gorge: section 3 of 4. Ride line 2 to the railhead.',
  }, // draft:
  'stack-4': {
    name: 'High Gorge, section 4',
    objective: 'Build the line to High Gorge: section 4 of 4. Ride line 2 to the railhead.',
  }, // draft:
  'incline-1': { name: 'Bell Rock, section 1', objective: 'Build the incline to Bell Rock' }, // draft:
  'incline-2': { name: 'Bell Rock, section 2', objective: 'Build the incline to Bell Rock' }, // draft:
  'bay-1': { name: 'Bay line, section 1', objective: 'Build the bay line from the West landing' }, // draft:
  'bay-2': { name: 'Bay line, section 2', objective: 'Build the bay line from the West landing' }, // draft:
  'canopy-1': { name: 'Canopy Town, section 1', objective: 'Build the line to Canopy Town' }, // draft:
  'canopy-2': { name: 'Canopy Town, section 2', objective: 'Build the line to Canopy Town' }, // draft:
  'canopy-3': { name: 'Canopy Town, section 3', objective: 'Build the line to Canopy Town' }, // draft:
  'cave-1': { name: 'Port Quay, section 1', objective: 'Build the cave line to Port Quay' }, // draft:
  'cave-2': { name: 'Port Quay, section 2', objective: 'Build the cave line to Port Quay' }, // draft:
  'cave-3': { name: 'Port Quay, section 3', objective: 'Build the cave line to Port Quay' }, // draft:
  'wall-1': {
    name: 'White Wall, section 1',
    objective: 'Build the line along the White Wall to High Gorge (placeholder)',
  }, // draft:
  'wall-2': {
    name: 'White Wall, section 2',
    objective: 'Build the line along the White Wall to High Gorge (placeholder)',
  }, // draft:
  'wall-3': {
    name: 'White Wall, section 3',
    objective: 'Build the line along the White Wall to High Gorge (placeholder)',
  }, // draft:
  'wall-4': {
    name: 'White Wall, section 4',
    objective: 'Build the line along the White Wall to High Gorge (placeholder)',
  }, // draft:
  'wall-5': {
    name: 'White Wall, section 5',
    objective: 'Build the line along the White Wall to High Gorge (placeholder)',
  }, // draft:
  'wall-6': {
    name: 'White Wall, section 6',
    objective: 'Build the line along the White Wall to High Gorge (placeholder)',
  }, // draft:
  'notch-1': { name: 'Lantern Notch, section 1', objective: 'Build the line to Lantern Notch (placeholder)' }, // draft:
  'causeway-1': {
    name: 'Original Island, section 1',
    objective: 'Build the causeway to the Original Island (placeholder)',
  }, // draft:
  T1: { name: 'Station 1', objective: 'Help at Station 1.' }, // draft:
  T2: { name: 'Station 2', objective: 'Help at Station 2.' }, // draft:
  T3: { name: 'Station 3', objective: 'Help at Station 3.' }, // draft:
  Q1: { name: 'Station 4', objective: 'Help at Station 4.' }, // draft:
  Q2: { name: 'Station 5', objective: 'Help at Station 5.' }, // draft:
  Q3: { name: 'Station 6', objective: 'Help at Station 6.' }, // draft:
  Q4: { name: 'Station 7', objective: 'Help at Station 7.' }, // draft:
  Q5: { name: 'Station 8', objective: 'Help at Station 8.' }, // draft:
  Q6: { name: 'Station 9', objective: 'Help at Station 9.' }, // draft:
  Q7: { name: 'Station 10', objective: 'Help at Station 10.' }, // draft:
} satisfies Record<WorksSite, { name: string; objective: string }>;

export const WORKS_COMPLETE = 'All lines connected! Ride wherever you like.'; // draft:
export const WORKS_VARIANTS = {
  feeding: "Light the steel works: carry the kit from Ring Island's yard into the shed.", // draft:
  casting: 'The steel works is casting. Line 2 carries its steel Home to the Roundhouse.', // draft:
  fork: 'Build the line to Canopy Town or the cave line to Port Quay (placeholder)', // draft:
  caveFirst: 'Ride to Bell Rock and build the line to Canopy Town (placeholder)', // draft:
};

export const WORKS_LABELS = {
  work: 'The works', // draft:
  needs: 'Needs', // draft:
  gives: 'Gives', // draft:
  thanks: 'Thanks', // draft:
  train: 'Train', // draft:
  walk: 'Walk', // draft:
  line: 'Line', // draft:
  queued: 'queued', // draft:
  aboard: 'aboard', // draft:
  way: 'On the way', // draft:
} as const; // draft:
export const WORKS_GIFTS = {
  axe: 'The axe', // draft:
  hook: 'The hook shot', // draft:
  trains: 'Trains on both lines', // draft:
  footings: 'Footings', // draft:
  wagon: 'The footing wagon', // draft:
  'longer-boiler': 'The longer boiler', // draft:
  ending: 'All lines connected', // draft:
} as const; // draft:
export const WORKS_ACTIONS = {
  wake: 'Wake the track layer', // draft:
  bill: 'Wait for the track layer', // draft:
  beam: 'Bring the great beam', // draft:
  part: 'Carry the breaker', // draft:
  boiler: 'Carry the boiler', // draft:
  strike: 'Strike with the breaker', // draft:
  kiln: 'Feed the kiln', // draft:
  footing: 'Set a footing', // draft:
  cradle: 'Fit the cradle', // draft:
  table: 'Turn the handle', // draft:
  install: 'Install at the post', // draft:
  gate: 'Open the way', // draft:
  key: 'Take the part', // draft:
  barrier: 'Open the barrier', // draft:
  plug: 'Pull the plug', // draft:
  brace: 'Knock the pawl', // draft:
  arrive: 'Meet at the post', // draft:
} as const; // draft:
