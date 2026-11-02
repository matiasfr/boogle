// The laying run (docs/game-design/haul.md "Machine runs"), solo in a proto- room (?proto=lay: Fill the Track ring),
// at desktop and iPad size: fill, start the machine, ride its deck through the whole run and past its end. Motion
// sheets of the warm-up, of laying close up, of the whole run and of its end (the whistle, then the machine moving on
// to the next section with you on it), plus a per-frame trace of the rider across the end: the deck must not lunge
// and the rider must not be thrown. Serves DESIGN.md 1 and 10.
import { TP } from './lib/world.ts';

// The parts of the harness (dev/scenarios/run.ts, dev/look/lib.ts) this scenario uses.
type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }, fov?: number) => Promise<void>;
  still: (label: string) => Promise<string>;
  motion: (label: string, o: { frames: number; seconds: number }) => Promise<{ sheet: string; score: number }>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean; query?: string; size?: number[] }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

const R = `const { rules } = await import('/src/world/game-world.ts');`;
const M = `const { trackMachine: TM } = await import('/src/features/track-machine.ts');`;
const WIDE = { cam: [17, 13, 10], look: [10.5, 0, -1] }; // high over site 1, section 1 running up to site 2
// The run's progress, 0..1000 (-1 before it starts, 1000 once laid).
const TOTAL = `(async () => { ${R} const s = rules.sites.sites; if (s.open >= 1) return 1000;
  return s.list[0].t0 < 0 ? -1 : rules.sites.run(0, window.boogle.sync.world.tick).total; })()`;
// Close by the machine, high on its east side (the ground rises west of the route), a little behind it.
async function chase(g: Game, front = false) {
  const p = (await g.eval(`${M} return { ...TM.pose };`)) as { x: number; y: number; z: number; yaw: number };
  const fx = Math.sin(p.yaw),
    fz = Math.cos(p.yaw);
  const back = front ? -6 : 2.5; // front: ahead of it, looking back at the sleepers it drops
  await g.view({
    cam: [p.x + (front ? 3 : 4) - fx * back, p.y + (front ? 2.6 : 4.5), p.z - fz * back],
    look: [p.x + fx * 1.5, p.y - 0.3, p.z + fz * 1.5],
  });
}

const SIZES: [string, number[]][] = [
  ['desktop', [1280, 800]],
  ['ipad', [1180, 820]],
];

