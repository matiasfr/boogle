import test from 'node:test';
import assert from 'node:assert/strict';
import { createBecsySlice, projectJobs, type Command } from './becsy.ts';
import { jobSlice, inhouse } from './baseline.ts';
import { createSync } from '../../../src/world/sync.ts';
import { installRules } from '../../../src/world/rules/index.ts';
import type { OpHandlers, Edit } from '../../../src/world/rules/types.ts';
import { homeLand } from '../../../test/helpers/land.ts';
import { hashTune, serializeTune, TUNABLES } from '../../../src/sim/tune.ts';

for (const perf of [false, true]) {
  await test(`Becsy ${perf ? 'perf' : 'checked'}: real tune handlers agree at admission and each application`, async () => {
    const sync = createSync();
    const handlers = new Map<string, OpHandlers<Command>>();
    const register = sync.registerOp;
    sync.registerOp = (name, handler) => {
      // Only the two named tune handlers are invoked below, with their declared payload shape.
      if (name === 'tune.set' || name === 'tune.commit') handlers.set(name, handler as unknown as OpHandlers<Command>);
      register(name, handler);
    };
    const rules = installRules(sync, homeLand());
    const model = await createBecsySlice([], { perf });
    const sites = rules.sites.sites;
    let protoRoom = true,
      controller = true;
    const edit = (c: Command): Edit<Command> => ({ ...c, i: 0, j: 0, p: 'p', u: 'u' });
    const compare = () => {
      assert.deepEqual(model.read().tune, rules.tune.tune);
      assert.deepEqual(serializeTune(model.read().tune), serializeTune(rules.tune.tune));
      assert.equal(hashTune(model.read().tune), hashTune(rules.tune.tune));
    };
    async function admit(c: Command) {
      const old = handlers.get(c.op)!.validate!(edit(c), {
        from: 'u',
        tick: 0,
        env: { protoRoom, tuneController: () => controller },
      });
      assert.equal(await model.command(c, 'admit', { sites, protoRoom, controller }), old);
      compare();
      return old;
    }
    async function apply(c: Command) {
      const old = handlers.get(c.op)!.apply(edit(c), 0);
      assert.deepEqual(await model.command(c, 'apply', { sites, protoRoom, controller }), old);
      compare();
    }
    try {
      for (const t of TUNABLES) {
        for (const v of [t.min, t.max]) {
          const c: Command = { op: 'tune.set', key: t.key, v };
          if (await admit(c)) await apply(c);
        }
        for (const v of [t.min - 1, t.max + 1, t.def + 0.5, NaN])
          assert.equal(await admit({ op: 'tune.set', key: t.key, v }), false);
      }
      for (const key of ['nope', '__proto__']) assert.equal(await admit({ op: 'tune.set', key, v: 1 }), false);
      const set: Command = { op: 'tune.set', key: 'hard', v: 30 };
      controller = false;
      assert.equal(await admit(set), false);
      controller = true;
      protoRoom = false;
      assert.equal(await admit(set), false);
      protoRoom = true;
      const first: Command = {
        op: 'tune.commit',
        key: 'hard',
        v: 30,
        expectedRevision: rules.tune.tune.revision,
        requestId: 'first',
      };
      const second = { ...first, requestId: 'second', v: 40 };
      assert.equal(await admit(first), true);
      assert.equal(await admit(second), true);
      await apply(first);
      await apply(second); // accepted together; second rejected at apply, without spending revision
      assert.equal(await admit(second), false);
      for (const requestId of ['', 'x'.repeat(81)])
        assert.equal(await admit({ ...first, expectedRevision: rules.tune.tune.revision, requestId }), false);
      const cost: Command = { op: 'tune.set', key: 'cost0', v: 30 };
      assert.equal(await admit(cost), true);
      sites.list[sites.open]!.t0 = 2; // the site starts between validation and application
      await apply(cost);
      assert.equal(await admit(cost), false);
      sites.list[sites.open]!.t0 = -1;
      sites.list[sites.open]!.stock[1] = 10;
      assert.equal(await admit({ op: 'tune.set', key: 'helper0', v: 10 }), false);
      // Equal-value edits are still accepted revisions, like the original implementation.
      assert.equal(await admit(set), true);
      await apply(set);
      await apply(set);
    } finally {
      await model.stop();
    }
  });

  await test(`Becsy ${perf ? 'perf' : 'checked'}: full Job/Run and QJob/Run rows agree each tick and across reconstruction`, async () => {
    const old = jobSlice(inhouse, 30, true);
    let model = await createBecsySlice(projectJobs(old.w), { perf });
    try {
      for (let tick = 0; tick < 50; tick++) {
        old.input(tick);
        model.input(tick);
        old.tick();
        await model.tick();
        assert.deepEqual(model.read().jobs, projectJobs(old.w), `tick ${tick}`);
        if (tick === 20) {
          const checkpoint = JSON.parse(JSON.stringify(model.read())) as ReturnType<typeof model.read>;
          await model.stop();
          model = await createBecsySlice(checkpoint.jobs, { perf, tune: checkpoint.tune });
        }
      }
    } finally {
      await model.stop();
    }
  });
}
