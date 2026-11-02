import { HALF } from './world/grid.ts';

export const FIXED = 1 / 60;
export const GRAVITY = 18;
// The grid, sea levels and COURT live in the pure src/world/grid.ts (the shared sim and Node tests read it).
export { GRID_RES, CELL, HALF, SEA, SEABED, COURT } from './world/grid.ts';
export const BALL_R = 0.45;
export const BALL_MASS = 0.6;
export const BALL_DAMPING = 0.12; // the beach ball's linear damping (its flight preview uses it too)
export const PLAYER_R = 0.45;
export const PLAYER_MASS = 70;
export const WALKABLE_NY = 0.55; // a contact's normal counts as ground above this: the steepest slope the player climbs
export const JUMP_SPEED = 7.6; // m/s up at a jump's start
export const SWIM_JUMP_SPEED = 4.5; // m/s up, the most a swimmer gets: no climbing a bank from the water
export const SWIM_DEPTH = 0.35; // you swim once the water's surface is this far over the body's centre
export const SOFT_WALL = HALF - 18; // metres from the origin: swimming out to sea turns you back here
export const HEAD_OFFSET = 0.8;
export const REACH = 2.4;
export const SEND_MS = 50;
export const INTERP_MS = 120;
export const SPAWN = { x: 14, z: 26 };
export const BALL_SPAWN = { x: 12, z: 20 };
export const FOG_HEX = '#bfe6f5';
export const FOG_NEAR = 110;
export const FOG_FAR = 520;
export const COLORS = ['#ff6b5a', '#ffc23d', '#7fd14a', '#19c3b3', '#3d9bff', '#9b6bff', '#ff6fb5', '#ff9a3d'];
export const DEFAULT_NAME = 'Dat Frinco';
export const DEFAULT_ROOM = 'beach';

// Absent in Node (state.ts files load there: test/entity-state-node.test.ts).
export const isTouch = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
export const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
