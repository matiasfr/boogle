// The decomp's Mario and Yoshi, built into sm64.wasm by native/mario/build.mjs. Distances are SM64 units (100 to the
// metre), angles SM64 shorts (65536 to the turn). One shared instance draws Yoshi, runs this player's Mario and draws
// everyone else's; Mario needs the ROM's animations first (setMarioAnims).
const wasmUrl = new URL('./sm64.wasm', import.meta.url);

export const BUTTON = { A: 0x8000, B: 0x4000, Z: 0x2000 };
export const VERT_FLOATS = 13;
const POSE_INTS = 24;

let pending = null;
export const getSim = () => (pending ??= createSim());

async function createSim() {
  const bytes = await (await fetch(wasmUrl)).arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const e = instance.exports;
  const buffer = e.memory.buffer;
  e.sm64_init();
  let animsSet = false;

  const stateF = new Float32Array(buffer, e.sm64_state(), 12 + POSE_INTS);
  const stateI = new Int32Array(buffer, e.sm64_state(), 12 + POSE_INTS);
  const surfaces = new Float32Array(buffer, e.sm64_surface_buffer(), e.sm64_surface_capacity() * 10);
  const verts = new Float32Array(buffer, e.sm64_vertex_buffer(), 2048 * 3 * VERT_FLOATS);
  const poseIn = new Int32Array(buffer, e.sm64_pose_buffer(), POSE_INTS);
  const poseInF = new Float32Array(buffer, e.sm64_pose_buffer(), POSE_INTS);
  const sounds = new Uint32Array(buffer, e.sm64_sounds(), 16);

  return {
    setMarioAnims(anims) {
      if (animsSet) return;
      new Uint8Array(buffer).set(anims, e.sm64_anim_bank());
      animsSet = true;
    },
    surfaces,
    capacity: e.sm64_surface_capacity(),
    loadSurfaces: (count, waterLevel) => e.sm64_load_surfaces(count, waterLevel),
    spawn: (x, y, z, yaw) => e.sm64_spawn(x, y, z, yaw),
    teleport: (x, y, z) => e.sm64_teleport(x, y, z),
    shift: (dx, dz) => e.sm64_shift(dx, dz),
    input: (stickX, stickY, buttons, camYaw) => e.sm64_input(stickX, stickY, buttons, camYaw),
    tick: () => e.sm64_tick(),
    state: () => ({
      x: stateF[0],
      y: stateF[1],
      z: stateF[2],
      vx: stateF[3],
      vy: stateF[4],
      vz: stateF[5],
      forwardVel: stateF[6],
      floorHeight: stateF[7],
      faceYaw: stateI[8],
      action: stateI[9] >>> 0,
      particles: stateI[10] >>> 0,
      flags: stateI[11] >>> 0,
    }),
    // This player's pose after the last tick, as plain numbers for presence.
    pose: () => Array.from(stateI.subarray(12, 12 + 18)).concat(Array.from(stateF.subarray(12 + 18, 12 + POSE_INTS))),
    // Draws another player's pose (from pose()); then verts holds it.
    renderPose(p) {
      for (let i = 0; i < 18; i++) poseIn[i] = p[i] | 0;
      for (let i = 18; i < POSE_INTS; i++) poseInF[i] = +p[i] || (i >= 21 ? 1 : 0);
      e.sm64_render_pose();
    },
    // Draws Yoshi: animation 0 idle, 1 walk, 2 jump; frame wraps at the animation's length.
    renderYoshi(anim, frame, blink) {
      e.sm64_render_yoshi(anim, frame % e.sm64_yoshi_anim_length(anim), blink ? 1 : 0);
    },
    verts,
    vertexCount: () => e.sm64_vertex_count(),
    takeSounds: () => Array.from(sounds.subarray(0, e.sm64_take_sound_count())),
  };
}
