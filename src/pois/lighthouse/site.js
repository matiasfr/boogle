// Lighthouse on a grassy hill in the middle of the island: the landmark you can see from everywhere, and the hub the
// paths to home, the windmill farm and the rocky upland start from. From the gallery you can see the whole island.
export const PAD_Y = 11; // height of the flat ground the tower stands on

// A footpath from the hill (local metres; with dir [0, 1] local x, z are world x, z offsets from the site).
const path = (...points) => ({ shape: 'path', points, w: 2, fade: 1, paint: '#b39a6d', strength: 0.7 });

export default {
  name: 'Lighthouse',
  x: 6,
  z: -58,
  dir: [0, 1], // forward = south, towards home
  stamps: [
    { shape: 'disc', r: 14, fade: 21, add: 7.4 }, // the hill (its foot stops short of home's HOME_KEEP)
    { shape: 'disc', r: 8, fade: 4, set: PAD_Y }, // flat top for the tower and the stair's foot
    { shape: 'disc', r: 7.5, fade: 2, paint: '#a99f8b', strength: 0.55 }, // worn ground around the base
    path([0, 7], [2, 22], [4, 34]), // down towards home
    path([7, 3], [28, 4], [48, 8]), // east to the windmill farm
    path([-6, -4], [-24, -12], [-38, -20]), // up to the rocky upland
  ],
  keepOut: [{ r: 11 }],
};
