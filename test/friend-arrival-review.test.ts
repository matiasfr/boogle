import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { sourceModule } from '../dev/level/source.ts';
import { friendArrivalStep, friendDestination } from '../src/place/friend-arrival.ts';
import { searchLandings } from '../src/place/return-spot.ts';

// Exercise the production update method without constructing the renderer or a DOM.
const source = readFileSync('src/entities/railway/arrival.ts', 'utf8');
const method = source.slice(source.indexOf('    update(dt:'), source.lastIndexOf('  };')).trim();

function arrival() {
  const halt = { x: 500, y: 15, z: 0, halt: 'test:0', line: 0, stop: 0, checked: true };
  let visitors = [halt];
  let now = 0;
  let pending = true;
  let location = 'initial';
  const bindings = {
    me: { body: {}, yaw: 0 },
    cam: {},
    scenery: { ready: () => true, rebuilt() {} },
    fallArrival: { active: false },
    performance: { now: () => now },
    readSavedPose: () => null,
    enteredPoses: () => visitors,
    friendArrivalStep,
    friendDestination,
    searchLandings,
    returnSettle: {
      pending: () => pending,
      claimPlacement: () => pending,
      done: () => {
        pending = false;
      },
    },
    halts: {
      running: () => true,
      stands: () => true,
      friends: () => ({ standing: [halt], works: halt }),
      passengerDecks: () => [],
    },
    HALL: { x: 0, z: 0 },
    toWorld: Number,
    coverLifted: () => false,
    passengerSpot: () => null,
    taken: () => false,
    capsuleOverlaps: () => false,
    SEA: 0,
    PLAYER_R: 0.45,
    HEAD_OFFSET: 1,
    areasSettled: () => true,
    posePolicy: { standableAt: () => true },
    placeReturn: (_p: unknown, lift: number) => {
      location = lift === 12 ? 'search' : 'halt';
    },
    atSpawn: () => {
      location = 'home';
    },
    insidePlace: () => false,
  };
  const { update } = sourceModule<{ update(dt: number, ready: boolean, tick: number): void }>(
    `let placed = me.body, restorePending = true, loaded = false, fell = false, savedPose = null,
      presenceSince = null, ordinaryVisit = false, steam = null, touchdown = null, returning = null,
      friend = null, heldCandidate = null, landing, landingDeadline = null, hadRecord = false, poseClock = 0;
      export const update = ({${method}}).update;`,
    bindings,
  );
  return {
    frame(ms: number) {
      now = ms;
      update(0.016, true, 1);
    },
    leave() {
      visitors = [];
    },
    pending: () => pending,
    location: () => location,
  };
}

test('a friend disconnecting during scenery warm-up leaves the returning player at Home', () => {
  const a = arrival();
  a.frame(0);
  assert.equal(a.location(), 'search');
  a.leave();
  a.frame(100);
  assert.equal(a.location(), 'home');
});

test('the solo presence timeout keeps the pose private until the ordinary landing is known', () => {
  const a = arrival();
  a.leave();
  a.frame(0);
  a.frame(1500);
  assert.equal(a.location(), 'initial');
  assert.equal(a.pending(), true);
});
