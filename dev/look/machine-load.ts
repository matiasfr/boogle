// The tooling's one load reading: the bot queue's gate, verdict stamps, bench and cold-launch records, look's queue
// manifests, the daily perf job's quiet check and the heartbeat's "Ship lock and load" line. No game/runtime imports.
//
// Off Windows it is os.loadavg()'s 1-minute load average (threads running or waiting to run), unchanged.
//
// On Windows os.loadavg() is always [0, 0, 0], so the reading is busy logical CPUs instead: the share of all logical
// CPUs' time that was not idle, from os.cpus() times, times their count. Below saturation that is what a load average
// counts (6 busy cores of 10 reads 6 either way); it cannot see threads queued past saturation, so it tops out at the
// CPU count. Chosen over the processor queue length (\System\Processor Queue Length) because that is one instantaneous
// counter that stays near zero on a many-core machine until it is saturated, and each reading needs a PowerShell or
// typeperf child that itself loads the machine; os.cpus() is free and the same on every Windows. The window is the time
// since this process's previous reading (or since this module loaded), at least WINDOW_MS (a short wait when it is
// less and nothing was read yet) and at most STALE_MS (older than that, a fresh WINDOW_MS sample). Readings in one
// process are smoothed with a 60 s time constant, so a gate that polls sees a 1-minute average as on the Mac; a single
// reading is a one-shot sample of a second or more.
//
// Thresholds are written for the Mac's 10 cores (the bot gate's 30, the bench's quiet 6). loadLimit() turns one into
// this machine's units through load per core: 30 on 10 cores is 3 per core, 6 is 0.6. Off Windows that is per core
// times this machine's cores (the Mac reads 30 and 6 as before). On Windows a per-core limit above SATURATED, which
// only the invisible queue could reach, caps at SATURATED: on HOTBOX's 20 logical CPUs the bot gate holds above 18
// busy (90%) and the quiet check wants at most 12 busy (60%).
import os from 'node:os';

const windows = process.platform === 'win32';
/** The machine the thresholds were set on: the owner's M1 Max. */
export const REFERENCE_CORES = 10;
/** On Windows, the busy share that stands for "saturated, maybe queued": the most a per-core limit can ask for. */
export const SATURATED = 0.9;
const WINDOW_MS = 1000;
const STALE_MS = 60_000;
const SMOOTH_MS = 60_000;

/** What the number is, for a report line. */
export const loadKind = windows ? 'busy logical CPUs (Windows has no load average)' : '1-minute load average';

type Sample = { at: number; busy: number; total: number };
function sample(): Sample {
  let busy = 0;
  let total = 0;
  // libuv's Windows `sys` is kernel time less idle, which already holds interrupt time, so `irq` is not added again.
  for (const { times: t } of os.cpus()) {
    const all = t.user + t.nice + t.sys + t.idle;
    total += all;
    busy += all - t.idle;
  }
  return { at: performance.now(), busy, total };
}
let last: Sample | undefined = windows ? sample() : undefined;
let smoothed: number | undefined;

function busyCpus(): number {
  let now = sample();
  if (!last || now.at - last.at > STALE_MS) {
    last = now;
    smoothed = undefined;
  }
  if (now.at - last.at < WINDOW_MS) {
    if (smoothed !== undefined) return smoothed;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, WINDOW_MS - (now.at - last.at));
    now = sample();
  }
  const share = now.total > last.total ? (now.busy - last.busy) / (now.total - last.total) : 0;
  const raw = share * os.cpus().length;
  const dt = now.at - last.at;
  smoothed = smoothed === undefined ? raw : smoothed + (raw - smoothed) * (1 - Math.exp(-dt / SMOOTH_MS));
  last = now;
  return smoothed;
}

/** The machine's load now, in load-average units (on Windows, busy logical CPUs). May block up to a second on Windows. */
export function machineLoad(): number {
  return windows ? busyCpus() : os.loadavg()[0]!;
}

/** For records that kept all three averages: os.loadavg() off Windows, one reading there. */
export function loadAverages(): number[] {
  return windows ? [busyCpus()] : os.loadavg();
}

/** A threshold written for REFERENCE_CORES cores, in this machine's units (0 stays 0: a gate turned off). */
export function loadLimit(onReferenceCores: number, cores = os.cpus().length, win = windows): number {
  const perCore = onReferenceCores / REFERENCE_CORES;
  return (win ? Math.min(perCore, SATURATED) : perCore) * cores;
}
