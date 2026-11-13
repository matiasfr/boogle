// Owner-requested CI race regression: no network or real timers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SERVER_WAIT_MS, waitForServerBuild } from '../dev/deploy-wait.ts';

function fakeEndpoint(reply: (elapsed: number, timeout: number) => string) {
  let elapsed = 0;
  const polls: number[] = [];
  const sleeps: number[] = [];
  return {
    polls,
    sleeps,
    now: () => elapsed,
    advance: (ms: number) => {
      elapsed += ms;
    },
    sleep: (ms: number) => {
      sleeps.push(ms);
      elapsed += ms;
      return Promise.resolve();
    },
    readBuild: (timeout: number) => {
      polls.push(elapsed);
      // Promise owns synchronous fake endpoint failures too, just like fetch/json.
      return Promise.resolve().then(() => reply(elapsed, timeout));
    },
  };
}

test('Pages-only deploy accepts its older serverBuild immediately, without expecting HEAD', async () => {
  const endpoint = fakeEndpoint(() => 'older-server-source');
  assert.equal(await waitForServerBuild('older-server-source', endpoint), 'older-server-source');
  assert.deepEqual(endpoint.polls, [0]);
  assert.deepEqual(endpoint.sleeps, []);
});

test('server deploy finishing after six minutes passes with 15-second polling', async () => {
  const endpoint = fakeEndpoint((elapsed) => (elapsed < 6 * 60 * 1000 ? 'previous' : 'expected'));
  assert.equal(await waitForServerBuild('expected', endpoint), 'expected');
  assert.equal(endpoint.now(), 360000);
  assert.equal(endpoint.polls.length, 25);
  assert.ok(endpoint.sleeps.every((ms) => ms === 15000));
});

test('a restart, missing build and transient endpoint error can recover', async () => {
  const endpoint = fakeEndpoint((elapsed) => {
    if (elapsed === 0) throw new Error('HTTP 503');
    return elapsed === 15000 ? '' : 'expected';
  });
  assert.equal(await waitForServerBuild('expected', endpoint), 'expected');
  assert.equal(endpoint.now(), 30000);
});

test('failed or superseded deploy remaining on the wrong commit fails after twelve minutes', async () => {
  for (const wrong of ['previous', 'newer', '']) {
    const endpoint = fakeEndpoint(() => wrong);
    await assert.rejects(waitForServerBuild('expected', endpoint), (error: Error) => {
      assert.match(error.message, /did not converge within 720s.*expected source commit expected/);
      assert.ok(error.message.includes(`wrong commit ${wrong || '<empty>'}`));
      assert.match(error.message, /deploy-server.yml.*failed, cancelled or superseded/);
      return true;
    });
    assert.equal(endpoint.now(), SERVER_WAIT_MS);
    assert.equal(endpoint.polls.length, 48);
  }
});

test('unavailable endpoint fails with the probe error and last observed commit', async () => {
  const endpoint = fakeEndpoint((elapsed) => {
    if (elapsed === 0) return 'previous';
    throw new Error('HTTP 503');
  });
  await assert.rejects(
    waitForServerBuild('expected', endpoint),
    /last reported commit previous;.*endpoint unavailable: Error: HTTP 503/,
  );
  assert.equal(endpoint.now(), SERVER_WAIT_MS);
});

test('request time counts against the deadline and the final request budget is bounded', async () => {
  const budgets: number[] = [];
  const endpoint = fakeEndpoint((_elapsed, timeout) => {
    budgets.push(timeout);
    endpoint.advance(budgets.length === 1 ? 1234 : timeout);
    return 'previous';
  });
  await assert.rejects(waitForServerBuild('expected', endpoint), /did not converge/);
  assert.equal(endpoint.now(), SERVER_WAIT_MS);
  assert.equal(budgets[0], 5000);
  assert.equal(budgets.at(-1), 3766);
  assert.ok(endpoint.sleeps.every((ms) => ms > 0 && ms <= 15000));
});

test('a response arriving after the deadline cannot turn a timeout green', async () => {
  const endpoint = fakeEndpoint(() => {
    endpoint.advance(SERVER_WAIT_MS + 1);
    return 'expected';
  });
  await assert.rejects(waitForServerBuild('expected', endpoint), /did not converge/);
  assert.deepEqual(endpoint.sleeps, []);
});
