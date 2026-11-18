// URL intent follows the replicated session's readiness, not the retired world snapshot channel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTuneStartup } from '../src/tunables/startup.ts';

test('shared URL intent waits for replica readiness and never replays on reconnect', () => {
  let ready = false;
  let submissions = 0;
  const startup = createTuneStartup(
    () => ready,
    () => submissions++,
  );
  startup.start(true);
  startup.snapshot();
  assert.equal(submissions, 0);
  ready = true;
  startup.snapshot();
  assert.equal(submissions, 1);
  ready = false;
  startup.snapshot();
  ready = true;
  startup.snapshot();
  startup.start(true);
  assert.equal(submissions, 1);
});
