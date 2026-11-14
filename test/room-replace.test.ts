// Replace room with stage, client side (docs/plans/room-fast-forward.md): the Dev → Room request and the server's
// refusals in plain words, the countdown's state, the reset note that carries the stage, and the host status reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOSSES,
  REPLACE_STAGES,
  refusal,
  replaceArgs,
  replaceRequest,
  replacedReply,
} from '../src/debug/dev/room-replace.ts';
import { HOLD_MS, countdownAt, countdownText, startCountdown } from '../src/netplay/replace-countdown.ts';
import { readRoomReset, roomResetNote } from '../src/player/world-reset.ts';
import { hostMeta } from '../src/netplay/room-seed.ts';
import { replacedText, replacingText } from '../src/net/ws-wire.ts';
import { OFFERED_STAGES } from '../src/world/railway-jump.ts';
import { railwayRoomId } from '../src/world/railway-namespace.ts';
import { startedAs } from '../dev/playtest/summary.ts';

const KEY = 'k'.repeat(40); // a stand-in, not a credential

test('the stages offered are the seed stages, never the empty start', () => {
  assert.deepEqual(
    REPLACE_STAGES.map((j) => j.stage),
    [...OFFERED_STAGES],
  );
  assert.ok(!REPLACE_STAGES.some((j) => j.stage === 'start'));
  assert.equal(LOSSES.length, 4);
});

test('arguments: a listed stage and a typed name, or a plain reason', () => {
  assert.deepEqual(replaceArgs({ stage: 'awake', confirm: 'den' }), {
    stage: 'awake',
    confirm: 'den',
    override: false,
  });
  assert.deepEqual(replaceArgs({ stage: 'awake', confirm: 'den', override: true }).valueOf(), {
    stage: 'awake',
    confirm: 'den',
    override: true,
  });
  assert.equal(typeof replaceArgs({ stage: 'start', confirm: 'den' }), 'string');
  assert.equal(typeof replaceArgs({ stage: 'nope', confirm: 'den' }), 'string');
  assert.equal(typeof replaceArgs({ stage: 'awake' }), 'string');
  assert.equal(typeof replaceArgs({ stage: 'awake', confirm: '' }), 'string');
  assert.equal(typeof replaceArgs({ stage: 'awake', confirm: 'den', override: 'yes' }), 'string');
});

