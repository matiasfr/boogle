import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { sourceModule } from '../level/source.ts';
import { createOwnerSync } from '../../src/netplay/owner-sync.ts';
import { net } from '../../src/netplay/net.ts';

type DiscModule = typeof import('../../src/entities/frisbee/state.ts');
const source = readFileSync(new URL('../../src/entities/frisbee/state.ts', import.meta.url), 'utf8');

function walkingPlayer() {
  let publish!: () => unknown;
  let hear!: (r: { peer: string }, pr: { frisbee: unknown }, time: number) => void;
  const state = sourceModule<DiscModule>(source, {
    Vector3,
    REACH: 2,
    STEP: 1 / 60,
    createOwnerSync,
    toyGround: { inside: (x: number) => Math.abs(x) < 10, under: () => 0 },
    stepFlight: (p: Vector3, v: Vector3, _glide: boolean, dt: number) => p.addScaledVector(v, dt),
    handPosition: () => new Vector3(),
    me: {},
    sendPresence() {},
    addPresenceField(_key: string, fn: typeof publish) {
      publish = fn;
    },
    onRemotePresence(fn: typeof hear) {
      hear = fn;
    },
  });
  return {
    ...state,
    publish,
    receive: (peer: string, value: unknown) => hear({ peer }, { frisbee: value }, performance.now()),
  };
}

export function discHandoff() {
  const a = walkingPlayer(),
    b = walkingPlayer();
  const savedPeer = net.myPeer;
  try {
    for (const player of [a, b]) {
      assert.equal(player.grabDisc(), false);
      player.enableDisc(new Vector3());
      assert.ok(player.grabDisc());
    }
    a.receive('b', b.publish());
    b.receive('a', a.publish());
    net.myPeer = 'a';
    a.updateDisc(performance.now(), 0);
    net.myPeer = 'b';
    b.updateDisc(performance.now(), 0);
    assert.equal(a.disc.mine, false);
    assert.equal(a.disc.held, true);
    assert.equal(a.publish(), null);
    assert.equal(b.disc.mine, true);
    assert.equal(b.disc.held, true);
    b.releaseDisc(new Vector3(11, 2, 0), new Vector3(2, 0, 0));
    b.updateDisc(performance.now(), 1 / 60);
    assert.equal(b.disc.held, false);
    assert.deepEqual(b.disc.p.toArray(), b.disc.rack.toArray());
    assert.equal(b.disc.v.lengthSq(), 0);
  } finally {
    net.myPeer = savedPeer;
  }

  // Malformed higher claims cannot enter the snapshot buffer or take the disc.
  const player = walkingPlayer();
  player.enableDisc(new Vector3());
  assert.ok(player.grabDisc());
  const claim = { e: 20, h: 1, p: [0, 0, 0], q: [0, 0, 0, 1], v: [0, 0, 0] };
  for (const bad of [{ h: 2 }, { e: 2 ** 48 }, { p: [null, 0, 0] }, { v: [300, 0, 0] }, { q: [0, 0] }]) {
    player.receive('other', { ...claim, ...bad });
    player.updateDisc(performance.now(), 0);
    assert.equal(player.disc.mine, true);
    assert.equal(player.disc.e, 1);
  }
}
