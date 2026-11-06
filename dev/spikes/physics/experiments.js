// The three measurements behind the 6 November follow-up in docs/research/shared-physics.md. Engine-neutral: node.mjs
// and browser.html both call runAll with loaded Rapier modules ({ det, simd, plain }, any subset; det required).
//
//   hashes    same scene, same inputs: snapshot and pose hashes per build, plus a snapshot round-trip check
//   cost      step, takeSnapshot, restoreSnapshot and restore + D resimulated steps, for the carry island alone
//             ("prediction world") and for a 3,000-body room
//   correct   client prediction of the carry against a server truth at RTT 0/100/200 ms: correction pops, error and
//             the gap between your hand and your end of the beam, for exact (deterministic rollback), state-based
//             (Rocket League style, det or SIMD client) and no prediction (interpolation only)
import { STEPS, beamEnds, build, drive, fnv, makeInputs, poseHash } from './scene.js';

const now = () => performance.now();
const PRED = { field: 16, size: 48, statics: 0, crates: 12, scatter: 0, players: 2 };
const ROOM = { field: 128, size: 256, statics: 300, crates: 12, scatter: 2980, players: 6 };
const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / (s.length || 1);
  const r = (v) => +(v * 1000).toFixed(3); // metres to mm
  return { meanMm: r(mean), p95Mm: r(s[Math.floor(s.length * 0.95)] ?? 0), maxMm: r(s[s.length - 1] ?? 0) };
};
const row = (inputs, k) => inputs.subarray(k * 6, k * 6 + 6);

export function hashes(mods) {
  const out = {};
  const inputs = makeInputs(STEPS, true);
  for (const [name, R] of Object.entries(mods)) {
    const { world, handles } = build(R, { ...ROOM, scatter: 200 });
    let half = null;
    for (let s = 0; s < STEPS; s++) {
      if (s === STEPS / 2) half = world.takeSnapshot();
      drive(world, handles, row(inputs, s));
      world.step();
    }
    const snap = world.takeSnapshot();
    // Round trip: restore the half-way snapshot and finish the run; it should land on the same bits.
    let w2 = R.World.restoreSnapshot(half);
    for (let s = STEPS / 2; s < STEPS; s++) {
      drive(w2, handles, row(inputs, s));
      w2.step();
    }
    out[name] = { snapshot: fnv(snap), pose: poseHash(world), roundTripPose: poseHash(w2), snapBytes: snap.length };
    world.free();
    w2.free();
    // The 3,000-body room after 300 steps.
    const big = build(R, ROOM);
    for (let s = 0; s < 300; s++) {
      drive(big.world, big.handles, row(inputs, s));
      big.world.step();
    }
    out[name].room3000Pose = poseHash(big.world);
    big.world.free();
  }
  return out;
}

export function cost(R, { reps = 10 } = {}) {
  const inputs = makeInputs(STEPS, true);
  const res = {};
  for (const [label, opts] of [
    ['prediction world', PRED],
    ['3,000-body room', ROOM],
  ]) {
    let { world, handles } = build(R, opts);
    for (let s = 0; s < 300; s++) {
      drive(world, handles, row(inputs, s));
      world.step();
    }
    let awake = 0,
      bodies = 0;
    world.bodies.forEach((b) => {
      bodies++;
      if (b.isDynamic() && !b.isSleeping()) awake++;
    });
    let t = now();
    for (let s = 300; s < 420; s++) {
      drive(world, handles, row(inputs, s));
      world.step();
    }
    const stepMs = (now() - t) / 120;
    let snap = world.takeSnapshot(); // warm-up
    R.World.restoreSnapshot(snap).free();
    t = now();
    for (let i = 0; i < reps; i++) snap = world.takeSnapshot();
    const snapMs = (now() - t) / reps;
    t = now();
    for (let i = 0; i < reps; i++) R.World.restoreSnapshot(snap).free();
    const restoreMs = (now() - t) / reps;
    const resim = {};
    for (const D of [8, 14]) {
      t = now();
      for (let i = 0; i < reps; i++) {
        const w = R.World.restoreSnapshot(snap);
        for (let s = 0; s < D; s++) {
          drive(w, handles, row(inputs, 420 + s));
          w.step();
        }
        w.free();
      }
      resim[`restorePlus${D}Ms`] = +((now() - t) / reps).toFixed(3);
    }
    res[label] = {
      bodies,
      awake,
      stepMs: +stepMs.toFixed(3),
      snapBytes: snap.length,
      snapMs: +snapMs.toFixed(3),
      restoreMs: +restoreMs.toFixed(3),
      ...resim,
    };
    world.free();
  }
  return res;
}

