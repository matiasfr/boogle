import * as THREE from 'three';

export const FIXED = 1 / 60;
export const GRAVITY = 18;
// The grid, sea levels, HOME and COURT live in the pure src/world/grid.js (the shared sim and Node tests read it).
export { GRID_RES, CELL, HALF, SEA, SEABED, COURT } from './world/grid.js';
export const BALL_R = 0.45;
export const BALL_MASS = 0.6;
export const PLAYER_R = 0.45;
export const PLAYER_MASS = 70;
export const HEAD_OFFSET = 0.8;
export const REACH = 2.4;
export const SEND_MS = 50;
export const INTERP_MS = 120;
export const SPAWN = { x: 14, z: 26 };
export const BALL_SPAWN = { x: 12, z: 20 };
export const SUN_DIR = new THREE.Vector3(0.45, 0.78, 0.32).normalize();
export const FOG_HEX = '#bfe6f5';
export const FOG_NEAR = 110;
export const FOG_FAR = 520;
export const COLORS = ['#ff6b5a', '#ffc23d', '#7fd14a', '#19c3b3', '#3d9bff', '#9b6bff', '#ff6fb5', '#ff9a3d'];
export const DEFAULT_NAME = 'Dat Frinco';
export const DEFAULT_ROOM = 'beach';

export const isTouch = matchMedia('(pointer: coarse)').matches;
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
