// The economy prototype's map: the Sickle Isles layout from docs/world/map-prototypes.html's #map-data (the one source
// for its positions, read through the greybox's loader), joined to the ring model's slots and route steps.
// Pure apart from the file read; the page gets the result as JSON, the Node test calls it directly.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { layout, parseMapPage, polyLen, stageOf, type XZ } from '../../src/proto/greybox/map-data.ts';
import { PLACES, RESOURCES, ROUTE } from './ring-data.ts';

export type Stage2 = [ifGorgeFirst: number | null, ifCanopyFirst: number | null];
export type PlayPlace = {
  id: string;
  name: string;
  kind: string;
  at: XZ;
  reach: Stage2;
  minor: boolean;
  gives: string;
};
export type PlayLine = {
  id: string;
  name: string;
  from: string;
  to: string;
  kind: string;
  stage: Stage2;
  pts: XZ[];
  m: number;
};
export type PlayMap = {
  option: string;
  name: string;
  places: PlayPlace[];
  lines: PlayLine[];
  land: { id: string; outline: XZ[]; walk: boolean; tint: string | null }[];
  gates: { id: string; name: string; at: XZ; needs: string }[];
  secrets: { id: string; name: string; at: XZ }[];
  /** Ring-model slot → map place. b1/b2 resolve through the branch order, so they are absent here. */
  slots: Record<string, string>;
  branches: { gorge: string; canopy: string };
  /** Ring-model route key → the map's stage, the point in the stepper where that step's lines and places open. */
  stepStage: Record<string, number>;
};

const MAP_PAGE = fileURLToPath(new URL('../../docs/world/map-prototypes.html', import.meta.url));
export const OPTION = 'sickle';

// The bridge between the two models, the one hand-written part: which map stage each ring-model step belongs to.
// The map's stages (map-prototypes.md, Sickle Isles: "Order becomes Ring, first branch, shortcut, second branch, Port
// (double-back), ring closure, ending") put the second branch before High Port, the reverse of ring-data's ROUTE.
const STEP_STAGE: Record<string, number> = {
  'home.line1': 0,
  'home.forge': 0,
  'home.line2': 0,
  'splitrock.reach': 1,
  'splitrock.connect': 1,
  'ring.reach': 2,
  'ring.connect': 2,
  'hub.roundhouse': 2,
  'b1.reach': 3,
  'b1.connect': 3,
  spoke1: 4,
  'b2.reach': 5,
  'b2.connect': 5,
  'port.reach': 6,
  'port.connect': 6,
  'ring.close': 7,
  final: 8,
};
const SLOT_PLACE: Record<string, string> = {
  home: 'home',
  splitrock: 'splitrock',
  ring: 'ring',
  port: 'port',
  original: 'original',
  'stop-bell': 'bell',
};

const round = (p: XZ): XZ => [Math.round(p[0]), Math.round(p[1])];

export function playMap(html = readFileSync(MAP_PAGE, 'utf8')): PlayMap {
  const data = parseMapPage(html);
  const a = layout(data, OPTION, 'A'); // outlines don't depend on the pick; stages are resolved for both below
  const choice = (a.option as unknown as { choice: { A: string; B: string } }).choice;
  // The map's pick A is its choice.A branch first; the ring model names branches canopy and gorge.
  const firstIsA = { gorge: choice.A === 'gorge', canopy: choice.A === 'canopy' };
  if (firstIsA.gorge === firstIsA.canopy) throw new Error(`Sickle choice ${choice.A}/${choice.B} isn't gorge/canopy`);
  const two = (sA: number | null, sB: number | null): Stage2 => (firstIsA.gorge ? [sA, sB] : [sB, sA]);
  const places = a.places.map((p): PlayPlace => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    at: round(p.at),
    reach: two(stageOf(p.reach, 'A'), stageOf(p.reach, 'B')),
    minor: !!p.minor,
    gives: p.gives ?? '',
  }));
  const lines = a.lines.map((l): PlayLine => ({
    id: l.id,
    name: l.name,
    from: l.from,
    to: l.to,
    kind: l.kind,
    stage: two(stageOf(l.stage, 'A'), stageOf(l.stage, 'B')),
    pts: l.pts.map(round),
    m: Math.round(polyLen(l.pts)),
  }));
  const ids = new Set(places.map((p) => p.id));
  for (const [slot, id] of Object.entries(SLOT_PLACE))
    if (!ids.has(id)) throw new Error(`ring slot ${slot} maps to ${id}, which the Sickle map lacks`);
  for (const id of ['gorge', 'canopy']) if (!ids.has(id)) throw new Error(`the Sickle map has no ${id}`);
  for (const r of ROUTE) if (STEP_STAGE[r.key] === undefined) throw new Error(`route step ${r.key} has no map stage`);
  for (const r of RESOURCES)
    if (!r.source.startsWith('branch:') && !SLOT_PLACE[r.source]) throw new Error(`no map place for ${r.source}`);
  for (const p of PLACES)
    if (p.kind !== 'stop' && p.slot !== 'b1' && p.slot !== 'b2' && !SLOT_PLACE[p.slot])
      throw new Error(`no map place for ring slot ${p.slot}`);
  for (const l of lines) if (!ids.has(l.from) || !ids.has(l.to)) throw new Error(`line ${l.id} ends off the map`);
  return {
    option: OPTION,
    name: a.option.name,
    places,
    lines,
    land: a.land.map((g) => ({
      id: g.id,
      outline: g.outline.map(round),
      walk: g.walk !== false,
      tint: g.tint ?? null,
    })),
    gates: a.gates.map((g) => ({ id: g.id, name: g.name, at: round(g.at), needs: g.needs ?? '' })),
    secrets: a.secrets.map((g) => ({ id: g.id, name: g.name, at: round(g.at) })),
    slots: SLOT_PLACE,
    branches: { gorge: 'gorge', canopy: 'canopy' },
    stepStage: STEP_STAGE,
  };
}