// One client's view of the carry. Client is hand A; B is the remote carrier, predicted by holding its last velocity.
// D = RTT in steps + 2 buffer steps: how far the client's present runs ahead of the latest server state it has.
function truthRun(Rs, inputs) {
  const { world, handles } = build(Rs, PRED);
  const ends = [beamEnds(world, handles)];
  const shared = [handles.beam, ...handles.lane];
  const states = [];
  const record = () => {
    const st = new Float64Array(shared.length * 13 + 6);
    shared.forEach((h, i) => {
      const b = world.getRigidBody(h);
      const t = b.translation(),
        r = b.rotation(),
        v = b.linvel(),
        w = b.angvel();
      st.set([t.x, t.y, t.z, r.x, r.y, r.z, r.w, v.x, v.y, v.z, w.x, w.y, w.z], i * 13);
    });
    handles.hands.forEach((h, k) => {
      const t = world.getRigidBody(h).translation();
      st.set([t.x, t.y, t.z], shared.length * 13 + k * 3);
    });
    states.push(st);
  };
  record();
  const hashAt = {};
  for (let s = 0; s < STEPS; s++) {
    drive(world, handles, row(inputs, s));
    world.step();
    ends.push(beamEnds(world, handles));
    record();
    hashAt[s + 1] = poseHash(world);
  }
  world.free();
  return { ends, states, hashAt, shared };
}

function predictedRow(inputs, k, s, oracle) {
  const r = Float64Array.from(row(inputs, k));
  if (oracle || k < s) return r; // B's input for row k is confirmed once the server state for tick k + 1 is in
  const a = row(inputs, Math.max(0, s - 2)),
    b = row(inputs, Math.max(0, s - 1));
  const n = k - s + 1;
  for (let i = 3; i < 6; i++) r[i] = b[i] + (b[i] - a[i]) * n;
  return r;
}

function applyState(world, handles, shared, st) {
  shared.forEach((h, i) => {
    const b = world.getRigidBody(h),
      o = i * 13;
    b.setTranslation({ x: st[o], y: st[o + 1], z: st[o + 2] }, true);
    b.setRotation({ x: st[o + 3], y: st[o + 4], z: st[o + 5], w: st[o + 6] }, true);
    b.setLinvel({ x: st[o + 7], y: st[o + 8], z: st[o + 9] }, true);
    b.setAngvel({ x: st[o + 10], y: st[o + 11], z: st[o + 12] }, true);
  });
  handles.hands.forEach((h, k) => {
    const o = shared.length * 13 + k * 3;
    world.getRigidBody(h).setTranslation({ x: st[o], y: st[o + 1], z: st[o + 2] }, true);
  });
}

