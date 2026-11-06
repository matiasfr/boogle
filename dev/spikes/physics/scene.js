// Spike scenes for docs/research/shared-physics.md (follow-up, 6 November 2026). Plain ES module with no imports, so
// the same file runs in Node and in any browser. `R` is a loaded @dimforge/rapier3d* 0.21 module (det, simd or plain).
//
// A carry: two kinematic hands hold a 4 m beam on spherical joints and walk it along +x for 10 s, dipping so it knocks
// a row of crates. Hand A is "you" (known locally); hand B is the remote carrier, whose path wobbles at random times.
// Optional: 300 statics, N scattered crates (settle and sleep: the rest of a 3,000-entity room), 6 player capsules.
// Setup uses only + - * / so every engine computes the same inputs (DESIGN.md, deterministic rules).

export const DT = 1 / 60;
export const STEPS = 600;
const Q = 1024; // inputs are quantized to 1/1024 m, as a wire format would, so every peer uses identical numbers
const q = (v) => Math.round(v * Q) / Q;
export const height = (x, z) => (x * x + z * z) / 2000;

function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const tri = (t, period, amp) => {
  const u = (t % period) / period;
  return (u < 0.5 ? u * 4 - 1 : 3 - u * 4) * amp;
};

// Hand targets for every step: Float64Array of [ax, ay, az, bx, by, bz] per step. `wobble` false: B mirrors A.
export function makeInputs(steps = STEPS, wobble = true, seed = 7) {
  const out = new Float64Array(steps * 6);
  const rnd = lcg(seed);
  let wz = 0,
    wx = 0,
    vz = 0,
    vx = 0,
    next = 0;
  for (let s = 0; s < steps; s++) {
    const t = s * DT;
    const ax = -10 + 2 * t,
      az = 0;
    const ay = height(ax, az) + 1.15 + tri(t, 1.6, 0.25);
    if (wobble && s >= next) {
      vz = (rnd() * 2 - 1) * 1.2;
      vx = (rnd() * 2 - 1) * 0.4;
      next = s + 18 + Math.floor(rnd() * 54); // 0.3 to 1.2 s
    }
    wz += vz * DT;
    wx += vx * DT;
    if (wz > 1.2 || wz < -1.2) vz = -vz;
    if (wx > 0.3 || wx < -0.3) vx = -vx;
    const bx = ax + 4 + wx,
      bz = az + wz;
    const by = height(bx, bz) + 1.15 + (wobble ? tri(t + 0.4, 1.3, 0.25) : tri(t, 1.6, 0.25));
    out.set([q(ax), q(ay), q(az), q(bx), q(by), q(bz)], s * 6);
  }
  return out;
}

const G = { GROUND: 1, CRATE: 2, BEAM: 4, PLAYER: 8 };
const groups = (member, filter) => (member << 16) | filter;

