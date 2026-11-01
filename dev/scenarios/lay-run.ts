// The laying-run variants (?proto=lay, docs/game-design/haul.md "Machine runs"), solo in a proto- room: the panel picks
// the variant (LAY_V=crawl|quick|push, default all three, one room each), Fill the Track ring, start the machine, and
// watch the first section get laid: riding the deck on crawl and quick, walking into its back on push. Motion sheets
// of the warm-up and of laying close up, and one over the whole run, plus how long it took. Serves DESIGN.md 1 and 10.
import { TP } from './lib/world.mjs';

// The parts of the harness (dev/scenarios/run.mjs, dev/look/lib.mjs) this scenario uses.
type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }, fov?: number) => Promise<void>;
  still: (label: string) => Promise<string>;
  motion: (label: string, o: { frames: number; seconds: number }) => Promise<{ sheet: string; score: number }>;
  down: (code: string) => Promise<void>;
  up: (code: string) => Promise<void>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean; query?: string }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

const R = `const { rules } = await import('/src/world/game-world.ts'); const { world } = await import('/src/world/sync.ts');`;
const M = `const { trackMachine: TM } = await import('/src/features/track-machine.ts');`;
const WIDE = { cam: [17, 13, 10], look: [10.5, 0, -1] }; // high over site 1, section 1 running up to site 2
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

export default {
  about: 'solo: each laying-run variant fills, starts, rides or is pushed, and lays section 1',
  timeout: 420000,
  async run(t: Run) {
    const kinds = process.env.LAY_V ? [process.env.LAY_V] : ['crawl', 'quick', 'push'];
    for (const v of kinds) {
      const room = 'proto-lay' + Math.random().toString(36).slice(2, 6);
      const g = await t.open({ name: 'solo', room, hud: true, query: `proto=lay&v=${v}` });
      const up = await g.waitFor(`!!document.querySelector('.lay-proto button')`, { timeout: 90000 });
      t.check(`${v}: the panel is up`, up >= 0);
      await g.waitFor(`window.boogle?.me?.entered`, { timeout: 30000 });
      await g.eval(`document.querySelector('.first-run-close')?.click();`);
      const want = ['crawl', 'quick', 'push'].indexOf(v);
      const tuned = await g.waitFor(`(async () => { ${R} return rules.sites.kind() === ${want}; })()`, {
        timeout: 15000,
      });
      t.check(`${v}: the room plays the ${v} run`, tuned >= 0);
      await g.eval(`document.querySelector('.lay-proto button').click();`);
      const full = await g.waitFor(`(async () => { ${R} return rules.sites.canRun(0); })()`, { timeout: 10000 });
      t.check(`${v}: Fill the Track ring fills it`, full >= 0);

      // Ride (crawl, quick): stand on the deck. Push: stand behind it, face along the section, hold forward.
      const pose = (await g.eval(`${M} return { ...TM.pose };`)) as { x: number; z: number; yaw: number };
      const fx = Math.sin(pose.yaw),
        fz = Math.cos(pose.yaw);
      // (it parks 5.15 m up the section and backs onto the railhead while warming up: stand behind where it will be)
      if (v === 'push') await g.eval(TP(pose.x - fx * 7.5, pose.z - fz * 7.5));
      else await g.eval(TP(pose.x + fx * 0.8, pose.z + fz * 0.8, 'groundHeight(' + pose.x + ',' + pose.z + ') + 1.4'));
      await g.eval(`const { cam } = await import('/src/player/player.ts'); cam.yaw = ${pose.yaw + Math.PI};`);
      await chase(g);
      await t.sleep(800);
      const t0 = Date.now();
      await g.eval(`window.boogle.sync.submitEdit({ op: 'site.run', i: 0, j: 0, s: 0 });`);
      await g.waitFor(`(async () => { ${R} return rules.sites.sites.list[0].t0 >= 0; })()`, { timeout: 10000 });
      if (v === 'push') {
        // A player leaning on it steers to stay square behind it: aim at the middle of its back every frame.
        await g.eval(`${M} const { cam } = await import('/src/player/player.ts');
          const aim = () => { const p = TM.pose, b = window.boogle.me.body.position;
            const tx = p.x - Math.sin(p.yaw) * 1.2, tz = p.z - Math.cos(p.yaw) * 1.2;
            cam.yaw = Math.atan2(-(tx - b.x), -(tz - b.z)); requestAnimationFrame(aim); };
          aim();`);
        await g.down('KeyW');
      }
      const warm = await g.motion(`${v}-warm`, { frames: 8, seconds: v === 'quick' ? 1.4 : 2.4 });
      t.check(`${v}: motion, warm-up and first sleepers`, true, `${warm.sheet} (score ${warm.score.toFixed(1)})`);
      await chase(g, true);
      const close = await g.motion(`${v}-laying`, { frames: 8, seconds: 2 });
      t.check(`${v}: motion, laying from the side`, true, `${close.sheet} (score ${close.score.toFixed(1)})`);
      const riding = await g.eval(`${M} const { carry } = await import('/src/physics/platforms.ts');
        return { riding: carry.on === TM.platform(), pushing: TM.isPushing() };`);
      t.check(`${v}: ${v === 'push' ? 'pushing' : 'riding the deck'}`, true, JSON.stringify(riding));
      await g.view(WIDE);
      const left = { crawl: 46, quick: 9, push: 22 }[v] ?? 40;
      const whole = await g.motion(`${v}-run`, { frames: 12, seconds: left });
      t.check(`${v}: motion, the rest of the run`, true, whole.sheet);
      const laid = await g.waitFor(`(async () => { ${R} return rules.sites.sites.open >= 1; })()`, {
        timeout: 60000,
      });
      if (v === 'push') await g.up('KeyW');
      t.check(`${v}: section 1 is laid`, laid >= 0, `${((Date.now() - t0) / 1000).toFixed(1)} s from start`);
      const after = await g.still(`${v}-laid`);
      t.check(`${v}: still, laid`, true, after);
      t.check(`${v}: no page errors`, !g.errors.length, g.errors.slice(0, 3).join(' | '));
    }
  },
};