function clientRun(Rc, truth, inputs, { mode, D, oracle }) {
  const pops = [],
    errs = [],
    gaps = [];
  let corrMs = 0;
  let { world: P, handles } = build(Rc, PRED);
  let K = mode === 'exact' ? build(Rc, PRED).world : null;
  let kTick = 0;
  const hist = [P.takeSnapshot()];
  const handA = (c) => [inputs[(c - 1) * 6], inputs[(c - 1) * 6 + 1], inputs[(c - 1) * 6 + 2]];
  for (let c = 1; c <= STEPS; c++) {
    const s = Math.max(0, c - D);
    drive(P, handles, predictedRow(inputs, c - 1, s, oracle));
    P.step();
    const pre = beamEnds(P, handles);
    const t0 = now();
    let base;
    if (mode === 'exact') {
      while (kTick < s) {
        drive(K, handles, row(inputs, kTick));
        K.step();
        kTick++;
      }
      base = Rc.World.restoreSnapshot(K.takeSnapshot());
    } else {
      base = Rc.World.restoreSnapshot(hist[s]);
      applyState(base, handles, truth.shared, truth.states[s]);
    }
    for (let k = s; k < c; k++) {
      drive(base, handles, predictedRow(inputs, k, s, oracle));
      base.step();
    }
    P.free();
    P = base;
    if (mode !== 'exact') hist[c] = P.takeSnapshot();
    if (mode !== 'exact' && c - D - 2 >= 0) hist[c - D - 2] = null;
    corrMs += now() - t0;
    const post = beamEnds(P, handles);
    pops.push(Math.max(dist(pre[0], post[0]), dist(pre[1], post[1])));
    errs.push(Math.max(dist(post[0], truth.ends[c][0]), dist(post[1], truth.ends[c][1])));
    gaps.push(dist(handA(c), post[0]));
  }
  const exactCheck = K ? poseHash(K) === truth.hashAt[kTick] || `tick ${kTick} not checked` : undefined;
  if (K) K.free();
  P.free();
  return {
    pop: stats(pops),
    popsOver1cmPerMin: +((pops.filter((p) => p > 0.01).length / STEPS) * 3600).toFixed(1),
    error: stats(errs),
    handGap: stats(gaps),
    correctionMsPerFrame: +(corrMs / STEPS).toFixed(3),
    ...(exactCheck !== undefined && { confirmedMatchesServer: exactCheck }),
  };
}

export function correct(mods, { rtts = [0, 100, 200] } = {}) {
  const out = {};
  for (const wobble of [false, true]) {
    const inputs = makeInputs(STEPS, wobble);
    const truth = truthRun(mods.det, inputs);
    for (const rtt of rtts) {
      const D = Math.round((rtt / 1000) * 60) + 2;
      const key = `${wobble ? 'B wobbles' : 'B predictable (oracle)'}, RTT ${rtt} ms, D ${D}`;
      const runs = {};
      const opts = { D, oracle: !wobble };
      runs['exact (det rollback)'] = clientRun(mods.det, truth, inputs, { ...opts, mode: 'exact' });
      runs['state (det client)'] = clientRun(mods.det, truth, inputs, { ...opts, mode: 'state' });
      if (mods.simd) runs['state (SIMD client)'] = clientRun(mods.simd, truth, inputs, { ...opts, mode: 'state' });
      // No prediction: your hand is in the present, the beam is the server's, RTT + 120 ms interpolation old.
      // The server's own gap (joint stretch when the carriers pull apart) is the floor for every mode.
      const lag = Math.round((rtt / 1000) * 60) + 7;
      const hand = (c) => [inputs[(c - 1) * 6], inputs[(c - 1) * 6 + 1], inputs[(c - 1) * 6 + 2]];
      const gaps = [],
        floor = [];
      for (let c = 1; c <= STEPS; c++) {
        gaps.push(dist(hand(c), truth.ends[Math.max(0, c - lag)][0]));
        floor.push(dist(hand(c), truth.ends[c][0]));
      }
      runs['none (interpolate server)'] = { handGap: stats(gaps) };
      runs['server truth (no network)'] = { handGap: stats(floor) };
      out[key] = runs;
    }
  }
  return out;
}

export function runAll(mods, { only } = {}) {
  const res = {};
  if (!only || only === 'hashes') res.hashes = hashes(mods);
  if (!only || only === 'cost') {
    res.cost = {};
    for (const [name, R] of Object.entries(mods)) if (name !== 'plain') res.cost[name] = cost(R);
  }
  if (!only || only === 'correct') res.correct = correct(mods);
  return res;
}
