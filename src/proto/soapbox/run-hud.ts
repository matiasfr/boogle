// The soapbox run's clock and its line on the HUD: ready at the top, the clock starts when you roll out of the start
// circle and stops on the finish line; a wipeout or getting out ends the run. Your best time stays in localStorage,
// for you only (DESIGN.md 6: personal rewards; this one is not even a reward, just a number).
import './soapbox.css';
import { protoCount } from '../count.ts';

type State = 'idle' | 'ready' | 'running' | 'done' | 'crashed';
type Route = {
  started: (x: number, z: number) => boolean;
  finished: (px: number, pz: number, x: number, z: number) => boolean;
  begun?: () => void; // the clock started
  done?: (time: number) => number | null; // the clock stopped: the split against the ghost (s, + is slower), if any
};
export type RunHud = ReturnType<typeof createRunHud>;

const KEY = 'boogle.soapbox.best';
const fmt = (s: number) => s.toFixed(2);
// the split against the ghost, to the hundredth: '+0.40 s' slower, '−0.40 s' ahead
const fmtSplit = (s: number) => {
  const r = Math.round(s * 100) / 100;
  return (r < 0 ? '−' : '+') + Math.abs(r).toFixed(2) + ' s';
};

function loadBest() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

export function createRunHud() {
  const el = document.createElement('div');
  el.className = 'soapbox-run';
  el.hidden = true;
  const big = document.createElement('div');
  big.className = 'soapbox-time';
  const small = document.createElement('div');
  small.className = 'soapbox-note';
  const split = document.createElement('div');
  split.className = 'soapbox-split';
  el.append(big, small, split);
  (document.querySelector('.hud') ?? document.body).append(el);

  let route: Route | null = null;
  let t0 = 0,
    px = 0,
    pz = 0,
    hideAt = 0;
  const run = { state: 'idle' as State, time: 0, best: loadBest() };
  const show = (a: string, b: string, cls = '', c = '') => {
    el.hidden = false;
    el.className = 'soapbox-run ' + cls;
    big.textContent = a;
    small.textContent = b;
    split.textContent = c;
    split.classList.toggle('is-ahead', c.startsWith('−'));
  };
  const bestNote = () => (run.best ? 'best ' + fmt(run.best) : '');
  const later = (ms: number) => (hideAt = performance.now() + ms);

  return {
    state: run,
    configure(r: Route) {
      route = r;
    },
    /** Run time at physics time `now`: 0 while ready, null when no run is on. */
    clock(now: number) {
      return run.state === 'ready' ? 0 : run.state === 'running' ? now - t0 : null;
    },
    ready() {
      run.state = 'ready';
      hideAt = 0;
      show('Ready', ['Roll off the hill to start', bestNote()].filter(Boolean).join(' · '), 'is-ready');
    },
    off() {
      run.state = 'idle';
      el.hidden = true;
    },
    leave(thrown: boolean) {
      if (run.state === 'running' && thrown) {
        run.state = 'crashed';
        show('Wipeout!', bestNote(), 'is-crash');
        later(2500);
      } else if (run.state !== 'done' || thrown) {
        run.state = 'idle';
        el.hidden = true;
      } else later(2500);
    },
    // Each frame while seated: where the cart is and the physics clock.
    tick(x: number, z: number, now: number) {
      if (hideAt && performance.now() > hideAt) {
        hideAt = 0;
        el.hidden = true;
      }
      if (!route) return;
      if (run.state === 'ready' && route.started(x, z)) {
        run.state = 'running';
        t0 = now;
        route.begun?.();
      }
      if (run.state === 'running') {
        const t = now - t0;
        if (route.finished(px, pz, x, z)) {
          run.state = 'done';
          run.time = t;
          const pb = !run.best || t < run.best;
          if (pb) {
            run.best = t;
            try {
              localStorage.setItem(KEY, String(Math.round(t * 1000) / 1000));
            } catch {
              // storage unavailable: the best lasts this visit
            }
          }
          protoCount('runs');
          const vs = route.done?.(t) ?? null;
          show(fmt(t), pb ? 'New best!' : bestNote(), pb ? 'is-best' : 'is-done', vs === null ? '' : fmtSplit(vs));
        } else if (t > 60) {
          run.state = 'idle';
          el.hidden = true;
        } else show(fmt(t), bestNote(), 'is-running');
      }
      px = x;
      pz = z;
    },
  };
}
