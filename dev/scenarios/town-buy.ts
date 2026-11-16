// Two real tabs hold one board; accepted server jump-in, no shared-state edits.
import type { T } from './run.ts';
type Snapshot = {
  plots: { at: number; state: string }[];
  till: { spent: number };
  pos: { x: number; y: number; z: number };
};
const read = `const { inspectTown } = await import('/src/entities/town/state.ts');
const { rw, till } = await import('/dev/look/rail-read.ts');
return { plots: inspectTown()?.plots, till: {...till(rw())}, pos: {...window.boogle.me.body.position} };`;
const stand = `const { teleport } = await import('/src/physics/engine.ts');
teleport(window.boogle.me.body,904.6,18.9,33.4);`;
const hold = `const { triggerAction } = await import('/src/player/controls.ts');
triggerAction('interact','down'); setTimeout(()=>triggerAction('interact','up'),1600);`;
export default {
  sourceImports: true,
  timeout: 180000,
  about: 'one shared plot purchase, late join construction and occupied footprint',
  async run(t: T) {
    const A = await t.open({ name: 'Buyer', query: 'from=house-ready', hud: true });
    const room = new URL(A.page.url()).searchParams.get('room')!;
    const B = await t.open({ name: 'Partner', room, hud: true });
    for (const g of [A, B]) {
      await g.eval(stand);
      await g.waitFor(
        `(async()=>{const {interactTarget}=await import('/src/player/hands.ts');return interactTarget()?.id==='town.plot.0';})()`,
      );
    }
    const before = await A.eval<Snapshot>(read);
    await Promise.all([A.eval(hold), B.eval(hold)]);
    await A.waitFor(
      `(async()=>{const {inspectTown}=await import('/src/entities/town/state.ts');return inspectTown()?.plots[0]?.at>=0;})()`,
    );
    const bought = await A.eval<Snapshot>(read);
    const other = await B.eval<Snapshot>(read);
    t.check(
      'one plot bought, strongbox spent once',
      bought.plots.filter((p) => p.at >= 0).length === 1 && bought.till.spent - before.till.spent === 150,
      JSON.stringify({ before, bought, other }),
    );
    t.check(
      'both tabs see same build',
      bought.plots[0]!.at === other.plots[0]!.at && other.plots[0]!.state === 'building',
      JSON.stringify(other),
    );
    await A.eval(
      `const {teleport}=await import('/src/physics/engine.ts'); const {townBuilding}=await import('/src/place/town-plan.ts'); const p=townBuilding('plot3'); teleport(window.boogle.me.body,p.x+1000,18.9,p.z);`,
    );
    const inside = await A.eval<Snapshot>(read);
    await B.page.reload();
    await B.waitFor(`window.boogle?.me?.body && window.boogle.sync.worldStatus().ready`);
    const late = await B.eval<Snapshot>(read);
    await B.motion('reload-build', { frames: 8, seconds: 2 });
    t.check('reload retains purchase tick', late.plots[0]!.at === bought.plots[0]!.at, JSON.stringify(late));
    await A.waitFor(
      `(async()=>{const {inspectTown}=await import('/src/entities/town/state.ts');return inspectTown()?.plots[0]?.state==='done';})()`,
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
