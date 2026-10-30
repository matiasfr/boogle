// The guest engine: the guest's simulation and the guest and dino models, a wasm the player brings (built by
// native/guest/build.mjs). Boogle never ships or fetches one: it comes from a file the player picked once (kept by
// src/decomp/store.js), or on a local dev build from VITE_DINO_ENGINE_URL. Without one the feature stays dormant.
// Distances are engine units (100 to the metre), angles engine shorts (65536 to the turn). One shared instance draws
// the dino, runs this player's guest and draws everyone else's; the guest needs the ROM's animations first (setAnims).
import { loadFile, saveFile } from '../decomp/store.js';

const DEV_URL = import.meta.env.VITE_DINO_ENGINE_URL; // a local build only (native/guest/README.md)
const STORE_KEY = 'guest-engine';
// The entry points this file calls; a picked file without them is not a guest engine.
const NEEDS = ['guest_init', 'guest_tick', 'guest_state', 'guest_render_pose', 'guest_render_dino', 'guest_anim_bank'];
export const ENGINE_EXT = ['.wasm'];

let compiled = null; // WebAssembly.Module once known
export const hasEngine = () => !!compiled;

async function compile(bytes) {
  try {
    const mod = await WebAssembly.compile(bytes);
    const names = new Set(WebAssembly.Module.exports(mod).map((x) => x.name));
    return NEEDS.every((n) => names.has(n)) ? mod : null;
  } catch {
    return null;
  }
}

// Looks for an engine this browser already has (or the dev build's); true if found.
export async function findEngine() {
  if (compiled) return true;
  const bytes = DEV_URL
    ? await fetch(DEV_URL).then(
        (r) => (r.ok ? r.arrayBuffer() : null),
        () => null,
      )
    : await loadFile(STORE_KEY);
  compiled ??= bytes && (await compile(bytes));
  return !!compiled;
}

// A picked or dropped engine file: kept if it is one. True if it was.
export async function takeEngineFile(file) {
  const bytes = await file.arrayBuffer();
  const mod = await compile(bytes);
  if (!mod) return false;
  compiled ??= mod;
  saveFile(STORE_KEY, bytes);
  return true;
}

export const BUTTON = { A: 0x8000, B: 0x4000, Z: 0x2000 };
export const VERT_FLOATS = 13;
export const MAX_VERTS = 2048 * 3; // render.c's vertex buffer

// A pose (struct ShimPose, native/guest/include/shim.h) is POSE_INTS ints (animation, angles, states), then an offset
// and a scale, 3 floats each. As plain numbers it is also the presence wire format (src/features/dino.js).
const POSE_INTS = 18,
  SCALE_AT = POSE_INTS + 3;
export const POSE_LEN = POSE_INTS + 6;
const STATE_LEN = 12; // struct ShimState's fields before its pose
export const isPose = (p) => Array.isArray(p) && p.length === POSE_LEN && p.every(Number.isFinite);
// Rounded for the wire: offsets to 0.1 units, scales to 0.01.
export const quantisePose = (p) =>
  p.map((v, i) => (i < POSE_INTS ? v : i < SCALE_AT ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100));

let pending = null;
export const getSim = () => (pending ??= createSim());

// Needs an engine first (findEngine, takeEngineFile).
async function createSim() {
  const instance = await WebAssembly.instantiate(compiled, {});
  const e = instance.exports;
  const buffer = e.memory.buffer;
  e.guest_init();
  let animsSet = false;

  const stateF = new Float32Array(buffer, e.guest_state(), STATE_LEN + POSE_LEN);
  const stateI = new Int32Array(buffer, e.guest_state(), STATE_LEN + POSE_LEN);
  const surfaces = new Float32Array(buffer, e.guest_surface_buffer(), e.guest_surface_capacity() * 10);
  const verts = new Float32Array(buffer, e.guest_vertex_buffer(), MAX_VERTS * VERT_FLOATS);
  const poseIn = new Int32Array(buffer, e.guest_pose_buffer(), POSE_LEN);
  const poseInF = new Float32Array(buffer, e.guest_pose_buffer(), POSE_LEN);

  return {
    setAnims(anims) {
      if (animsSet) return;
      new Uint8Array(buffer).set(anims, e.guest_anim_bank());
      animsSet = true;
    },
    surfaces,
    capacity: e.guest_surface_capacity(),
    loadSurfaces: (count, waterLevel) => e.guest_load_surfaces(count, waterLevel),
    spawn: (x, y, z, yaw) => e.guest_spawn(x, y, z, yaw),
    teleport: (x, y, z) => e.guest_teleport(x, y, z),
    shift: (dx, dz) => e.guest_shift(dx, dz),
    input: (stickX, stickY, buttons, camYaw) => e.guest_input(stickX, stickY, buttons, camYaw),
    tick: () => e.guest_tick(),
    state: () => ({
      x: stateF[0],
      y: stateF[1],
      z: stateF[2],
      vx: stateF[3],
      vy: stateF[4],
      vz: stateF[5],
      faceYaw: stateI[8],
      action: stateI[9] >>> 0,
      particles: stateI[10] >>> 0,
      flags: stateI[11] >>> 0,
    }),
    // This player's pose after the last tick, as plain numbers for presence.
    pose: () =>
      Array.from(stateI.subarray(STATE_LEN, STATE_LEN + POSE_INTS)).concat(
        Array.from(stateF.subarray(STATE_LEN + POSE_INTS, STATE_LEN + POSE_LEN)),
      ),
    // Draws another player's pose (from pose()); then verts holds it.
    renderPose(p) {
      for (let i = 0; i < POSE_INTS; i++) poseIn[i] = p[i] | 0;
      for (let i = POSE_INTS; i < POSE_LEN; i++) poseInF[i] = +p[i] || (i >= SCALE_AT ? 1 : 0); // no zero scales
      e.guest_render_pose();
    },
    // Draws the dino: animation 0 idle, 1 walk, 2 jump; frame wraps at the animation's length.
    renderDino(anim, frame, blink) {
      e.guest_render_dino(anim, frame % e.guest_dino_anim_length(anim), blink ? 1 : 0);
    },
    verts,
    vertexCount: () => e.guest_vertex_count(),
  };
}