test('the request: this room, the key in the header only, the typed name in the body', () => {
  const { url, init } = replaceRequest('http://127.0.0.1:9000', 'den', KEY, {
    stage: 'awake',
    confirm: 'typed',
    override: false,
  });
  assert.equal(url, `http://127.0.0.1:9000/admin/rooms/${railwayRoomId('den')}/replace`);
  assert.equal(init.method, 'POST');
  assert.deepEqual(init.headers, { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' });
  assert.deepEqual(JSON.parse(init.body), { stage: 'awake', confirm: 'typed' });
  assert.ok(!url.includes(KEY) && !init.body.includes(KEY));
  const over = replaceRequest('http://127.0.0.1:9000', 'den', KEY, { stage: 'awake', confirm: 'den', override: true });
  assert.deepEqual(JSON.parse(over.init.body), { stage: 'awake', confirm: 'den', override: true });
});

test("refusals read plainly, one per reason the server's contract names", () => {
  const said = [
    refusal(401, { error: 'unauthorized' }),
    refusal(404, { error: 'not found' }),
    refusal(403, { error: 'shared island replacement is off' }),
    refusal(409, { error: 'confirm the room name' }),
    refusal(409, { error: 'busy' }),
    refusal(409, { error: 'players in the room', players: 2 }),
    refusal(409, { error: 'earlier stage; restore the pinned backup instead' }),
    refusal(400, { error: 'unknown stage' }),
    refusal(400, { error: 'not a current railway room' }),
    refusal(429, { error: 'replacement capacity reached' }),
    refusal(422, { error: 'invalid stage checkpoint' }),
    refusal(503, { error: 'stage not built' }),
    refusal(500, null),
  ];
  assert.equal(new Set(said).size, said.length);
  assert.match(said[0]!, /Wrong key/);
  assert.match(said[2]!, /shared island/);
  assert.match(said[3]!, /Wrong room name/);
  assert.match(said[4]!, /already being replaced/);
  assert.match(said[5]!, /^2 players are here/);
  assert.match(said[7]!, /does not know that stage/);
  assert.match(said[9]!, /Too many attempts/);
  for (const line of said) assert.ok(!line.includes('The server refused'), line);
  // An answer the contract does not name still says something, and a hostile body cannot break it.
  assert.equal(refusal(418, { error: 'teapot' }), 'The server refused (418: teapot).');
  assert.equal(refusal(400, 'nonsense'), 'The server refused (400).');
  assert.equal(refusal(409, { error: 7 }), 'The server refused (409).');
});

test('a success names the pinned backup and the restore command', () => {
  assert.deepEqual(
    replacedReply({ ok: true, stage: 'awake', backup: 'b.json', restore: 'npm run server -- restore' }),
    {
      stage: 'awake',
      backup: 'b.json',
      restore: 'npm run server -- restore',
    },
  );
  assert.equal(replacedReply({ ok: false }), null);
  assert.equal(replacedReply(null), null);
});

test('the countdown reads whole seconds down to zero, holds, then gives up', () => {
  const c = startCountdown({ label: 'Just woke', seconds: 10 }, 1000);
  assert.deepEqual(countdownAt(c, 1000), { label: 'Just woke', seconds: 10 });
  assert.equal(countdownAt(c, 1001)?.seconds, 10);
  assert.equal(countdownAt(c, 2000)?.seconds, 9);
  assert.equal(countdownAt(c, 10_999)?.seconds, 1);
  assert.equal(countdownAt(c, 11_000)?.seconds, 0);
  assert.equal(countdownAt(c, 11_000 + HOLD_MS)?.seconds, 0); // the room is closing; the reload follows
  assert.equal(countdownAt(c, 11_001 + HOLD_MS), null); // nothing was replaced: the notice goes
  // A player who joins mid-countdown is told the seconds left.
  assert.equal(countdownAt(startCountdown({ label: 'Just woke', seconds: 4 }, 0), 500)?.seconds, 4);
  assert.equal(
    replacingText(countdownAt(c, 1000)!),
    'This room will be replaced with Just woke in 10 seconds. What you carry and your finds here will be lost.',
  );
});

test('the countdown sentence: the unit agrees, and zero reads "now"', () => {
  const tail = ' What you carry and your finds here will be lost.';
  const say = (seconds: number, label = 'Just woke') => countdownText({ label, seconds });
  assert.equal(say(10), replacingText({ label: 'Just woke', seconds: 10 })); // the plan's sentence, untouched
  assert.equal(say(2), `This room will be replaced with Just woke in 2 seconds.${tail}`);
  assert.equal(say(1), `This room will be replaced with Just woke in 1 second.${tail}`);
  assert.equal(say(0), `This room will be replaced with Just woke now.${tail}`);
  // A label that holds the same words is left alone; only the sentence's own unit changes.
  assert.equal(
    say(1, 'Back in 1 seconds. Ha'),
    `This room will be replaced with Back in 1 seconds. Ha in 1 second.${tail}`,
  );
});

test('the line after a replacement is the plan’s, for the shared island and for a private room', () => {
  assert.equal(
    replacedText('Just woke', true),
    'The shared island was replaced with Just woke for testing. The world changed for everyone, and what you carried and found here is gone.',
  );
  assert.match(replacedText('Just woke', false), /^This room was replaced with Just woke for testing\./);
});

test('the reset note carries the stage of a replacement, and an ordinary reset carries none', () => {
  assert.equal(roomResetNote('rail-v1-den', 'den'), 'rail-v1-den den');
  assert.deepEqual(readRoomReset('rail-v1-den den'), { id: 'rail-v1-den', name: 'den', stage: '' });
  assert.deepEqual(readRoomReset(roomResetNote('rail-v1-den', 'den', 'q1-done')), {
    id: 'rail-v1-den',
    name: 'den',
    stage: 'q1-done',
  });
  assert.equal(readRoomReset('rail-v1-den den <b>x</b>')?.stage, '');
  assert.equal(readRoomReset(null), null);
  assert.equal(readRoomReset('only'), null);
});

test('host status: the replacement record is read with its born, and junk reads as none', () => {
  assert.deepEqual(hostMeta({ players: 1, replaced: { stage: 'awake', at: 't', born: 'b2' } }), {
    seed: null,
    replaced: { stage: 'awake', born: 'b2' },
  });
  assert.deepEqual(hostMeta({ seed: { stage: 'awake', at: 't' } }).seed, { stage: 'awake', at: 't' });
  for (const junk of [null, 'x', { replaced: 'awake' }, { replaced: { stage: 1, born: 'b' } }, { replaced: null }])
    assert.equal(hostMeta(junk).replaced, null);
});

test('a playtest summary says the room was replaced with a stage', () => {
  assert.match(startedAs({ replaced: 'awake' }), /^a room replaced with "Just woke" \(awake\)/);
  assert.match(startedAs({ seed: 'awake', replaced: 'awake' }), /^jump-in/);
  assert.equal(startedAs({}), '');
});
