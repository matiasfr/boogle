// Where the lookout's records stand. The telescope is in Place's frame (src/place/layout.ts: x from ORIGIN, z as is), its
// y above the ground there. The buoys stand on the pier line, from the end of the east line straight towards Ring Island's
// middle (FAR), `gaps` times `gap` metres out; y is the height above the sea. src/entities/lookout/view.ts resolves both
// on load (the artifact holds the operands, not their product).
import { defineLevel } from '../../prefab/types.ts';

/** Place's 12 buoys, cut to 7: the last five stood inside Ring Island's hills (land.ts buildFar, 340 m round the shard). The
 * seventh floats about 20 m off its waterline, so the line runs right up to the island. Their order is RING_BUOYS'. */
const BUOYS = { n: 7, gap: 62 };

export const levels = [
  defineLevel({
    place: 'lookout',
    placements: [
      // Place's SCOPE (-30, -205) stood among the ridge-top pines, two of them within 5 m, and one 15 m off blocked the
      // view. Moved 15 m east, still on the ridge's top (about 49 m), where the slope north-east is open down to the sea.
      { id: 'place-scope', prefab: 'lookout.telescope', pos: [-15, 0, -207] },
      // Afloat at 0.7 m, the first 0.6 of a gap out from the pier's end.
      ...Array.from({ length: BUOYS.n }, (_, k) => ({
        id: `buoy${k + 1}`,
        prefab: 'lookout.buoy' as const,
        pos: [0, 0.7, 0] as const,
        params: { gaps: k + 0.6, gap: BUOYS.gap },
      })),
    ],
  }),
];
