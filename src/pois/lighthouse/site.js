// Lighthouse on a rocky headland at the tip of the east cape.
export const PAD_Y = 9.4; // height of the flat ground the tower stands on

export default {
  name: 'Lighthouse',
  x: 212,
  z: -48,
  dir: [1, 0], // forward = out to sea (east)
  stamps: [
    { shape: 'disc', r: 13, fade: 16, add: 7.2 }, // the headland
    { shape: 'disc', r: 8, fade: 4, set: PAD_Y }, // flat top for the tower and the stair's foot
    { shape: 'disc', r: 7.5, fade: 2, paint: '#a99f8b', strength: 0.55 }, // worn ground around the base
    {
      shape: 'path',
      points: [
        [0, -6],
        [-4, -22],
        [-14, -40],
      ],
      w: 2,
      fade: 1,
      paint: '#b39a6d',
      strength: 0.7,
    },
  ],
  keepOut: [{ r: 11 }],
};
