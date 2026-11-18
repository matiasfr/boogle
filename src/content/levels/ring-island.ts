// Where Ring Island's furnishing stands, in the island's own frames (src/entities/ring-island/view.ts resolves them on
// load; the artifact holds these operands, not their product). Every placement's `place` says where:
//
// - `frame`: `halt` (the island halt), `brace` (the brace platform under the leaf's heel), `summit` (the summit
//   lookout) or `map-table` (where src/entities/ring-island/state.ts's RING_MAP_TABLE stands).
// - A value is a number (ring metres or metres up, as is) or `[from, ...add]`: `from` an anchor of the frame or a value,
//   then each `add` summed in order. Anchors: halt `start` and `end` (u of the halt's south and north ends), `east`
//   and `west` (lat of the east platform's east edge and the west platform's west edge), `deck` (the platforms' top); brace `u0`, `l1` (its seaward edge) and `top`; summit `cx`, `cz` (the island's
//   middle) and `top` (the deck's top, `lift` over the ground there). `ground` is the island's ground under the
//   thing; `arch-u` and `arch-y` are the middle of tile `arch.k` of the mural's arch.
// - `block` spans u, lat and y; `post` stands at (u, lat) or (x, z) from y0 to y1, w across the line and d along it;
//   `beam` runs from a to b, w wide and h deep, its top on the line between them; `at` is a point, turned by `turn`
//   (`line`: along it; `west`: facing the tracks from the east platform; `toward` a world (x, z) from the halt's middle).
import { defineLevel, type JsonObject, type Placement } from '../../prefab/types.ts';

const TIMBER_DARK = '#6a5038',
  STEEL = '#e8742c',
  STEEL_DARK = '#b8551e',
  GOLD = '#ffc83a',
  RAIL = '#3d3a38',
  CONCRETE = '#a6a29a',
  TARP = '#4f6b8a',
  LAND = '#4a4d5c',
  LAND2 = '#3b3e4c',
  SKY = '#8fc4e0',
  NIGHT = '#2c2e3a',
  SHARD = '#7fd0ff';

type A = number | readonly (string | number | A)[];
const halt = (place: JsonObject): JsonObject => ({ frame: 'halt', ...place });
/** A box of the furnishing: solid unless `drawn`. */
const box = (id: string, color: string, place: JsonObject, drawn = false): Placement => ({
  id,
  prefab: drawn ? 'ring.box-drawn' : 'ring.box',
  pos: [0, 0, 0],
  params: { place, color },
});
const block = (u: [A, A], lat: [A, A], y: [A, A]) => halt({ block: { u, lat, y } });

// The drop hammer stands 24 m up the halt, 11 m east of the line; the works wall's face is 15.2 m east, its south end
// 12 m short of the halt's north end.
/** The arch: `tiles` tiles at angles PI * (from + span * k / steps), centred (u, y) on the mural, radii ru and ry. */
const ARCH = { tiles: 9, from: 0.1, span: 0.8, steps: 8, u: 5.5, ru: 3.4, y: 3.0, ry: 2.6 };
/** Where the branch read points (world x, z): the Gorge's fork and Canopy's tree. */
const TOWARD = { gorge: [-103, -1988], canopy: [-1085, -313] } as const;
const HAMMER = { u: ['start', 24] as const, lat: 11 };
const hu = (d: number) => [...HAMMER.u, d] as const;
const WALL = { u0: ['end', -12] as const, face: 15.2 };
/** A mural panel on the wall's face, a0..a1 along it from its south end, y0..y1 up, standing `inset` proud of it. */
const panel = (id: string, color: string, a0: A, a1: A, y0: A, y1: A, inset = 0.02, arch?: number) =>
  box(
    `halt/mural/${id}`,
    color,
    {
      ...block(
        [
          [...WALL.u0, a0],
          [...WALL.u0, a1],
        ],
        [
          [WALL.face, -inset, -0.03],
          [WALL.face, -inset],
        ],
        [
          ['deck', y0],
          ['deck', y1],
        ],
      ),
      ...(arch === undefined ? {} : { arch: { ...ARCH, k: arch } }),
    },
    true,
  );

