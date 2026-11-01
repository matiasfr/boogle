// The guest engine: the guest's simulation and the guest and dino models, a wasm built by native/guest/build.mjs.
// Never bundled: it comes from the owner's hosted build (ENGINE_URL, fetched quietly the first time a player talks to
// the dino), a file the player picked, or on a local dev build VITE_DINO_ENGINE_URL; this browser keeps it
// (src/decomp/store.ts). Without one the feature stays dormant.
// Distances are engine units (100 to the metre), angles engine shorts (65536 to the turn). One shared instance draws
// the dino, runs this player's guest and draws everyone else's; the guest needs the ROM's animations first (setAnims).
import { loadFile, saveFile } from '../decomp/store.ts';

const DEV_URL = import.meta.env.VITE_DINO_ENGINE_URL; // a local build only (native/guest/README.md)
// The owner's build, hosted by the owner (an owner decision: the engine is fetched, the ROM never is).
const ENGINE_URL =
  'https://dl.dropboxusercontent.com/scl/fi/w16gjd0or3jm347pqtp6w/engine.wasm?rlkey=lzwkijjp43jktrtw9934ggrod';
const STORE_KEY = 'guest-engine';
// The entry points this file calls; a picked file without them is not a guest engine.
const NEEDS = ['guest_init', 'guest_tick', 'guest_state', 'guest_render_pose', 'guest_render_dino', 'guest_anim_bank'];
export const ENGINE_EXT = ['.wasm'];

let compiled: WebAssembly.Module | null = null; // once known
export const hasEngine = () => !!compiled;

async function compile(bytes: ArrayBuffer) {
  try {
    const mod = await WebAssembly.compile(bytes);
    const names = new Set(WebAssembly.Module.exports(mod).map((x) => x.name));
    return NEEDS.every((n) => names.has(n)) ? mod : null;
  } catch {
    return null;
  }
}

const get = (url: string): Promise<ArrayBuffer | null> =>
  fetch(url).then(
    (r) => (r.ok ? r.arrayBuffer() : null),
    () => null,
  );

// Looks for an engine this browser already has (or the dev build's); with `hosted`, fetches the owner's build if there
// is none and keeps it. True if found.
export async function findEngine(hosted = false) {
  if (compiled) return true;
  const bytes = DEV_URL ? await get(DEV_URL) : await loadFile<ArrayBuffer>(STORE_KEY);
  compiled ??= bytes && (await compile(bytes));
  if (!compiled && hosted && !DEV_URL) {
    const fetched = await get(ENGINE_URL);
    compiled ??= fetched && (await compile(fetched));
    if (compiled) saveFile(STORE_KEY, fetched);
  }
  return !!compiled;
}

// A picked or dropped engine file: kept if it is one. True if it was.
export async function takeEngineFile(file: Blob) {
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
// and a scale, 3 floats each. As plain numbers it is also the presence wire format (src/features/dino.ts).
const POSE_INTS = 18,
  SCALE_AT = POSE_INTS + 3;
export const POSE_LEN = POSE_INTS + 6;
const STATE_LEN = 12; // struct ShimState's fields before its pose
export const isPose = (p: unknown): p is number[] =>
  Array.isArray(p) && p.length === POSE_LEN && p.every(Number.isFinite);
// Rounded for the wire: offsets to 0.1 units, scales to 0.01.
export const quantisePose = (p: number[]) =>
  p.map((v, i) => (i < POSE_INTS ? v : i < SCALE_AT ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100));

// The wasm's exports (native/guest/include/shim.h); every entry takes and returns plain numbers.
type Exports = { memory: WebAssembly.Memory } & Record<string, (...args: number[]) => number>;
export type Sim = Awaited<ReturnType<typeof createSim>>;

let pending: Promise<Sim> | null = null;
export const getSim = () => (pending ??= createSim());

// Needs an engine first (findEngine, takeEngineFile).
async function createSim() {
  const instance = await WebAssembly.instantiate(compiled!, {});
  const e = instance.exports as unknown as Exports;
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
    setAnims(anims: Uint8Array) {
      if (animsSet) return;
      new Uint8Array(buffer).set(anims, e.guest_anim_bank());
      animsSet = true;
    },
    surfaces,
    capacity: e.guest_surface_capacity(),
    loadSurfaces: (count: number, waterLevel: number) => e.guest_load_surfaces(count, waterLevel),
    spawn: (x: number, y: number, z: number, yaw: number) => e.guest_spawn(x, y, z, yaw),
    teleport: (x: number, y: number, z: number) => e.guest_teleport(x, y, z),
    shift: (dx: number, dz: number) => e.guest_shift(dx, dz),
    input: (stickX: number, stickY: number, buttons: number, camYaw: number) =>
      e.guest_input(stickX, stickY, buttons, camYaw),
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
    renderPose(p: number[]) {
      for (let i = 0; i < POSE_INTS; i++) poseIn[i] = p[i] | 0;
      for (let i = POSE_INTS; i < POSE_LEN; i++) poseInF[i] = +p[i] || (i >= SCALE_AT ? 1 : 0); // no zero scales
      e.guest_render_pose();
    },
    // Draws the dino: animation 0 idle, 1 walk, 2 jump; frame wraps at the animation's length.
    renderDino(anim: number, frame: number, blink: boolean) {
      e.guest_render_dino(anim, frame % e.guest_dino_anim_length(anim), blink ? 1 : 0);
    },
    verts,
    vertexCount: () => e.guest_vertex_count(),
  };
}
