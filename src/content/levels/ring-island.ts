// Where Ring Island's furnishing stands, in the island's own frames (src/entities/ring-island/view.ts resolves them on
// load; the artifact holds these operands, not their product). Every placement's `place` says where:
//
// - `frame`: `halt` (the island halt), `brace` (the brace platform under the leaf's heel), `line` (the Way's own
//   frame), `steps` (the steps up from the brace platform, src/sim/railway-ring-layout.ts's RING_STEPS), `summit` (the
//   summit lookout), `map-table` (where src/entities/ring-island/state.ts's RING_MAP_TABLE stands), `pennant` (block
//   `footing` of the pennant pole's footing, src/entities/ring-island-far/view.ts's pennantFooting, its one
//   definition), `flight` and `landing` (row `flight` or `landing` of RING_RAMPS[`ramp`], the sea ramps),
//   `crossover` (metre `k` of RING_END.cross, the crossover on the Way), `path` (length `k` of leg `leg` of the summit
//   path, src/entities/ring-island/path.ts's summitPath), `bridge` (its footbridge, summitBridge; with `bent`, that
//   bent of SUMMIT_BRIDGE.bents) or `rim` (rock `k` of summitRimRocks, as its `stone` or its `box`).
// - A value is a number (ring metres or metres up, as is), `{ deck: u }` (the Way's deck top at u) or `[from, ...add]`:
//   `from` an anchor of the frame or a value, then each `add` summed in order. Anchors: halt `start` and `end` (u of
//   the halt's south and north ends), `east` and `west` (lat of the east platform's east edge and the west platform's
//   west edge), `deck` (the platforms' top), `up-l0`, `up-l1`, `up-mid`, `up-width` (the west platform's laterals,
//   middle and width) and the same `down-` (the east's), `rail` (the rail tops' level), `left` and `right` (the
//   formation's edges), `x-u0`, `x-u1`, `x-landing0`, `x-landing1`, `ramp-top` and `x-top` (the foot crossing,
//   RING_CROSSING) and `path-x`, `path-z` (world x, z where the summit path starts); brace `u0`, `u1`, `l0`, `l1` (its
//   seaward edge), `top`, `hinge` (u of the hinge edge), `right` (lat of the Way's east edge) and `strut-x`, `strut-z`
//   (world x, z of RING_BRACE, the gold strut's foot); line `hinge`, `left`, `right`, `mid` (the formation's middle),
//   `width`, `halt` (u of the halt's south end), `end` (2 m past its north end, where the Way's deck stops) and
//   `track1`, `track2` (the tracks' lats); crossover `u0`, `u1`, `lat0`, `lat1` (the metre's ends and the eased
//   homeward track's lat there); flight `u0`, `u1`, `lat`, `y0`, `y1`, `len`, `mid` and `mid-y` (u and top at its
//   middle); landing `u0`, `u1`, `l0`, `l1`, `y`, `mid` and `lat-mid`; steps `u0`, `u1`, `lat`, `y0`, `top`
//   (RING_STEPS) and `right`; summit `cx`, `cz` (the island's middle) and `top` (the deck's top, `lift` over the ground
//   there); path `x0`, `z0`, `x1`, `z1` (the length's ends, world x and z); bridge `a-x`, `a-y`, `a-z` and the
//   same `b-` (the deck's top at its ends), `span`, `width`, `thick`, `under` (its underside from its top, negative),
//   `parapet` (the parapets' height), `parapet-l`, `parapet-r` (their sides), `yaw` (along the deck), and with `bent`
//   `bent-d` (that bent along the deck) and `bent-under` (the deck's underside there). `ground` is the island's ground
//   under the thing; `arch-u` and `arch-y` are the middle of tile `arch.k` of
//   the mural's arch; `plank-l0`, `plank-l1` the laterals of the foot crossing's plank `plank` (state.ts's
//   ringCrossingPlanks).
// - `block` spans u, lat and y; `post` stands at (u, lat) or (x, z) from y0 to y1, w across the line and d along it;
//   on the footbridge it stands `on` the deck (`d` along it from a, `side` to its right) and turns by `yaw`; `beam`
//   runs from a to b ((u, lat, y) on the line, a world (x, z, y), `on` the deck (`d`, `side` and `dy` over its top),
//   or `d` out from the summit's middle `along` (x, z)), w wide and h deep, its top on the line between them; `slab` is a level deck over u and lat, its top at y,
//   h deep; `stanchion` is post k of a handrail's n + 1 from a to b (one every 3 m), `rise` tall and w square; `tread`
//   is tread k of a flight, from k pitches up it, `run` long, `lift` over its top, w wide and h deep; `at` is a point,
//   turned by `turn` (`line`: along it; `west`: facing the tracks from the east platform; `toward` a world (x, z) from
//   the halt's middle).
import { defineLevel, type JsonObject, type Placement } from '../../prefab/types.ts';

