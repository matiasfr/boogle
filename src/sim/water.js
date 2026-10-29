// Phase 4 water: pure, deterministic, integer-only column water simulation.
// No three.js, no DOM, no Math.random, no floats in state or in step().
//
// ALGORITHM
//   Each cell holds `depth` (cm of water) on top of `terrain` (cm). Surface = terrain + depth.
//   step() sweeps active cells in a fixed order (row-major, direction alternating with tick
//   parity to cancel directional bias). For each wet cell, for its 4 neighbours in a fixed
//   (parity-dependent) order, using LIVE values (Gauss-Seidel, so nothing can go negative or
//   overshoot): if surface diff >= 2, move m = clamp((diff*flowRate)>>9, 1, diff>>1, depth).
//   Moving at most half the difference means a pair can never swap order => no oscillation;
//   levels settle to within 1 cm per cell of run (diff 1 never moves, so a 1-cm staircase persists). Water is conserved exactly by those moves.
//
//   Sea: the outside of every border edge in `seaEdges` is an infinite reservoir at `sea` cm.
//   A border cell with surface < sea gains ceil(diff*flowRate/256) (<= diff); above sea it loses
//   the same (<= depth). So below-sea holes near the shore fill to sea level, and raised pools
//   connected to the shore drain into it. Net sea exchange is tracked in stats().seaNet.
//
//   Sources add `rate` cm/tick to a cell (before flow). Evaporation (the only other sink): every
//   `evapInterval` ticks, a cell with 0 < depth <= `evapMax` whose neighbours are ALL also
//   <= evapMax is removed (thin isolated films/trickles die; shorelines of real water are
//   untouched). Not applied to source cells or to sea-connected cells at/below sea level.
//
//   Activity: `act[c]` = quiet-tick countdown. A cell that moves water (or receives it) is reset
//   to `quietTicks` and wakes its neighbours; cells at 0 are skipped. Sleeping cells are
//   provably idle (the rule is a pure function of local state), so load() waking everything is
//   state-equivalent to an uninterrupted run. External changes (terrain edits) must call wake().
//
// INDEXING: i in [0,width), j in [0,height), idx = i*height + j (matches heights[i][j] flattened,
//   i is the "row"). Use w.idx(i,j). `terrain` is read live each step (Int32Array, cm).
//
// API: createWater({width,height,terrain,sea=0,seaEdges=15,flowRate=160,quietTicks=6,
//        evapInterval=20,evapMax=1}) ->
//   depth, idx(i,j), addWater, removeWater (returns removed), setSource/clearSource, setSeaLevel,
//   step, wake(i,j,r=1), serialize, load, hash, stats.
// seaEdges bitmask: 1 = i=0 side, 2 = i=width-1, 4 = j=0, 8 = j=height-1. 0 = no sea.

const MAX_DEPTH = 1 << 20;

