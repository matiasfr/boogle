// Placement authority: join, never rewrite, the sim catalog and the existing view-only platform layout.
import { RAIL_HALTS } from '../../src/sim/railway-lines.ts';
import { HALTS, UP_HALTS } from '../../src/place/layout.ts';
import { ISLAND } from '../../src/place/home-station.ts';
import { haltPiece, type HaltPiece } from '../../src/content/prefabs/halts.ts';
import type { LevelDef, Placement, PrefabDef } from '../../src/prefab/types.ts';

export function haltKitContent() {
  const prefabs: PrefabDef[] = [],
    placements: Placement[] = [];
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
        ? ['canopy', 'mast']
        : ['mast']
      : h.up
        ? ['shelter', 'bench']
        : ['shelter', 'bench', 'mast'];
    for (const piece of pieces) {
      const key = `railway.halt-${id}-${h.up ? 'up' : 'down'}-${piece}` as const;
      prefabs.push(haltPiece(key, piece, Math.sign(h.lat), hw, half));
      placements.push({ id: key, prefab: key, pos: [0, 0, 0], params: { row: h.row, up: h.up, halt: id, piece } });
    }
  }
  const levels: LevelDef[] = [{ place: 'halt-kit', placements }];
  return { prefabs, levels };
}