const TIMBER = '#8a6a48',
  TIMBER_DARK = '#6a5038',
  SAND = '#d6c69c',
  STEEL = '#e8742c',
  STEEL_DARK = '#b8551e',
  GOLD = '#ffc83a',
  RAIL = '#3d3a38',
  BED = '#5d5650',
  CONCRETE = '#a6a29a',
  PATH = '#c9b48a',
  TARP = '#4f6b8a',
  LAND = '#4a4d5c',
  LAND2 = '#3b3e4c',
  SKY = '#8fc4e0',
  NIGHT = '#2c2e3a',
  SHARD = '#7fd0ff';

type A = number | { readonly deck: A } | readonly (string | number | A)[];
const halt = (place: JsonObject): JsonObject => ({ frame: 'halt', ...place });
/** A box of the furnishing: solid unless `drawn`. */
const box = (id: string, color: string, place: JsonObject, drawn = false): Placement => ({
  id,
  prefab: drawn ? 'ring.box-drawn' : 'ring.box',
  pos: [0, 0, 0],
  params: { place, color },
});
const block = (u: [A, A], lat: [A, A], y: [A, A]) => halt({ block: { u, lat, y } });
type End = { u: A; lat: A; y: A };
/** A waist-high handrail from a to b (their feet), drawn only: its rail, then its n + 1 posts. `frame` names the frame
 * (and a ramp row's indices). */
const handrail = (id: string, frame: JsonObject, a: End, b: End, n: number): Placement[] => [
  box(
    `${id}/rail`,
    STEEL,
    { ...frame, beam: { a: { ...a, y: [a.y, 1.05] }, b: { ...b, y: [b.y, 1.05] }, w: 0.07, h: 0.07 } },
    true,
  ),
  ...Array.from({ length: n + 1 }, (_, k) =>
    box(`${id}/post${k + 1}`, STEEL, { ...frame, stanchion: { a, b, n, k, rise: 1.05, w: 0.08 } }, true),
  ),
];

// The generated massing: its rows and counts are the catalog's (src/sim/railway-ring-layout.ts, which content may not
// import); the view resolves every number from the catalog and refuses a level whose rows or counts no longer match it.
/** RING_RAMPS, one sea ramp: its flights in order (the slipway, then flights of `treads` treads whose handrails have
 * `rail` spans), then its landings (their seaward handrail's spans). */
const RAMPS = [
  { flights: [{ slip: true }, { treads: 25, rail: 3 }, { treads: 22, rail: 3 }], landings: [{ rail: 1 }, { rail: 1 }] },
] as const;
/** One sea ramp's pieces, flights then landings, in the greybox's order. A flight's ramp is solid and 1.6 m wide (the
 * slipway is plain sand); its treads, kerbs, handrails and pile are drawn only. A landing's deck is solid. */