export function createWater(opts) {
  const { width, height, terrain } = opts;
  const N = width * height;
  if (!(terrain instanceof Int32Array) || terrain.length !== N)
    throw new Error('terrain must be Int32Array(width*height)');
  let sea = opts.sea | 0;
  const seaEdges = (opts.seaEdges ?? 15) | 0;
  const rate = Math.max(1, Math.min(256, opts.flowRate ?? 160)) | 0;
  const K = Math.max(1, opts.quietTicks ?? 6) | 0;
  const evapInterval = (opts.evapInterval ?? 20) | 0;
  const evapMax = (opts.evapMax ?? 1) | 0;

  const depth = new Int32Array(N);
  const act = new Uint8Array(N);
  // bit set => that neighbour does not exist (edge). Same bit layout as seaEdges.
  const edge = new Uint8Array(N);
  for (let i = 0; i < width; i++)
    for (let j = 0; j < height; j++) {
      let e = 0;
      if (i === 0) e |= 1;
      if (i === width - 1) e |= 2;
      if (j === 0) e |= 4;
      if (j === height - 1) e |= 8;
      edge[i * height + j] = e;
    }
  // Neighbour offsets paired with the edge bit that says "no such neighbour".
  const OFF_A = [-height, height, -1, 1];
  const BIT_A = [1, 2, 4, 8];
  const OFF_B = [1, -1, height, -height]; // different order on odd ticks
  const BIT_B = [8, 4, 2, 1];

  let srcIdx = [];
  let srcRate = [];
  const srcMap = new Map();
  let tick = 0;
  let added = 0;
  let seaNet = 0; // net water gained from sea (negative = drained into sea)
  let evaporated = 0;

  const inb = (i, j) => i >= 0 && j >= 0 && i < width && j < height;
  const idx = (i, j) => i * height + j;

  function rebuildSources() {
    const keys = [...srcMap.keys()].sort((a, b) => a - b);
    srcIdx = keys;
    srcRate = keys.map((k) => srcMap.get(k));
  }

  function wake(i, j, r = 1) {
    for (let a = Math.max(0, i - r); a <= Math.min(width - 1, i + r); a++)
      for (let b = Math.max(0, j - r); b <= Math.min(height - 1, j + r); b++) act[a * height + b] = K;
  }
  function wakeAllRelevant() {
    for (let c = 0; c < N; c++) if (depth[c] > 0 || edge[c] & seaEdges) act[c] = K;
  }

  function step() {
    tick++;
    for (let k = 0; k < srcIdx.length; k++) {
      const c = srcIdx[k];
      const r = Math.min(srcRate[k], MAX_DEPTH - depth[c]);
      depth[c] += r;
      added += r;
      act[c] = K;
    }
    const fwd = (tick & 1) === 0;
    const OFF = fwd ? OFF_A : OFF_B;
    const BIT = fwd ? BIT_A : BIT_B;
    for (let n = 0; n < N; n++) {
      const c = fwd ? n : N - 1 - n;
      const a = act[c];
      if (a === 0) continue;
      const e = edge[c];
      const tc = terrain[c];
      let d = depth[c];
      let moved = false;
      if (d > 0) {
        for (let k = 0; k < 4; k++) {
          if (e & BIT[k]) continue;
          const nb = c + OFF[k];
          const diff = tc + d - terrain[nb] - depth[nb];
          if (diff >= 2) {
            let m = (diff * rate) >> 9;
            if (m < 1) m = 1;
            const h = diff >> 1;
            if (m > h) m = h;
            if (m > d) m = d;
            d -= m;
            depth[nb] += m;
            act[nb] = K;
            moved = true;
            if (d === 0) break;
          }
        }
      }
      const sm = e & seaEdges;
      if (sm !== 0) {
        const sides = (sm & 1) + ((sm >> 1) & 1) + ((sm >> 2) & 1) + ((sm >> 3) & 1);
        for (let s = 0; s < sides; s++) {
          const diff = tc + d - sea;
          if (diff < 0) {
            let m = (-diff * rate + 255) >> 8;
            if (m > -diff) m = -diff;
            d += m;
            seaNet += m;
            moved = true;
          } else if (diff > 0 && d > 0) {
            let m = (diff * rate + 255) >> 8;
            if (m > diff) m = diff;
            if (m > d) m = d;
            d -= m;
            seaNet -= m;
            moved = true;
          }
        }
      }
      depth[c] = d;
      if (moved) {
        act[c] = K;
        for (let k = 0; k < 4; k++) if (!(e & BIT[k])) act[c + OFF[k]] = K;
      } else act[c] = a - 1;
    }
    if (evapInterval > 0 && tick % evapInterval === 0) evaporate();
  }

  function evaporate() {
    for (let c = 0; c < N; c++) {
      const d = depth[c];
      if (d === 0 || d > evapMax) continue;
      if (srcMap.has(c)) continue;
      const e = edge[c];
      if (e & seaEdges && terrain[c] + d <= sea) continue;
      let ok = true;
      for (let k = 0; k < 4 && ok; k++) {
        if (e & BIT_A[k]) continue;
        if (depth[c + OFF_A[k]] > evapMax) ok = false;
      }
      if (!ok) continue;
      depth[c] = 0;
      evaporated += d;
      for (let k = 0; k < 4; k++) if (!(e & BIT_A[k])) act[c + OFF_A[k]] = K;
    }
  }

  function addWater(i, j, cm) {
    if (!inb(i, j)) return 0;
    const c = idx(i, j);
    const m = Math.max(0, Math.min(cm | 0, MAX_DEPTH - depth[c]));
    depth[c] += m;
    added += m;
    wake(i, j, 1);
    return m;
  }
  function removeWater(i, j, cm) {
    if (!inb(i, j)) return 0;
    const c = idx(i, j);
    const m = Math.max(0, Math.min(cm | 0, depth[c]));
    depth[c] -= m;
    added -= m;
    wake(i, j, 1);
    return m;
  }

  function hash() {
    let h = 0x811c9dc5;
    const mix = (v) => {
      h = Math.imul(h ^ (v & 0xff), 0x01000193);
      h = Math.imul(h ^ ((v >>> 8) & 0xff), 0x01000193);
      h = Math.imul(h ^ ((v >>> 16) & 0xff), 0x01000193);
      h = Math.imul(h ^ (v >>> 24), 0x01000193);
    };
    mix(width);
    mix(height);
    mix(sea);
    mix(tick);
    for (let c = 0; c < N; c++)
      if (depth[c] !== 0) {
        mix(c);
        mix(depth[c]);
      }
    for (let k = 0; k < srcIdx.length; k++) {
      mix(srcIdx[k]);
      mix(srcRate[k]);
    }
    return h >>> 0;
  }

  function serialize() {
    const cells = [];
    for (let c = 0; c < N; c++) if (depth[c] !== 0) cells.push(c, depth[c]);
    const src = [];
    for (let k = 0; k < srcIdx.length; k++) src.push(srcIdx[k], srcRate[k]);
    return { v: 1, width, height, sea, tick, added, seaNet, evaporated, cells, src };
  }

  function load(json) {
    if (!json || json.width !== width || json.height !== height) throw new Error('water snapshot size mismatch');
    depth.fill(0);
    act.fill(0);
    for (let k = 0; k + 1 < json.cells.length; k += 2) depth[json.cells[k]] = json.cells[k + 1];
    srcMap.clear();
    for (let k = 0; k + 1 < json.src.length; k += 2) srcMap.set(json.src[k], json.src[k + 1]);
    rebuildSources();
    sea = json.sea | 0;
    tick = json.tick | 0;
    added = json.added | 0;
    seaNet = json.seaNet | 0;
    evaporated = json.evaporated | 0;
    wakeAllRelevant();
  }

  function stats() {
    let active = 0,
      total = 0,
      wet = 0;
    for (let c = 0; c < N; c++) {
      if (act[c]) active++;
      total += depth[c];
      if (depth[c] > 0) wet++;
    }
    return { active, total, wet, tick, added, seaNet, evaporated };
  }

  wakeAllRelevant();

  return {
    width,
    height,
    depth,
    terrain,
    idx,
    step,
    wake,
    hash,
    serialize,
    load,
    stats,
    addWater,
    removeWater,
    setSource(i, j, cmPerTick) {
      if (!inb(i, j)) return;
      srcMap.set(idx(i, j), Math.max(0, cmPerTick | 0));
      rebuildSources();
      act[idx(i, j)] = K;
    },
    clearSource(i, j) {
      if (srcMap.delete(idx(i, j))) rebuildSources();
    },
    setSeaLevel(cm) {
      sea = cm | 0;
      for (let c = 0; c < N; c++) if (edge[c] & seaEdges) act[c] = K;
    },
    get seaLevel() {
      return sea;
    },
    get tick() {
      return tick;
    },
  };
}
