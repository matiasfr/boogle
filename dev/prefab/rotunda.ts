// One level per rotunda site, generated from the kit and the site's row (docs/plans/roundhouse-rotunda.md, section d):
// `content/built/levels/rotunda-<id>.json`. A placement says only which piece it is and where round the table it
// stands, in bays from the site's `mid` (`turn`); the owning view stands it from the same site row
// (src/place/rotunda.ts `rotundaPose`) and shows it by stage (`rotundaShows`), so no derived number is stored.
import { ROTUNDA_HOME } from '../../src/place/home-station.ts';
import { ROTUNDA_PORT_QUAY } from '../../src/place/port-quay.ts';
import { bayOccupants, copyBays, rotundaPieces, type RotundaPart, type RotundaSite } from '../../src/place/rotunda.ts';
import type { LevelDef, Placement, PrefabKey } from '../../src/prefab/types.ts';

const SITES: readonly RotundaSite[] = [ROTUNDA_HOME, ROTUNDA_PORT_QUAY];
const RECORD: Record<RotundaPart, PrefabKey> = {
  table: 'roundhouse.table',
  shell: 'roundhouse.bay',
  ruin: 'roundhouse.bay-ruin',
  door: 'roundhouse.bay-doors',
  wall: 'roundhouse.end-wall',
  outline: 'roundhouse.bay-outline',
};
/** A ruin's two door piers stand at broken heights, up to the full door wall (design review, call 8, which asked 2.5 m
 * up: the lowest here is 3.2 m, over the record's 3.1 m solid). Each bay takes the next pair, so no two neighbours
 * break alike. */
const BROKEN = [
  [3.4, 6.2],
  [5.2, 3.2],
  [3.6, 4.4],
  [6.2, 3.8],
] as const;
/** The table record is authored for an 8 m table. */
const TABLE_R = 8;

export function rotundaContent(): { levels: LevelDef[] } {
  return {
    levels: SITES.map((site) => {
      let ruins = 0;
      const placements = rotundaPieces(site).map((piece): Placement => {
        const scale = site.tableR / TABLE_R;
        const broken = piece.part === 'ruin' ? BROKEN[ruins++ % BROKEN.length]! : undefined;
        return {
          id: `rotunda-${site.id}.${piece.id}`,
          prefab: piece.part === 'shell' && Math.abs(piece.turn) === 2 ? 'roundhouse.bay-steel' : RECORD[piece.part],
          pos: [0, 0, 0],
          ...(piece.part === 'table' && scale !== 1 ? { scale: [scale, 1, scale] as const } : {}),
          params: { turn: piece.turn, ...(broken ? { left: broken[0], right: broken[1] } : {}) },
        };
      });
      placements.push({
        id: `rotunda-${site.id}.open-doors`,
        prefab: 'roundhouse.bay-open-doors',
        pos: [0, 0, 0],
        params: { turn: 0 },
      });
      for (const bay of bayOccupants(site, { serving: 1 }).waiting) {
        for (const [part, prefab] of [
          ['waiting', 'roundhouse.waiting-engine'],
          ['open', 'roundhouse.bay-open-doors'],
        ] as const)
          placements.push({
            id: `rotunda-${site.id}.${part}-${bay}`,
            prefab,
            pos: [0, 0, 0],
            params: { turn: bay },
          });
      }
      // Garage step 4: each line's works copy in its bay (the engine is the view's, wearing the line's row): the plate
      // in the line's colour and the engine's solid, and the Strong flatbed behind it.
      for (const { bay, colour } of copyBays(site)) {
        placements.push({
          id: `rotunda-${site.id}.copy-${bay}`,
          prefab: 'roundhouse.copy-plate',
          pos: [0, 0, 0],
          params: { turn: bay, colour },
        });
        placements.push({
          id: `rotunda-${site.id}.flatbed-${bay}`,
          prefab: 'roundhouse.copy-flatbed',
          pos: [0, 0, 0],
          params: { turn: bay },
        });
      }
      return { place: `rotunda-${site.id}`, placements };
    }),
  };
}