function seaRamp(r: number, ramp: (typeof RAMPS)[number]): Placement[] {
  const out: Placement[] = [];
  ramp.flights.forEach((f, k) => {
    const id = `ramp${r + 1}/flight${k + 1}`,
      at = { frame: 'flight', ramp: r, flight: k };
    out.push(
      box(`${id}/ramp`, 'slip' in f ? SAND : CONCRETE, {
        ...at,
        beam: { a: { u: ['u0'], lat: ['lat'], y: ['y0'] }, b: { u: ['u1'], lat: ['lat'], y: ['y1'] }, w: 1.6, h: 0.4 },
      }),
    );
    if ('slip' in f) return;
    for (let t = 0; t < f.treads; t++)
      out.push(
        box(
          `${id}/tread${t + 1}`,
          TIMBER,
          { ...at, tread: { k: t, pitch: 0.4, run: 0.22, lift: 0.05, w: [1.6, -0.3], h: 0.05 } },
          true,
        ),
      );
    // Each side, west then east: a kerb, then a handrail.
    [-1, 1].forEach((s, side) => {
      out.push(
        box(
          `${id}/kerb${side + 1}`,
          CONCRETE,
          {
            ...at,
            beam: {
              a: { u: ['u0'], lat: ['lat', s * 0.74], y: ['y0', 0.25] },
              b: { u: ['u1'], lat: ['lat', s * 0.74], y: ['y1', 0.25] },
              w: 0.12,
              h: 0.25,
            },
          },
          true,
        ),
        ...handrail(
          `${id}/handrail${side + 1}`,
          at,
          { u: ['u0'], lat: ['lat', s * 0.85], y: ['y0'] },
          { u: ['u1'], lat: ['lat', s * 0.85], y: ['y1'] },
          f.rail,
        ),
      );
    });
    out.push(
      box(
        `${id}/pile`,
        TIMBER_DARK,
        { ...at, post: { u: ['mid'], lat: ['lat'], y: [-6, ['mid-y', -0.45]], w: 0.4, d: 0.4 } },
        true,
      ),
    );
  });
  ramp.landings.forEach((l, k) => {
    const id = `ramp${r + 1}/landing${k + 1}`,
      at = { frame: 'landing', ramp: r, landing: k };
    out.push(
      box(`${id}/deck`, CONCRETE, { ...at, slab: { u: [['u0'], ['u1']], lat: [['l0'], ['l1']], y: ['y'], h: 0.5 } }),
      box(
        `${id}/pile`,
        TIMBER_DARK,
        { ...at, post: { u: ['mid'], lat: ['lat-mid'], y: [-6, ['y', -0.5]], w: 0.6, d: 0.6 } },
        true,
      ),
      ...handrail(
        `${id}/handrail`,
        at,
        { u: ['u0'], lat: ['l1', -0.05], y: ['y'] },
        { u: ['u1'], lat: ['l1', -0.05], y: ['y'] },
        l.rail,
      ),
    );
  });
  return out;
}
/** The Pilgrims' Way from the hinge edge (RING_GAP) to 2 m past the halt's north end (RING_HALT, the line frame's
 * `end`): `spans` 10 m deck spans, truss posts every 6 m from 3 m out to the halt's south end (`halt`; `posts` pairs),
 * their top rails in 10 m lengths over the same (`rails` a side) and a pier every 20 m from 40 m out (`piers`). */
