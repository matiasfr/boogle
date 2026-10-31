// The guest's and the dino's textures (RGBA16), in atlas order. src/guest/rom.js reads each from the player's ROM, `at`
// bytes into the MIO0 block at `block`. native/guest/build.mjs names the upstream source file of each, in the same
// order, and compiles that index in place of its pixels.
const GUEST = 0x114750,
  DINO = 0x16d870;
export const TEXTURES = [
  { block: GUEST, at: 144, w: 64, h: 32 },
  { block: GUEST, at: 4240, w: 32, h: 32 },
  { block: GUEST, at: 6288, w: 32, h: 32 },
  { block: GUEST, at: 8336, w: 32, h: 32 },
  { block: GUEST, at: 10384, w: 32, h: 32 },
  { block: GUEST, at: 12432, w: 32, h: 32 },
  { block: GUEST, at: 14480, w: 32, h: 32 },
  { block: GUEST, at: 16528, w: 32, h: 32 },
  { block: GUEST, at: 16528, w: 32, h: 32 },
  { block: GUEST, at: 16528, w: 32, h: 32 },
  { block: GUEST, at: 22672, w: 32, h: 32 },
  { block: GUEST, at: 24720, w: 32, h: 32 },
  { block: GUEST, at: 26768, w: 32, h: 32 },
  { block: GUEST, at: 28816, w: 32, h: 32 },
  { block: GUEST, at: 30864, w: 32, h: 32 },
  { block: GUEST, at: 32912, w: 32, h: 64 },
  { block: GUEST, at: 37008, w: 32, h: 64 },
  { block: GUEST, at: 41104, w: 32, h: 64 },
  { block: GUEST, at: 45200, w: 32, h: 64 },
  { block: DINO, at: 116104, w: 16, h: 16 },
  { block: DINO, at: 116616, w: 16, h: 16 },
  { block: DINO, at: 117128, w: 16, h: 16 },
];
