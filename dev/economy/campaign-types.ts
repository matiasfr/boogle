// Offline paper inputs only. Seconds, metres, metres/second and integer material units.
export type Stock = Record<string, number>;
export type Kind = 'F' | 'C' | 'A' | 'M' | 'R' | 'E';
export const POLICIES = ['route-first', 'tool-first', 'cart-first', 'town-first', 'optional-first'] as const;
export type Policy = (typeof POLICIES)[number];
export type Profile = {
  carry: number;
  rack: number;
  walkMps: number;
  glideMps: number;
  hookMps: number;
  hookM: number;
  extraJumps: number;
  sourceRate: number;
  trainRate: number;
  wagon: number;
  pickupS: number;
  unloadS: number;
  carryDistance: number;
  hooks: string[];
  removedChores: string[];
};
export type Effect = { profile?: Partial<Profile>; chore?: string };
export type Path = {
  id: string;
  mode: 'walk' | 'glide' | 'hook';
  metres: number;
  puzzleS: number;
  needs?: { extraJumps?: number; glideMps?: number; hookM?: number; hookType?: string; unlock?: string };
};
export type Task = {
  id: string;
  label: string;
  area: string;
  site: string;
  requires: string[];
  optional?: boolean;
  kind?: Kind;
  bill: Stock;
  authoredS: number; // proposed activity, never a clock gate; scaled independently of costs
  buildS: number; // funded machine work; may finish while absent
  carryM: number;
  paths?: Path[];
  effect?: Effect;
  practice?: string;
};
export type Source = {
  id: string;
  node: string;
  requires: string[];
  raw: string;
  good: string;
  reserve: number;
  seed: number; // guaranteed first stock, charged to initial ledger once
  batch: number; // 1 raw -> 1 component per unit; explicit recipe ledger
  seconds: number;
};
export type Line = {
  id: string;
  from: string;
  to: string;
  requires: string[];
  metres: number;
  speedMps: number;
  accelerationMps2: number;
  dwellS: number;
  transferS: number;
  trains: number;
  capacity: number;
};
export type Presence = { atS: number; players: string[] };
export type Campaign = {
  id: string;
  name: string;
  provenance: string[];
  targetS: number;
  horizonS: number;
  maxPurchases: number;
  warningGapS: number;
  profile: Profile;
  sources: Source[];
  lines: Line[];
  tasks: Task[];
  terminal: string;
  scenarios: Record<string, Presence[]>;
};
export type CampaignOptions = {
  policy?: Policy;
  optional?: boolean;
  omit?: string[];
  content?: number;
  cost?: number;
  supply?: number;
  distance?: number;
  presence?: Presence[];
};