export default {
  about: 'solo: fill, start and ride the laying run through its end at desktop and iPad size; the end does not lunge',
  timeout: 300000,
  async run(t: Run) {
    for (const [tag, size] of SIZES) {
      const room = 'proto-lay' + Math.random().toString(36).slice(2, 6);
      const g = await t.open({ name: 'solo', room, hud: true, size, query: 'proto=lay' });
      const up = await g.waitFor(`!!document.querySelector('.lay-proto button')`, { timeout: 90000 });
      t.check(`${tag}: the panel is up`, up >= 0);
      await g.waitFor(`window.boogle?.me?.entered`, { timeout: 30000 });
      await g.eval(`document.querySelector('.first-run-close')?.click();`);
      await g.eval(`document.querySelector('.lay-proto button').click();`);
      const full = await g.waitFor(`(async () => { ${R} return rules.sites.canRun(0); })()`, { timeout: 10000 });
      t.check(`${tag}: Fill the Track ring fills it`, full >= 0);

      // Ride: stand on the deck (it waits on the railhead).
      const pose = (await g.eval(`${M} return { ...TM.pose };`)) as { x: number; z: number; yaw: number };
      const fx = Math.sin(pose.yaw),
        fz = Math.cos(pose.yaw);
      await g.eval(TP(pose.x + fx * 0.8, pose.z + fz * 0.8, 'groundHeight(' + pose.x + ',' + pose.z + ') + 1.4'));
      await g.eval(`const { cam } = await import('/src/player/player.ts'); cam.yaw = ${pose.yaw + Math.PI};`);
      await chase(g);
      await t.sleep(800);
      // A per-frame trace of the rider and the deck, for the end of the run.
      await g.eval(`${M} const { carry } = await import('/src/physics/platforms.ts');
        const trace = (window.__layTrace = []);
        const rec = () => { const b = window.boogle.me.body.position, p = TM.pose;
          trace.push([performance.now(), b.x, b.y, b.z, p.x, p.y, p.z, carry.on === TM.platform() ? 1 : 0, TM.goal.s]);
          if (trace.length < 4000) requestAnimationFrame(rec); };
        rec();`);
      const t0 = Date.now();
      await g.eval(`window.boogle.sync.submitEdit({ op: 'site.run', i: 0, j: 0, s: 0 });`);
      await g.waitFor(`(async () => (await ${TOTAL}) >= 0)()`, { timeout: 10000 });
      const warm = await g.motion(`${tag}-warm`, { frames: 8, seconds: 1.4 });
      t.check(`${tag}: motion, warm-up and first sleepers`, true, `${warm.sheet} (score ${warm.score.toFixed(1)})`);
      await chase(g, true);
      const close = await g.motion(`${tag}-laying`, { frames: 8, seconds: 2 });
      t.check(`${tag}: motion, laying from the side`, true, `${close.sheet} (score ${close.score.toFixed(1)})`);
      await g.view(WIDE);
      const whole = await g.motion(`${tag}-run`, { frames: 12, seconds: 6 });
      t.check(`${tag}: motion, the rest of the run`, true, whole.sheet);
      // The end: from a little before the whistle until the machine has moved on to the next section.
      await g.waitFor(`(async () => (await ${TOTAL}) >= 820)()`, { timeout: 30000 });
      await chase(g);
      const end = await g.motion(`${tag}-end`, { frames: 12, seconds: 4 });
      t.check(`${tag}: motion, the end of the run`, true, `${end.sheet} (score ${end.score.toFixed(1)})`);
      const laid = await g.waitFor(`(async () => { ${R} return rules.sites.sites.open >= 1; })()`, { timeout: 30000 });
      t.check(`${tag}: section 1 is laid`, laid >= 0, `${((Date.now() - t0) / 1000).toFixed(1)} s from start`);
      await t.sleep(1500);
      const tr = (await g.eval(`return window.__layTrace;`)) as number[][];
      // Fastest the deck and the rider moved over any tenth of a second of the trace (m/s; one slow frame of the
      // headless renderer reads as a spike frame to frame); the rider's highest rise over the deck.
      let deck = 0,
        rider = 0,
        rise = 0,
        rode = 0;
      for (let k = 1, j = 0; k < tr.length; k++) {
        while (j < k - 1 && tr[k][0] - tr[j + 1][0] >= 100) j++;
        const dt = (tr[k][0] - tr[j][0]) / 1000;
        if (dt < 0.1) continue;
        deck = Math.max(deck, Math.hypot(tr[k][4] - tr[j][4], tr[k][6] - tr[j][6]) / dt);
        rider = Math.max(rider, Math.hypot(tr[k][1] - tr[j][1], tr[k][3] - tr[j][3]) / dt);
        rise = Math.max(rise, tr[k][2] - tr[k][5]);
        rode += tr[k][7];
      }
      const last = tr[tr.length - 1];
      const detail = `deck ${deck.toFixed(1)} m/s, rider ${rider.toFixed(1)} m/s, rider over deck up to ${rise.toFixed(2)} m, on deck ${rode}/${tr.length} frames, ends on it: ${last?.[7]}`;
      t.check(`${tag}: the deck never lunges (under 4 m/s)`, deck < 4, detail);
      t.check(`${tag}: the rider is still on the deck after the end`, last?.[7] === 1, detail);
      const after = await g.still(`${tag}-laid`);
      t.check(`${tag}: still, laid`, true, after);
      t.check(`${tag}: no page errors`, !g.errors.length, g.errors.slice(0, 3).join(' | '));
    }
  },
};