export const levels = [
  defineLevel({
    place: 'ring-island',
    placements: [
      // ------------------------------------------------ the brace platform
      // One of the folk, waving you over, 4 m along the platform and 3 m in from its seaward edge.
      {
        id: 'brace/folk',
        prefab: 'ring.folk',
        pos: [0, 0, 0],
        params: { place: { frame: 'brace', at: { u: ['u0', 4], lat: ['l1', -3], y: ['top'] } }, wave: true },
      },
      // ------------------------------------------------ the island halt
      // The RINGWORKS board on the east platform, its face to the tracks: the frame behind the face and two legs.
      box(
        'halt/board/frame',
        STEEL_DARK,
        halt({
          post: {
            u: ['start', 20],
            lat: ['east', -0.3],
            y: [
              ['deck', 3.3],
              ['deck', 4.7],
            ],
            w: 0.2,
            d: 5.2,
          },
        }),
        true,
      ),
      ...[-2.3, 2.3].map((du, k) =>
        box(
          `halt/board/leg${k + 1}`,
          RAIL,
          halt({
            post: { u: ['start', 20, du], lat: ['east', -0.3], y: [['deck'], ['deck', 3.4]], w: 0.15, d: 0.15 },
          }),
          true,
        ),
      ),
      {
        id: 'halt/board/face',
        prefab: 'ring.board-face',
        pos: [0, 0, 0],
        params: { place: halt({ at: { u: ['start', 20], lat: ['east', -0.42], y: ['deck', 4.0] }, turn: 'west' }) },
        labels: { face: 'ring.ringworks' },
      },
      // The works yard east of the halt: its deck level with the east platform, and the steel waiting under a tarp.
      box('halt/yard/deck', CONCRETE, block([['start', 2], ['end']], [['east'], 16], [-1, ['deck']])),
      box(
        'halt/yard/steel',
        STEEL,
        block(
          [
            ['start', 3],
            ['start', 15],
          ],
          [7.5, 13.5],
          [['deck'], ['deck', 1.4]],
        ),
      ),
      box(
        'halt/yard/tarp',
        TARP,
        block(
          [
            ['start', 2.6],
            ['start', 15.4],
          ],
          [7.1, 13.9],
          [
            ['deck', 1.4],
            ['deck', 1.9],
          ],
        ),
      ),
      // The drop hammer: its anvil, two uprights and the crossbar (the head is its own, below).
      box(
        'halt/hammer/anvil',
        STEEL_DARK,
        block(
          [hu(-1.2), hu(1.2)],
          [
            [HAMMER.lat, -1.2],
            [HAMMER.lat, 1.2],
          ],
          [['deck'], ['deck', 0.6]],
        ),
      ),
      ...[-1, 1].map((s, k) =>
        box(
          `halt/hammer/upright${k + 1}`,
          STEEL_DARK,
          block(
            [hu(-0.25), hu(0.25)],
            [
              [HAMMER.lat, s * 1.9, -0.25],
              [HAMMER.lat, s * 1.9, 0.25],
            ],
            [['deck'], ['deck', 6]],
          ),
        ),
      ),
      box(
        'halt/hammer/crossbar',
        STEEL_DARK,
        block(
          [hu(-0.3), hu(0.3)],
          [
            [HAMMER.lat, -2.2],
            [HAMMER.lat, 2.2],
          ],
          [
            ['deck', 6],
            ['deck', 6.5],
          ],
        ),
      ),
      {
        id: 'halt/hammer/head',
        prefab: 'ring.hammer-head',
        pos: [0, 0, 0],
        params: { place: halt({ at: { u: HAMMER.u, lat: HAMMER.lat, y: ['deck', 0.6, 0.55] }, turn: 'line' }) },
      },
      // The works wall and the prophecy mural on its face to the halt: the island under the ring, the line coming in
      // from the south, a box on the line.
      box('halt/wall', CONCRETE, block([WALL.u0, ['end', -0.5]], [WALL.face, 16], [['deck'], ['deck', 6.5]])),
      panel('sky', SKY, 0.6, 10.9, 1.2, 6.0),
      panel('island', LAND, 2.0, 9.0, 1.2, 2.4, 0.04),
      panel('hill', LAND2, 3.6, 7.0, 2.4, 3.3, 0.04),
      // The ring overhead, as an arch of night tiles.
      ...Array.from({ length: ARCH.tiles }, (_, k) =>
        panel(`ring${k + 1}`, NIGHT, ['arch-u', -0.35], ['arch-u', 0.35], ['arch-y', -0.3], ['arch-y', 0.3], 0.06, k),
      ),
      panel('shard', SHARD, 5.2, 5.8, 4.4, 5.3, 0.08),
      panel('line', STEEL, 0.6, 5.0, 1.4, 1.7, 0.06),
      panel('box', GOLD, 3.2, 3.9, 1.7, 2.3, 0.08),
      // The branch read (ruling 4), beside the west platform: a two-armed fingerpost with painted emblems only (the
      // Gorge's fork, Canopy's tree; the names are the owner's), and the low map table with the branch lines dashed.
      // The post stands on the fill 1.3 m off the platform's west edge, not on the platform: its arms point west, away
      // from the deck, so from the crossing ramp and the platform it stands left of the footbridge and not over it.
      box(
        'halt/fingerpost/post',
        TIMBER_DARK,
        halt({
          post: {
            u: ['start', 8],
            lat: ['west', -1.3],
            y: [
              ['ground', -0.3],
              ['deck', 3.7],
            ],
            w: 0.28,
            d: 0.28,
          },
        }),
        true,
      ),
      ...(
        [
          ['gorge', 3.2],
          ['canopy', 2.45],
        ] as const
      ).map(([emblem, y]) => ({
        id: `halt/fingerpost/${emblem}`,
        prefab: 'ring.fingerpost-arm' as const,
        pos: [0, 0, 0] as const,
        params: {
          place: halt({
            at: { u: ['start', 8], lat: ['west', -1.3], y: ['deck', y] },
            turn: { toward: TOWARD[emblem] },
          }),
          emblem,
        },
      })),
      {
        id: 'halt/map-table',
        prefab: 'ring.map-table',
        pos: [0, 0, 0],
        params: { place: { frame: 'map-table', ...TOWARD } },
      },
      // ------------------------------------------------ the summit lookout
      {
        id: 'summit/deck',
        prefab: 'ring.summit-deck',
        pos: [0, 0, 0],
        // `lift`: the deck's top over the ground at the island's middle (the summit frame's `top`).
        params: { place: { frame: 'summit', lift: 0.3, at: { x: ['cx'], z: ['cz'], y: ['top'] } } },
      },
      {
        id: 'summit/folk',
        prefab: 'ring.folk',
        pos: [0, 0, 0],
        params: { place: { frame: 'summit', at: { x: ['cx', 2], z: ['cz', -1.5], y: ['top'] } } },
      },
      // A short ramp from the path's end up onto the deck, whose rim stands about 1.5 m over the slope.
      box('summit/ramp', CONCRETE, {
        frame: 'summit',
        beam: {
          a: { along: [4, 6], d: 11.5, y: ['ground', 0.15] },
          b: { along: [4, 6], d: 5.2, y: ['top'] },
          w: 2.4,
          h: 0.4,
        },
      }),
    ],
  }),
];
