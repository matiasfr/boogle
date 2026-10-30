// Mario's and Yoshi's textures (RGBA16). native/mario/build.mjs gives each one its index here in place of the pixels
// the decomp's build extracts; src/mario/rom.js reads them from the player's US ROM, `at` bytes into the MIO0 block at
// `block`.
const MARIO = 0x114750,
  YOSHI = 0x16d870;
export const TEXTURES = [
  { actor: 'mario', name: 'mario_metal', block: MARIO, at: 144, w: 64, h: 32 },
  { actor: 'mario', name: 'mario_overalls_button', block: MARIO, at: 4240, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_logo', block: MARIO, at: 6288, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_sideburn', block: MARIO, at: 8336, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_mustache', block: MARIO, at: 10384, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_center', block: MARIO, at: 12432, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_half_closed', block: MARIO, at: 14480, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_closed', block: MARIO, at: 16528, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_closed_unused_0', block: MARIO, at: 16528, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_closed_unused_1', block: MARIO, at: 16528, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_left_unused', block: MARIO, at: 22672, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_right_unused', block: MARIO, at: 24720, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_up_unused', block: MARIO, at: 26768, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_down_unused', block: MARIO, at: 28816, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_eyes_dead', block: MARIO, at: 30864, w: 32, h: 32 },
  { actor: 'mario', name: 'mario_wing', block: MARIO, at: 32912, w: 32, h: 64 },
  { actor: 'mario', name: 'mario_wing_tip', block: MARIO, at: 37008, w: 32, h: 64 },
  { actor: 'mario', name: 'mario_metal_wing_unused', block: MARIO, at: 41104, w: 32, h: 64 },
  { actor: 'mario', name: 'mario_metal_wing_tip_unused', block: MARIO, at: 45200, w: 32, h: 64 },
  { actor: 'yoshi', name: 'yoshi_eye', block: YOSHI, at: 116104, w: 16, h: 16 },
  { actor: 'yoshi', name: 'yoshi_eye_blink', block: YOSHI, at: 116616, w: 16, h: 16 },
  { actor: 'yoshi', name: 'yoshi_nostril', block: YOSHI, at: 117128, w: 16, h: 16 },
];