const WAY = { spans: 20, posts: 25, rails: 15, piers: 6 } as const;
const line = (place: JsonObject): JsonObject => ({ frame: 'line', ...place });
const TRUSS = [
  ['left', 0.15],
  ['right', -0.15],
] as const;
const way: Placement[] = [
  // The deck, solid, on the Way's grade.
  ...Array.from({ length: WAY.spans }, (_, k) => {
    const u0: A = ['hinge', 10 * k],
      u1: A = k === WAY.spans - 1 ? ['end'] : ['hinge', 10 * (k + 1)];
    return box(
      `way/deck/span${k + 1}`,
      STEEL,
      line({
        beam: {
          a: { u: u0, lat: ['mid'], y: { deck: u0 } },
          b: { u: u1, lat: ['mid'], y: { deck: u1 } },
          w: ['width'],
          h: 0.5,
        },
      }),
    );
  }),
  // The truss posts, a pair at a time, 1.4 m tall.
  ...Array.from({ length: WAY.posts }, (_, k) => {
    const u: A = ['hinge', 3 + 6 * k];
    return TRUSS.map((lat, side) =>
      box(
        `way/post/${k + 1}-${side + 1}`,
        STEEL_DARK,
        line({ post: { u, lat, y: [{ deck: u }, [{ deck: u }, 1.4]], w: 0.25, d: 0.25 } }),
        true,
      ),
    );
  }).flat(),
  // Their top rails, the west side's then the east's.
  ...TRUSS.flatMap((lat, side) =>
    Array.from({ length: WAY.rails }, (_, k) => {
      const u0: A = ['hinge', 3 + 10 * k],
        u1: A = k === WAY.rails - 1 ? ['halt'] : ['hinge', 3 + 10 * (k + 1)];
      return box(
        `way/rail/${side + 1}-${k + 1}`,
        STEEL_DARK,
        line({
          beam: {
            a: { u: u0, lat, y: [{ deck: u0 }, 1.4] },
            b: { u: u1, lat, y: [{ deck: u1 }, 1.4] },
            w: 0.25,
            h: 0.3,
          },
        }),
        true,
      );
    }),
  ),
  // The piers, from the sea to under the deck: 6 m across the line, 1.2 m along it.
  ...Array.from({ length: WAY.piers }, (_, k) => {
    const u: A = ['hinge', 40 + 20 * k];
    return box(
      `way/pier/${k + 1}`,
      STEEL_DARK,
      line({ post: { u, lat: ['mid'], y: [-6, [{ deck: u }, -0.5]], w: 6, d: 1.2 } }),
      true,
    );
  }),
];
/** The laid double track on the Way, drawn only: per track (`track1`, `track2` of the line frame, `tracks` of them), a
 * bed and its two rails in 10 m lengths from the hinge edge to the Way's end (as many as the deck's spans). */
const TRACK = { tracks: 2 } as const;
const track: Placement[] = Array.from({ length: TRACK.tracks }, (_, t) =>
  Array.from({ length: WAY.spans }, (_, k) => {
    const u0: A = ['hinge', 10 * k],
      u1: A = k === WAY.spans - 1 ? ['end'] : ['hinge', 10 * (k + 1)],
      lat = `track${t + 1}`;
    return [
      box(
        `track/bed/${t + 1}-${k + 1}`,
        BED,
        line({
          beam: {
            a: { u: u0, lat: [lat], y: [{ deck: u0 }, 0.08] },
            b: { u: u1, lat: [lat], y: [{ deck: u1 }, 0.08] },
            w: 2.4,
            h: 0.1,
          },
        }),
        true,
      ),
      ...[-0.5, 0.5].map((r, side) =>
        box(
          `track/rail/${t + 1}-${k + 1}-${side + 1}`,
          RAIL,
          line({
            beam: {
              a: { u: u0, lat: [lat, r], y: [{ deck: u0 }, 0.22] },
              b: { u: u1, lat: [lat, r], y: [{ deck: u1 }, 0.22] },
              w: 0.12,
              h: 0.14,
            },
          }),
          true,
        ),
      ),
    ];
  }).flat(),
).flat();
/** The island halt's massing (RING_HALT, src/entities/ring-island/state.ts's RING_CROSSING): its two platforms, west
 * (`up`) then east (`down`), solid down to the fill, each from the foot crossing's ramp top to the halt's north end
 * (`end`), with a landing at the rail tops carried on under the ramp as its fill, and the ramp the platform's full
 * width; then the foot crossing between the landings (`plank` k of the crossing's `planks`, drawn only, over the bed
 * in the flangeways and one solid slab, not drawn, its top the rail tops), and the west platform's ramp off its north
 * end down onto the slope where the path starts (`path-x`, `path-z`). */
