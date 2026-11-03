// Sync contracts for two-player plan steps 1–2; no cart, co-carry beam or see-saw work.
import type { Scenario } from './run.ts';

const setup = `
  const chop = await import('/src/proto/place/chop.ts');
  const { coop } = await import('/src/proto/place/coop.ts');
  const { job } = await import('/src/proto/place/job.ts');
  const { net } = await import('/src/netplay/net.ts');
  const { boilerAt } = await import('/src/proto/place/props.ts');
  window.__coopTest = { ...chop, coop, job, net, boilerAt };
`;
const state = `(() => {
  const c = window.__coopTest;
  return { trunk: c.trunkTaken(), boiler: c.job.boiler, big: c.back.big };
})()`;

export default {
  about: 'A departed carrier returns the great beam and boiler; observers and returning carriers agree',
  timeout: 180000,
  async run(t) {
    const room = 'coop-returns-' + Date.now();
    const opts = { room, query: 'proto=place&coop=1' };
    const a = await t.open({ ...opts, name: 'Authority' });
    const b = await t.open({ ...opts, name: 'Carrier' });
    const c = await t.open({ ...opts, name: 'Observer' });
    for (const g of [a, b, c]) {
      await g.eval(setup);
      t.check(
        `${g.name} sees both partners`,
        (await g.waitFor('window.__coopTest.coop.debug().peers.length === 2')) >= 0,
      );
    }
    // The actual pickup hooks, after the tree has fallen. Keep the carrier away from every deposit frame.
    await a.eval(`const c = window.__coopTest; c.greatTree.fall = 1; c.setTrunkTaken(false);`);
    await t.sleep(1500);
    await b.eval(`const c = window.__coopTest; c.shoulder('beam'); c.coop.big('beam');`);
    for (const g of [a, c])
      t.check(`${g.name} sees beam taken`, (await g.waitFor('window.__coopTest.trunkTaken()')) >= 0);
    await t.sleep(300); // publish the carrier's Owner presence before disconnecting
    await b.eval('window.__coopTest.net.room.pause(4000)');
    for (const g of [a, c]) {
      const returned = await g.waitFor('!window.__coopTest.trunkTaken()', { timeout: 3000 });
      t.check(`${g.name} returns departed beam`, returned >= 0, JSON.stringify(await g.eval(`return ${state}`)));
    }
    t.check(
      'Returning carrier loses stale beam',
      (await b.waitFor('window.__coopTest.back.big === null', { timeout: 12000 })) >= 0,
    );
    await a.view(
      await a.eval(`
      const tree = window.__coopTest.greatTree;
      const x = tree.x + Math.sin(tree.fallYaw) * 5, z = tree.z + Math.cos(tree.fallYaw) * 5;
      return { cam: [x + 12, tree.y + 10, z + 14], look: [x, tree.y + 1, z] };
    `),
    );
    await t.sleep(500);
    console.log('  returned beam capture:', await a.still('returned-beam'));
    // A second disconnect, this time with the boiler; also exercises a non-authority observer.
    await a.eval('window.__coopTest.job.boiler = 1');
    await t.sleep(4000);
    await b.eval(`const c = window.__coopTest; c.shoulder('boiler'); c.job.boiler = 2; c.coop.big('boiler');`);
    for (const g of [a, c])
      t.check(`${g.name} sees boiler taken`, (await g.waitFor('window.__coopTest.job.boiler === 2')) >= 0);
    await t.sleep(300);
    await b.eval('window.__coopTest.net.room.pause(4000)');
    for (const g of [a, c]) {
      const returned = await g.waitFor('window.__coopTest.job.boiler === 1', { timeout: 3000 });
      t.check(`${g.name} returns departed boiler`, returned >= 0, JSON.stringify(await g.eval(`return ${state}`)));
    }
    t.check(
      'Returning carrier loses stale boiler',
      (await b.waitFor('window.__coopTest.back.big === null', { timeout: 12000 })) >= 0,
    );
    await a.view(
      await a.eval(`
      const at = window.__coopTest.boilerAt();
      return { cam: [at.x - 3, at.y + 2, at.z + 3], look: [at.x, at.y + 0.5, at.z] };
    `),
    );
    await t.sleep(500);
    console.log('  returned boiler capture:', await a.still('returned-boiler'));
    // A rejected great beam must return to its carrier, too (T1 has no beam slot).
    await b.eval(`
      const c = window.__coopTest;
      const { L1 } = await import('/src/proto/place/lines.ts');
      c.shoulder('beam');
      c.putDownBig();
      c.coop.deposited(L1.stations[0], 'beam', { x: 900, y: 20, z: 14 });
    `);
    t.check('Rejected beam returns to shoulder', (await b.waitFor("window.__coopTest.back.big === 'beam'")) >= 0);
    await b.eval('window.__coopTest.putDownBig()');
    // The oldest tab can be the carrier. Rejoining must not let its old taken state win.
    await a.eval(`const c = window.__coopTest; c.shoulder('beam'); c.coop.big('beam');`);
    await t.sleep(500);
    await a.eval('window.__coopTest.net.room.pause(4000)');
    for (const g of [b, c])
      t.check(
        `${g.name} returns authority's beam`,
        (await g.waitFor('!window.__coopTest.trunkTaken()', { timeout: 3000 })) >= 0,
      );
    t.check(
      'Returning authority loses stale beam',
      (await a.waitFor('window.__coopTest.back.big === null', { timeout: 12000 })) >= 0,
    );
  },
} satisfies Scenario;
