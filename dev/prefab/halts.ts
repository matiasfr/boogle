import { createHash } from 'node:crypto';
import { canonical } from './compiler.ts';
// Placement authority: join, never rewrite, the sim catalog and the existing view-only platform layout.
import { RAIL_HALTS } from '../../src/sim/railway-lines.ts';
import { HALTS, UP_HALTS } from '../../src/place/layout.ts';
import { ISLAND, HEADS, BUFFERS, LINE_ORIGIN, AXIS } from '../../src/place/home-station.ts';
import { prefabs as shared, haltSolids, type HaltPiece } from '../../src/content/prefabs/halts.ts';
import type { JsonObject, LevelDef } from '../../src/prefab/types.ts';

export function haltKitContent() {
  const entries: JsonObject[] = [];
  const pier = RAIL_HALTS.find((h) => h.name === 'Pier')!;
  const down = [
    ...HALTS,
    { name: pier.name, line: pier.line, stop: pier.stop, s0: 719, s1: 741, lat: 2.9, island: false },
  ];
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
        ? ['deck', 'canopy', 'mast']
        : ['mast']
      : h.up
        ? ['deck', 'shelter', 'bench']
        : ['deck', 'shelter', 'bench', 'mast'];
    for (const piece of pieces) {
      const key = `railway.halt-${id}-${h.up ? 'up' : 'down'}-${piece}` as const;
      entries.push({
        id: key,
        prefab: `railway.halt-${piece}`,
        params: { row: h.row, up: h.up, halt: id, piece, sign: Math.sign(h.lat), hw, half },
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
  // Frame construction still lives in the views. Keep its authored inputs in the freshness contract too.
  // Home s/lat are native-derived: fingerprint their authored operands, never those derived results.
  const dependencies = {
    catalog: RAIL_HALTS,
    platforms: HALTS.filter((h) => !h.island),
    upPlatforms: UP_HALTS,
    home: { heads: HEADS, buffers: BUFFERS, island: ISLAND, origin: LINE_ORIGIN, bearing: AXIS.bearing },
  };
  const sourceFingerprint = createHash('sha256').update(canonical(dependencies)).digest('hex');
  const levels: LevelDef[] = [
    { place: 'halt-kit', placements: [], layout: { kind: 'halt-kit', sourceFingerprint, entries } },
  ];
  return { prefabs: shared, levels };
}
