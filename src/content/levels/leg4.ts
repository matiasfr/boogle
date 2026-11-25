import { defineLevel } from '../../prefab/types.ts';
import { frame, unit, perp, layoutData } from '../../prefab/authoring.ts';
import shores from './leg4-shores.json' with { type: 'json' };

const shorePieces = (isle: typeof shores.saltLand) =>
  isle.beach.map((edge, i) => ({
    id: 'beach-' + i,
    ...edge,
    d: 8.5,
    h: 0.5,
    top: 3,
    rise: -4.5,
    tone: 'sandstone',
  }));
const stop = { x: 137.6, z: 942.25 };
const outbound = unit(-17.6, 17.75);
const quay = frame(stop, outbound, perp(outbound));
const saltPieces = shores.salt.flatMap((cuts, side) =>
  cuts.slice(1).flatMap((b, i) => {
    const a = cuts[i]!;
    const dx = Math.round((b.x - a.x) * 100),
      dz = Math.round((b.z - a.z) * 100);
    const u = unit(dx, dz),
      f = frame(a, u, perp(u)),
      length = Math.round(Math.hypot(dx, dz)) / 100;
    return [
      f.box('platform-' + side + '-' + i, -0.15, length, -1.85, 1.85, 3.9, 1, 'light'),
      ...(i === 0 ? [f.ramp('platform-step-' + side, 0, 3.9, -3, 3, -1.85, 1.85, 'grey')] : []),
    ];
  }),
);
const saltFrame = frame(shores.saltLand.centre, unit(0, 1), unit(1, 0));
// From the waterfront apron to the east rim of the 55 m top. The head overlaps the rim.
const rampFrame = frame({ x: 104, z: 973 }, unit(-93, 23), unit(23, 93));
const quayPieces = [
  ...shorePieces(shores.portIsle),
  quay.box('quay-slab', -26, 26, -10, 18, 3, 2, 'grey'),
  ...[-1, 1].flatMap((side) => [
    quay.box('platform-' + (side + 1), -20, 20, side * 5.8 - 2, side * 5.8 + 2, 3.9, 1, 'light'),
    quay.ramp('platform-step-' + (side + 1), -20, 3.9, -23, 3, side * 5.8 - 2, side * 5.8 + 2, 'grey'),
  ]),
  quay.box('apron', -31, 64, -70, -7.8, 3.02, 1, 'grey'),
  rampFrame.ramp('high-port-ramp', 0, 3, 98, 55, -3, 3, 'grey'),
  { ...rampFrame.ramp('high-port-parapet', 0, 4, 98, 56, 3, 3.3, 'pale'), h: 1 },
];
const areas = [
  {
    place: 'saltpan',
    basis: saltFrame.basis,
    origin: shores.saltLand.centre,
    key: 'greybox.salt-land',
    pieces: [...shorePieces(shores.saltLand), ...saltPieces],
    posts: [],
    reserves: [],
  },
  {
    place: 'quay',
    basis: quay.basis,
    origin: stop,
    key: 'greybox.quay-lands',
    pieces: quayPieces,
    posts: [{ id: 'end-board', ...quay.at(24, 5.8), y: 3, facing: unit(17.6, -17.75), label: 'quay.wall' }],
    reserves: [
      quay.reserve('Roundhouse', -30, 30, -69, -9, 3.02, 12),
      quay.reserve('town', 33, 63, -55, -25, 3.02, 12),
    ],
  },
];
export const levels = areas.map(({ place, key, ...data }) =>
  defineLevel({
    place,
    placements: [],
    layout: layoutData({
      kind: 'leg2',
      area: place,
      data: { ...data, pads: [], marks: {}, extras: [{ id: 'lands', prefab: key, pos: [0, 0, 0] }] },
    }),
  }),
);