const CROSSING = { planks: 5 } as const;
const haltMassing: Placement[] = [
  ...(['up', 'down'] as const).flatMap((side) => [
    box(
      `platform/${side}/deck`,
      CONCRETE,
      block([['ramp-top'], ['end']], [[`${side}-l0`], [`${side}-l1`]], [['rail', -0.8], ['deck']]),
    ),
    box(
      `platform/${side}/landing`,
      CONCRETE,
      block([['x-landing0'], ['ramp-top']], [[`${side}-l0`], [`${side}-l1`]], [['rail', -0.8], ['x-top']]),
    ),
    box(
      `platform/${side}/ramp`,
      CONCRETE,
      halt({
        beam: {
          a: { u: ['x-landing1'], lat: [`${side}-mid`], y: ['x-top'] },
          b: { u: ['ramp-top'], lat: [`${side}-mid`], y: ['deck'] },
          w: [`${side}-width`],
          h: 0.75,
        },
      }),
    ),
  ]),
  ...Array.from({ length: CROSSING.planks }, (_, k) =>
    box(
      `crossing/plank/${k + 1}`,
      TIMBER,
      {
        ...block([['x-u0'], ['x-u1']], [['plank-l0'], ['plank-l1']], [['x-top', -0.12], ['x-top']]),
        plank: k,
      },
      true,
    ),
  ),
  box('crossing/bed', BED, block([['x-u0'], ['x-u1']], [['left'], ['right']], [['rail'], ['x-top', -0.12]]), true),
  {
    id: 'crossing/slab',
    prefab: 'ring.box-solid',
    pos: [0, 0, 0],
    params: { place: block([['x-u0'], ['x-u1']], [['left'], ['right']], [['rail'], ['x-top']]) },
  },
  box(
    'west-ramp',
    CONCRETE,
    halt({
      beam: {
        a: { u: ['end', -4], lat: ['west', 0.2], y: ['deck'] },
        b: { x: ['path-x'], z: ['path-z'], y: ['ground', 0.15] },
        w: 3,
        h: 0.4,
      },
    }),
  ),
];
/** The crossover's rails on the Way (RING_END.cross): the homeward track eased onto the original's lateral, a bed and a
 * pair of rails a metre at a time (`k` of `metres`, the `crossover` frame's `u0`, `u1` and their laterals `lat0`,
 * `lat1`), on the Way's grade. Drawn only. */
const CROSSOVER = { metres: 22 } as const;
const crossover: Placement[] = Array.from({ length: CROSSOVER.metres }, (_, k) => {
  const at = { frame: 'crossover', k };
  return [
    box(
      `crossover/bed/${k + 1}`,
      BED,
      {
        ...at,
        beam: {
          a: { u: ['u0'], lat: ['lat0'], y: [{ deck: ['u0'] }, 0.08] },
          b: { u: ['u1'], lat: ['lat1'], y: [{ deck: ['u1'] }, 0.08] },
          w: 2.4,
          h: 0.1,
        },
      },
      true,
    ),
    ...[-0.5, 0.5].map((r, side) =>
      box(
        `crossover/rail/${k + 1}-${side + 1}`,
        RAIL,
        {
          ...at,
          beam: {
            a: { u: ['u0'], lat: ['lat0', r], y: [{ deck: ['u0'] }, 0.22] },
            b: { u: ['u1'], lat: ['lat1', r], y: [{ deck: ['u1'] }, 0.22] },
            w: 0.12,
            h: 0.14,
          },
        },
        true,
      ),
    ),
  ];
}).flat();

/** The path up to the summit lookout, its footbridge over the stack line's cutting and the cutting's marker rocks
 * (src/entities/ring-island/path.ts, which content may not import: the view resolves every number from it and refuses
 * a level whose counts no longer match). The path is drawn only, 6 m lengths a leg (`path` frame, `leg` and `k`; the
 * trail is the ground under it): `PATH_LEGS` is the count per leg of summitPath's way, none on the approach's last leg
 * or on the deck. The footbridge's pieces are solid (`bridge` frame; the approach's trail and the landing are the
 * ground, drawn by the view between the deck and the parapets). Each rim rock is its stone, drawn, then its box, solid
 * (`rim` frame, rock `k` of summitRimRocks). */
