// storyAct at the act boundary: Act 1 until Q5 (slot 4) is laid, Act 2 from then (docs/brainstorms/acts.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { homeLand } from './helpers/land.ts';
import { QJob } from '../src/sim/railway-components.ts';
import { qjob } from '../src/sim/railway-queries.ts';
import { storyAct } from '../src/sim/railway-queries-story.ts';

test('the act turns over when Q5 is laid, not before', () => {
  const sync = createSync();
  sync.setSelfId('server');
  const api = installRailway(sync, installRules(sync, homeLand()), createReplicator());
  api.touchAll();
  const w = api.world();
  assert.equal(storyAct(w), 1, 'a new room');
  for (let k = 0; k < 4; k++) w.mut(QJob, qjob(w, k))!.completion = 1;
  assert.equal(storyAct(w), 1, 'Q1 to Q4 laid');
  w.mut(QJob, qjob(w, 4))!.completion = 1;
  assert.equal(storyAct(w), 2, 'Q5 laid');
});
