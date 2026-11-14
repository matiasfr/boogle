import { createHash } from 'node:crypto';
import { canonical } from './compiler.ts';
// Placement authority: join, never rewrite, the sim catalog and the existing view-only platform layout.
import { RAIL_HALTS } from '../../src/sim/railway-lines.ts';
import { HALT_PIER } from '../../src/prefab/halt-deck.ts';
import { HALTS, UP_HALTS, CROSSING_SPAN, CROSSING_WIDTH, FORMATION } from '../../src/place/layout.ts';
import { ISLAND, HEADS, BUFFERS, LINE_ORIGIN, AXIS, ISLAND_LEVER } from '../../src/place/home-station.ts';
import { prefabs as shared, haltSolids, type HaltPiece } from '../../src/content/prefabs/halts.ts';
import type { JsonObject, LevelDef } from '../../src/prefab/types.ts';

export function haltKitContent() {
  const entries: JsonObject[] = [];
  const pier = RAIL_HALTS.find((h) => h.name === 'Pier')!;
  const down = [...HALTS, { name: pier.name, line: pier.line, stop: pier.stop, ...HALT_PIER }];
  const sources = [
    ...down.map((h, row) => ({ ...h, row, up: false })),
    ...UP_HALTS.map((h, row) => ({ ...h, stop: HALTS[h.pair]!.stop, island: false, row, up: true })),
  ];
  for (const h of sources) {
    const id = RAIL_HALTS.findIndex((r) => r.line === h.line && r.stop === h.stop);
    if (id < 0) throw new Error(`halt kit: missing catalog row ${h.name}`);
    // Home's derived s/lat include native frame math: serialize only its authored deck length and side.
    const half = h.island ? ISLAND.deck / 2 : (h.s1 - h.s0) / 2;
    const hw = h.island ? ISLAND.width / 2 : 1.25;
    const pieces: HaltPiece[] = h.island
      ? h.line === 0
        ? ['deck', 'canopy', 'mast', 'display']
        : ['mast']
      : h.up
        ? ['deck', 'shelter', 'bench']
        : ['deck', 'shelter', 'bench', 'mast', 'display'];
    for (const piece of pieces) {
      const key = `railway.halt-${id}-${h.up ? 'up' : 'down'}-${piece}` as const;
      entries.push({
        id: key,
        prefab: `railway.halt-${piece}`,
        params: { row: h.row, up: h.up, halt: id, piece, sign: Math.sign(h.lat), hw, half, island: h.island === true },
        colliders: haltSolids(piece, Math.sign(h.lat), hw, half),
      });
    }
    if (!h.island || h.line === 0)
      entries.push({
        id: `railway.halt-${id}-${h.up ? 'up' : 'down'}-ramps`,
        prefab: 'railway.halt-ramp',
        params: { row: h.row, up: h.up, halt: id, piece: 'ramps' },
      });
  }
  for (const h of sources.filter((h) => !h.up)) {
    for (const piece of h.island ? ['signal', 'road-plaque'] : ['signal'])
      entries.push({
        id: `halt-${piece}-${h.row}`,
        prefab: `railway.halt-${piece}`,
        params: { row: h.row, up: false, piece, road: h.line },
        colliders: [],
      });
  }
  for (const h of sources.filter((h) => h.up))
    entries.push({
      id: `halt-crossing-${h.row}`,
      prefab: 'railway.halt-parts',
      params: { row: h.row, up: true, piece: 'crossing' },
    });
  for (const [id, h] of RAIL_HALTS.entries())
    if (h.line === 1 && h.leg)
      entries.push({
        id: `halt-stack-map-${h.stop}`,
        prefab: 'railway.halt-parts',
        params: { row: id, up: false, piece: 'stack-display' },
        colliders: [],
      });
  for (const h of sources)
    entries.push({
      id: `halt-lever-${h.row}-${h.up ? 'up' : 'down'}`,
      prefab: 'railway.halt-lever',
      params: { row: h.row, up: h.up, piece: 'lever', side: Math.sign(h.lat), plaque: 1 },
      colliders: [],
    });
  for (const [id, h] of RAIL_HALTS.entries()) {
    if (h.line !== 1 || h.stop < 4 || (h.stop > 5 && !h.leg)) continue;
    const stub = h.end?.kind === 'stub';
    for (const up of h.stop <= 5 || stub ? [false, true] : [false])
      entries.push({
        id: `halt-ring-lever-${h.stop}-${up ? 'up' : 'down'}`,
        prefab: 'railway.halt-lever',
        params: {
          row: id,
          up,
          piece: 'lever',
          ring: true,
          side: h.stop <= 5 && up ? -1 : 1,
          plaque: h.leg && stub ? 2 : 1,
        },
        colliders: [],
      });
  }
  // Frame construction still lives in the views. Keep its authored inputs in the freshness contract too.
  // Home s/lat are native-derived: fingerprint their authored operands, never those derived results.
  const dependencies = {
    catalog: RAIL_HALTS,
    platforms: HALTS.filter((h) => !h.island),
    upPlatforms: UP_HALTS,
    crossing: { span: CROSSING_SPAN, width: CROSSING_WIDTH, formation: FORMATION },
    lever: ISLAND_LEVER,
    home: { heads: HEADS, buffers: BUFFERS, island: ISLAND, origin: LINE_ORIGIN, bearing: AXIS.bearing },
  };
  const sourceFingerprint = createHash('sha256').update(canonical(dependencies)).digest('hex');
  const levels: LevelDef[] = [
    { place: 'halt-kit', placements: [], layout: { kind: 'halt-kit', sourceFingerprint, entries } },
  ];
  return { prefabs: shared, levels };
}