const PATH_LEGS = [4, 5, 0, 0, 7, 10, 11, 9, 7];
const BRIDGE_BENTS = 2,
  RIM_ROCKS = 19;
const SUMMIT_MASSING: Placement[] = [
  ...PATH_LEGS.flatMap((n, leg) =>
    Array.from({ length: n }, (_, k) =>
      box(
        `path/leg${leg + 1}/${k + 1}`,
        PATH,
        {
          frame: 'path',
          leg,
          k,
          beam: {
            a: { x: ['x0'], z: ['z0'], y: ['ground', 0.12] },
            b: { x: ['x1'], z: ['z1'], y: ['ground', 0.12] },
            w: 2.6,
            h: 0.3,
          },
        },
        true,
      ),
    ),
  ),
  // The deck from rim to rim, then two parapets low enough to hop, a concrete abutment under each end and two dark
  // steel bents standing just outside the cutting's flat floor (a crossbeam under the deck, then its two legs).
  box('bridge/deck', TIMBER, {
    frame: 'bridge',
    beam: {
      a: { x: ['a-x'], z: ['a-z'], y: ['a-y'] },
      b: { x: ['b-x'], z: ['b-z'], y: ['b-y'] },
      w: ['width'],
      h: ['thick'],
    },
  }),
  ...(['parapet-l', 'parapet-r'] as const).map((side, k) =>
    box(`bridge/parapet${k + 1}`, STEEL, {
      frame: 'bridge',
      beam: {
        a: { on: { d: 0, side: [side], dy: ['parapet'] } },
        b: { on: { d: ['span'], side: [side], dy: ['parapet'] } },
        w: 0.12,
        h: ['parapet'],
      },
    }),
  ),
  ...(
    [
      [-1.5, 0.5],
      [
        ['span', -0.5],
        ['span', 1.5],
      ],
    ] as const
  ).map(([d0, d1], k) =>
    box(`bridge/abutment${k + 1}`, CONCRETE, {
      frame: 'bridge',
      beam: {
        a: { on: { d: d0, side: 0, dy: ['under'] } },
        b: { on: { d: d1, side: 0, dy: ['under'] } },
        w: 3.4,
        h: 1.2,
      },
    }),
  ),
  ...Array.from({ length: BRIDGE_BENTS }, (_, bent) => [
    box(`bridge/bent${bent + 1}/beam`, STEEL_DARK, {
      frame: 'bridge',
      bent,
      beam: {
        a: { on: { d: ['bent-d'], side: -1.7, dy: ['under'] } },
        b: { on: { d: ['bent-d'], side: 1.7, dy: ['under'] } },
        w: 0.5,
        h: 0.4,
      },
    }),
    ...[-1.2, 1.2].map((side, k) =>
      box(`bridge/bent${bent + 1}/leg${k + 1}`, STEEL_DARK, {
        frame: 'bridge',
        bent,
        post: {
          on: { d: ['bent-d'], side },
          y: [
            ['ground', -0.5],
            ['bent-under', -0.4],
          ],
          w: 0.5,
          d: 0.5,
          yaw: ['yaw'],
        },
      }),
    ),
  ]).flat(),
  ...Array.from({ length: RIM_ROCKS }, (_, k) => [
    {
      id: `rim/stone${k + 1}`,
      prefab: 'ring.rim-rock' as const,
      pos: [0, 0, 0] as const,
      params: { place: { frame: 'rim', k, rock: 'stone' } },
    },
    {
      id: `rim/box${k + 1}`,
      prefab: 'ring.box-solid' as const,
      pos: [0, 0, 0] as const,
      params: { place: { frame: 'rim', k, rock: 'box' } },
    },
  ]).flat(),
];

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
      // ------------------------------------------------ the hinge pier, the pennant pole's footing
      // The hinge pier, from the sea to under the deck: 3 m either side of the hinge edge, then 17 m on.
      ...(
        [
          [-3, 3],
          [3, 20],
        ] as const
      ).map(([u0, u1], k) =>
        box(`pier/block${k + 1}`, STEEL_DARK, {
          frame: 'line',
          block: {
            u: [
              ['hinge', u0],
              ['hinge', u1],
            ],
            lat: [
              ['left', 0.2],
              ['right', -0.2],
            ],
            y: [-6, [{ deck: ['hinge', u1] }, -0.5]],
          },
        }),
      ),
      // The pennant pole's footing: its pile and plinth, the pier's grey.
      ...[0, 1].map((footing) => box(`pennant/footing${footing + 1}`, CONCRETE, { frame: 'pennant', footing })),
      // ------------------------------------------------ the brace platform
      // Its deck, the pier under it and a handrail along its seaward edge (short of the steps).
      box('brace/deck', CONCRETE, {
        frame: 'brace',
        slab: { u: [['u0'], ['u1']], lat: [['l0'], ['l1']], y: ['top'], h: 0.5 },
      }),
      box('brace/pier', STEEL_DARK, {
        frame: 'brace',
        block: {
          u: [
            ['u0', 3],
            ['u0', 7],
          ],
          lat: [
            ['l0', 2],
            ['l1', -2],
          ],
          y: [-6, ['top', -0.5]],
        },
      }),
      ...handrail(
        'brace/handrail',
        { frame: 'brace' },
        { u: ['u0'], lat: ['l1', -0.05], y: ['top'] },
        { u: ['u1', -3.5], lat: ['l1', -0.05], y: ['top'] },
        2,
      ),
      // The gold strut under the heel: its foot on the platform (rail.brace's site, RING_BRACE, at u 284.5, lat 3.4),
      // facing the railhead, and the strut up to under the hinge's edge (drawn only).
      box('brace/strut/foot', GOLD, {
        frame: 'brace',
        post: { x: ['strut-x'], z: ['strut-z'], y: [['top'], ['top', 0.5]], w: 1.4, d: 1.4 },
      }),
      box(
        'brace/strut/arm',
        GOLD,
        {
          frame: 'brace',
          beam: {
            a: { u: [284.5, -0.4], lat: [3.4, -0.3], y: ['top', 0.5] },
            b: { u: ['hinge', 0.4], lat: ['right', -0.4], y: [{ deck: ['hinge'] }, -0.6] },
            w: 0.6,
            h: 0.6,
          },
        },
        true,
      ),
      // One of the folk, waving you over, 4 m along the platform and 3 m in from its seaward edge.
      {
        id: 'brace/folk',
        prefab: 'ring.folk',
        pos: [0, 0, 0],
        params: { place: { frame: 'brace', at: { u: ['u0', 4], lat: ['l1', -3], y: ['top'] } }, wave: true },
      },
      // ------------------------------------------------ the steps
      // From the brace platform's far end up to their deck, a landing onto the deck's east edge and a handrail.
      box('steps/flight', CONCRETE, {
        frame: 'steps',
        beam: { a: { u: ['u0'], lat: ['lat'], y: ['y0'] }, b: { u: ['u1'], lat: ['lat'], y: ['top'] }, w: 2.8, h: 0.4 },
      }),
      box('steps/landing', CONCRETE, {
        frame: 'steps',
        slab: {
          u: [['u1'], ['u1', 2.5]],
          lat: [
            ['right', -0.3],
            ['lat', 1.4],
          ],
          y: ['top'],
          h: 0.5,
        },
      }),
      ...handrail(
        'steps/handrail',
        { frame: 'steps' },
        { u: ['u0'], lat: ['lat', 1.35], y: ['y0'] },
        { u: ['u1'], lat: ['lat', 1.35], y: ['top'] },
        3,
      ),
      // ------------------------------------------------ the sea ramps and the Pilgrims' Way (generated on RING_*)
      ...RAMPS.flatMap((ramp, r) => seaRamp(r, ramp)),
      ...way,
      // The Way's track, the halt's platforms and foot crossing, the west platform's ramp and the crossover's rails.
      ...track,
      ...haltMassing,
      ...crossover,
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
      // ------------------------------------------------ the path up to the summit, its footbridge, the rim rocks
      ...SUMMIT_MASSING,
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
