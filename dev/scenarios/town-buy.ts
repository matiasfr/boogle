// Two real tabs hold different boards for one plot; accepted server jump-in, no shared-state edits.
import { writeRailSeed } from '../look/rail-seed.ts';
import { enterGame } from '../look/lib.ts';
import type { T } from './run.ts';
type Snapshot = {
  plots: { at: number; state: string; visible: boolean }[];
  till: { spent: number };
  kind: number;
  pos: { x: number; y: number; z: number };
};
const read = `const { inspectTown } = await import('/src/entities/town/state.ts');
const { rw, till } = await import('/dev/look/rail-read.ts');
const { Plot } = await import('/src/sim/railway-components.ts');
const w = rw();
return { plots: inspectTown()?.plots, kind: w.get(Plot,w.lookup(Plot,0)).kind, till: {...till(w)}, pos: {...window.boogle.me.body.position} };`;
const stand = (kind: number) => `const { teleport } = await import('/src/physics/engine.ts');
teleport(window.boogle.me.body,903.8,18.9,${kind === 1 ? 34 : 36.4});`;
const use = (edge: 'down' | 'up') => `const { triggerAction } = await import('/src/player/controls.ts');
triggerAction('interact','${edge}');`;
export default {
  sourceImports: true,
  timeout: 420000,
  about: 'one shared plot purchase, late join construction and occupied footprint',
  async run(t: T) {
    const label = 'town-choice-race';
    if (t.dataDir) await writeRailSeed(t.dataDir, label, 'house-ready');
    const A = await t.open({
      name: 'Buyer',
      ...(t.dataDir ? { room: label } : { query: 'from=house-ready' }),
      hud: true,
      size: [1200, 750],
    });
    const room = new URL(A.page.url()).searchParams.get('room') ?? label;
    const B = await t.open({ name: 'Partner', room, hud: true, size: [1200, 750] });
    for (const g of [A, B]) {
      const kind = g === A ? 1 : 2;
      await g.eval(stand(kind));
      await g.view({ cam: [897, 21.5, 34], look: [905, 19.6, 35] });
      const targeted = await g.waitFor(
        `(async()=>{const {interactTarget}=await import('/src/player/hands.ts');return interactTarget()?.id==='town.plot.0.${kind}';})()`,
      );
      if (targeted < 0) throw new Error(`board ${kind} was not targeted`);
      await g.still('board-' + kind);
    }
    const before = await A.eval<Snapshot>(read);
    await Promise.all([A.eval(use('down')), B.eval(use('down'))]);
    const accepted = await A.waitFor(
      `(async()=>{const {inspectTown}=await import('/src/entities/town/state.ts');return inspectTown()?.plots[0]?.at>=0;})()`,
    );
    await Promise.all([A.eval(use('up')), B.eval(use('up'))]);
    if (accepted < 0) throw new Error('neither board hold bought plot 0');
    const bought = await A.eval<Snapshot>(read);
    const other = await B.eval<Snapshot>(read);
    t.check(
      'one plot bought, strongbox spent once',
      bought.plots.filter((p) => p.at >= 0).length === 1 && bought.till.spent - before.till.spent === 150,
      JSON.stringify({ before, bought, other }),
    );
    t.check(
      'both tabs see same build',
      bought.plots[0]!.at === other.plots[0]!.at &&
        other.plots[0]!.state === 'building' &&
        [1, 2].includes(bought.kind) &&
        other.kind === bought.kind &&
        other.till.spent === bought.till.spent,
      JSON.stringify(other),
    );
    await A.eval(
      `const {teleport}=await import('/src/physics/engine.ts'); const {townBuilding}=await import('/src/place/town-plan.ts'); const p=townBuilding('plot3'); teleport(window.boogle.me.body,p.x+1000,18.9,p.z);`,
    );
    const inside = await A.eval<Snapshot>(read);
    await B.page.reload();
    await enterGame(B.page, 180000, 'Partner');
    await B.waitFor(`window.boogle?.me?.body && window.boogle.sync.worldStatus().ready`);
    await B.eval(stand(2));
    const late = await B.eval<Snapshot>(read);
    await B.motion('reload-build', { frames: 8, seconds: 2 });
    t.check('reload retains purchase tick', late.plots[0]!.at === bought.plots[0]!.at, JSON.stringify(late));
    await A.waitFor(
      `(async()=>{const {inspectTown}=await import('/src/entities/town/state.ts');return inspectTown()?.plots[0]?.state==='done';})()`,
    );
    const toy = `window.boogle.inspect().kinds.find(k=>k.kind==='town-hangout')?.entities[0]?.state`;
    const built = await B.waitFor(
      `(() => { const h=${toy};return h?.kind===${bought.kind} && (h.kind===1 ? h.stall : h.pads.every(p=>p.visible)); })()`,
      {
        timeout: 60000,
      },
    );
    t.check(
      'reload draws the chosen toy and clears its boards',
      built >= 0 && !(await B.eval<Snapshot>(read)).plots[0]!.visible,
      JSON.stringify(await B.eval('return ' + toy)),
    );
    const after = await A.eval<Snapshot>(read);
    t.check(
      'occupant moved from footprint',
      Math.hypot(after.pos.x - inside.pos.x, after.pos.z - inside.pos.z) > 1,
      JSON.stringify({ inside, after }),
    );
    await A.key('KeyW', 1000);
    const walked = await A.eval<Snapshot>(read);
    t.check(
      'occupant can walk away',
      Math.hypot(walked.pos.x - after.pos.x, walked.pos.z - after.pos.z) > 0.5,
      JSON.stringify(walked),
    );
    await A.still('buyer-built');
    await B.still('partner-built');
  },
};
