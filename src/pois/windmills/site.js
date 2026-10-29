// Windmill farm: three rustic windmills on knolls among striped fields, on the eastern plain.
export const MILLS = [
  { x: -24, z: 6 }, // local metres, see src/island/stamps.js for the frame
  { x: 2, z: -16 },
  { x: 26, z: 4 },
];
export const FARM_Y = 3.2; // the plain's height

export default {
  name: 'Windmill farm',
  x: 110,
  z: -108,
  dir: [-0.6, 0.8], // faces home (south-west); the sails face the sea breeze from this side
  stamps: [
    { shape: 'disc', r: 44, fade: 26, set: FARM_Y },
    ...MILLS.map((m) => ({ shape: 'disc', x: m.x, z: m.z, r: 4.5, fade: 9, add: 2.2 })),
    // Fields: wheat, young greens and ploughed earth, in rows.
    { shape: 'box', x: -6, z: 26, hx: 15, hz: 8, fade: 1.5, paint: '#d8b45a', stripes: 2.2, strength: 0.9 },
    { shape: 'box', x: 24, z: 26, hx: 11, hz: 8, fade: 1.5, paint: '#86bd4c', stripes: 1.8, strength: 0.9 },
    { shape: 'box', x: -30, z: -20, hx: 12, hz: 9, fade: 1.5, paint: '#8c6a43', stripes: 1.6, strength: 0.85 },
    { shape: 'box', x: 30, z: -24, hx: 12, hz: 9, fade: 1.5, paint: '#cfae55', stripes: 2.2, strength: 0.9 },
    // Cart track through the farm and off towards home.
    {
      shape: 'path',
      points: [
        [-24, 6],
        [2, -16],
        [26, 4],
      ],
      w: 2.6,
      fade: 1.2,
      paint: '#a88b5e',
      strength: 0.8,
    },
    {
      shape: 'path',
      points: [
        [2, -16],
        [0, 14],
        [-6, 60],
      ],
      w: 2.6,
      fade: 1.2,
      paint: '#a88b5e',
      strength: 0.8,
    },
  ],
  keepOut: [{ r: 46 }],
};
