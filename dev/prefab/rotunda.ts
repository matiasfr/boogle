// One level per rotunda site, generated from the kit and the site's row (docs/plans/roundhouse-rotunda.md, section d):
// `content/built/levels/rotunda-<id>.json`. A placement says only which piece it is and where round the table it
// stands, in bays from the site's `mid` (`turn`); the owning view stands it from the same site row
// (src/place/rotunda.ts `rotundaPose`) and shows it by stage (`rotundaShows`), so no derived number is stored.
import { ROTUNDA_HOME } from '../../src/place/home-station.ts';
import { rotundaPieces, type RotundaPart, type RotundaSite } from '../../src/place/rotunda.ts';
import type { LevelDef, Placement, PrefabKey } from '../../src/prefab/types.ts';

const SITES: readonly RotundaSite[] = [ROTUNDA_HOME];
const RECORD: Record<RotundaPart, PrefabKey> = {
  table: 'roundhouse.table-block',
  shell: 'roundhouse.bay-block',
  ruin: 'roundhouse.bay-ruin-block',
  door: 'roundhouse.bay-door-block',
  wall: 'roundhouse.end-wall-block',
  outline: 'roundhouse.bay-outline-block',
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
        const [left, right] = BROKEN[ruins % BROKEN.length]!;
        if (piece.part === 'ruin') ruins++;
        return {
          id: `rotunda-${site.id}.${piece.id}`,
          prefab: RECORD[piece.part],
          pos: [0, 0, 0],
          ...(piece.part === 'table' && scale !== 1 ? { scale: [scale, 1, scale] as const } : {}),
          params: { turn: piece.turn, ...(piece.part === 'ruin' ? { left, right } : {}) },
        };
      });
      return { place: `rotunda-${site.id}`, placements };
    }),
  };
}