// field: heightfield cells per side; size: metres per side. The "prediction world" is the carry island only:
// field 16 over 48 m, no statics, no scatter.
export function build(R, { field = 128, size = 256, statics = 300, crates = 12, scatter = 0, players = 6 } = {}) {
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = DT;
  const h = new Float32Array((field + 1) * (field + 1));
  const cell = size / field;
  for (let i = 0; i <= field; i++)
    for (let j = 0; j <= field; j++) h[i * (field + 1) + j] = height(i * cell - size / 2, j * cell - size / 2);
  world.createCollider(
    R.ColliderDesc.heightfield(field, field, h, { x: size, y: 1, z: size }).setCollisionGroups(
      groups(G.GROUND, 0xffff),
    ),
  );
  const rnd = lcg(1);
  for (let k = 0; k < statics; k++) {
    let x = rnd() * 240 - 120;
    const z = rnd() * 240 - 120;
    if (x > -20 && x < 20 && z > -8 && z < 8) x += 40; // keep the carry lane clear
    world.createCollider(
      R.ColliderDesc.cuboid(0.5 + rnd(), 1 + rnd() * 3, 0.5 + rnd())
        .setTranslation(x, height(x, z) + 1, z)
        .setCollisionGroups(groups(G.GROUND, 0xffff)),
    );
  }
  const crate = (x, z) => {
    const b = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(x, height(x, z) + 0.5, z)
        .setCcdEnabled(true),
    );
    world.createCollider(
      R.ColliderDesc.cuboid(0.5, 0.5, 0.5).setFriction(0.6).setCollisionGroups(groups(G.CRATE, 0xffff)),
      b,
    );
    return b;
  };
  const lane = [];
  for (let k = 0; k < crates; k++) lane.push(crate(-4 + k * 1.5, k % 2 ? 0.7 : -0.7));
  // Scattered crates: a grid outside the lane, jittered. They settle within a second and then sleep.
  const side = Math.ceil(Math.sqrt(scatter));
  for (let k = 0; k < scatter; k++) {
    const x = ((k % side) / side) * 200 - 100 + rnd() * 0.5;
    let z = (Math.floor(k / side) / side) * 200 - 100 + rnd() * 0.5;
    if (z > -10 && z < 10) z += 20;
    crate(x, z);
  }
  const inputs0 = makeInputs(1, false);
  const hand = (o) =>
    world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(inputs0[o], inputs0[o + 1], inputs0[o + 2]),
    );
  const hands = [hand(0), hand(3)];
  const beam = world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(inputs0[0] + 2, inputs0[1], 0)
      .setCcdEnabled(true)
      .setAngularDamping(0.5),
  );
  world.createCollider(
    R.ColliderDesc.cuboid(2, 0.15, 0.15)
      .setDensity(3)
      .setCollisionGroups(groups(G.BEAM, G.GROUND | G.CRATE)),
    beam,
  );
  world.createImpulseJoint(R.JointData.spherical({ x: -2, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }), beam, hands[0], true);
  world.createImpulseJoint(R.JointData.spherical({ x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }), beam, hands[1], true);
  const caps = [];
  for (let p = 0; p < players; p++) {
    const b = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(p * 2 - 30, 3, -20));
    world.createCollider(R.ColliderDesc.capsule(0.5, 0.35).setCollisionGroups(groups(G.PLAYER, G.GROUND | G.CRATE)), b);
    caps.push(b);
  }
  return {
    world,
    handles: {
      hands: hands.map((b) => b.handle),
      beam: beam.handle,
      lane: lane.map((b) => b.handle),
      caps: caps.map((b) => b.handle),
    },
  };
}

// Drive the kinematic hands (and carriers' capsules, 0.5 m behind each hand) for step s from an input row.
export function drive(world, handles, row) {
  for (let k = 0; k < 2; k++) {
    const x = row[k * 3],
      y = row[k * 3 + 1],
      z = row[k * 3 + 2];
    world.getRigidBody(handles.hands[k]).setNextKinematicTranslation({ x, y, z });
    const cap = handles.caps[k];
    if (cap !== undefined)
      world.getRigidBody(cap).setNextKinematicTranslation({ x: x + (k ? 0.5 : -0.5), y: y - 0.3, z });
  }
}

// FNV-1a over bytes: snapshot and pose hashes without crypto, so browsers and Node agree on the function.
export function fnv(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) h = Math.imul(h ^ bytes[i], 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}
export function poseHash(world) {
  const f = new Float32Array(world.bodies.len() * 7);
  let i = 0;
  world.bodies.forEach((b) => {
    const t = b.translation(),
      r = b.rotation();
    f.set([t.x, t.y, t.z, r.x, r.y, r.z, r.w], i);
    i += 7;
  });
  return fnv(new Uint8Array(f.buffer));
}

// The two beam ends in world space (hand A's end first): x = ±2 along the beam, rotated by its quaternion.
export function beamEnds(world, handles) {
  const b = world.getRigidBody(handles.beam);
  const t = b.translation(),
    r = b.rotation();
  const end = (s) => {
    // rotate (s, 0, 0) by r: first column of the rotation matrix times s
    const x = (1 - 2 * (r.y * r.y + r.z * r.z)) * s,
      y = 2 * (r.x * r.y + r.w * r.z) * s,
      z = 2 * (r.x * r.z - r.w * r.y) * s;
    return [t.x + x, t.y + y, t.z + z];
  };
  return [end(-2), end(2)];
}
