// Timer/action cost accounting and the complete railway status projection. The two step paths keep their distinct cadence.
import type { createSync } from '../../../src/world/sync.ts';
import { STEP_MS } from '../../../src/world/room-clock.ts';
import type { ServerOps } from '../../../src/world/server-ops.ts';
import type { installSeats } from '../../../src/world/rules/seats.ts';
import type { createHostBoogler } from './host-boogler.ts';
import type { HostCheckpoint } from './host-checkpoint.ts';
import type { StepMeter } from './step-meter.ts';

export function createHostStatus({
  sync,
  tick,
  meter,
  checkpoint,
  maintain,
  receive,
  failed,
  seats,
  boogler,
  booglerMeter,
  ops,
}: {
  sync: ReturnType<typeof createSync>;
  tick: boolean;
  meter?: StepMeter;
  checkpoint: HostCheckpoint;
  maintain: () => void;
  receive: (message: unknown, from: string) => void;
  failed: () => boolean;
  seats: Pick<ReturnType<typeof installSeats>, 'rows'>;
  boogler: ReturnType<typeof createHostBoogler>['boogler'];
  booglerMeter: ReturnType<typeof createHostBoogler>['meter'];
  ops: ServerOps;
}) {
  // Server cost (npm run load, /rooms/:id/status): ms per timer wake (steps, rules, commit, flush) and per action.
  const stats = { wakes: 0, steps: 0, stepMs: 0, maxStepMs: 0, actions: 0, actionMs: 0, maxActionMs: 0 };
  let last = performance.now();
  const timer = tick
    ? setInterval(() => {
        const time = performance.now();
        meter?.timer(time);
        if (checkpoint.canStep()) {
          const before = sync.world.tick;
          const step0 = sync.roomStep();
          sync.stepWorld(Math.min(time - last, 1000));
          if (sync.world.tick !== before) {
            maintain();
          }
          const ms = performance.now() - time;
          stats.wakes++;
          stats.steps += sync.roomStep() - step0;
          stats.stepMs += ms;
          stats.maxStepMs = Math.max(stats.maxStepMs, ms);
        }
        last = time;
      }, STEP_MS)
    : null;
  timer?.unref();

  return {
    stats,
    stop() {
      if (timer) clearInterval(timer);
    },
    deliver(message: unknown, from: string) {
      const t0 = performance.now();
      receive(message, from);
      const ms = performance.now() - t0;
      stats.actions++;
      stats.actionMs += ms;
      stats.maxActionMs = Math.max(stats.maxActionMs, ms);
    },
    step(dt: number) {
      if (checkpoint.canStep()) {
        sync.stepWorld(dt * 1000);
        maintain();
      }
    },
    status: () => {
      const status = sync.worldStatus();
      const commandFailed = failed();
      const { loaded, startupError, running } = checkpoint.state();
      return {
        tick: sync.world.tick,
        seats: seats.rows(),
        boogler: boogler.leg(),
        booglerMeter: booglerMeter.report(),
        booglerRefused: { gift: ops.refusals('boogler.gift'), puff: ops.refusals('boogler.puff') },
        ...status,
        recoveryError: startupError ?? status.recoveryError ?? (commandFailed ? 'server command storage failed' : null),
        ready: loaded && !startupError && !status.recoveryError && !commandFailed,
        paused: !running,
      };
    },
  };
}
export type HostStats = ReturnType<typeof createHostStatus>['stats'];
