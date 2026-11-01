// Windmill farm: three rustic windmills on knolls among striped fields, on the eastern plain.
export const MILLS = [
  { x: -17, z: 4 }, // local metres, see src/island/stamps.ts for the frame
  { x: 1, z: -11 },
  { x: 18, z: 3 },
];
export const FARM_Y = 3.2; // the plain's height
// The cart track from the middle mill out of the farm, through the wheat (local [x, z] points).
export const TRACK = [
  [1, -11],
  [0, 10],
  [-4, 34],
];

const track = (points) => ({ shape: 'path', points, w: 2.6, fade: 1.2, paint: '#a88b5e', strength: 0.8 });

export default {
  name: 'Windmill farm',
  x: 82,
  z: -46,
  dir: [-1, 0.2], // faces the lighthouse hill and home (west); the sails face the sea breeze from this side
  stamps: [
    { shape: 'disc', r: 30, fade: 18, set: FARM_Y },
    ...MILLS.map((m) => ({ shape: 'disc', x: m.x, z: m.z, r: 4.5, fade: 7, add: 2.2 })),
    // Fields: wheat, young greens and ploughed earth, in rows.
    { shape: 'box', x: -5, z: 18, hx: 10, hz: 5.5, fade: 1.5, paint: '#d8b45a', stripes: 2.2, strength: 0.9 },
    { shape: 'box', x: 16, z: 18, hx: 7.5, hz: 5.5, fade: 1.5, paint: '#86bd4c', stripes: 1.8, strength: 0.9 },
    { shape: 'box', x: -21, z: -14, hx: 8.5, hz: 6.5, fade: 1.5, paint: '#8c6a43', stripes: 1.6, strength: 0.85 },
    { shape: 'box', x: 21, z: -17, hx: 8.5, hz: 6.5, fade: 1.5, paint: '#cfae55', stripes: 2.2, strength: 0.9 },
    // Cart tracks between the mills and off towards the lighthouse.
    track([MILLS[0], MILLS[1], MILLS[2]].map((m) => [m.x, m.z])),
    track(TRACK),
  ],
  keepOut: [{ r: 32 }],
};
