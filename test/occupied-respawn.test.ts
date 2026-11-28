import '../dev/sim/hooks.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

const { me } = await import('../src/player/state.ts');
const { fallRespawn } = await import('../src/entities/player/state.ts');
const { makePlayerBody } = await import('../src/physics/physics.ts');
const { physicsReady, teleport, addBody, removeBody } = await import('../src/physics/engine.ts');
const { PLAYER_R } = await import('../src/constants.ts');

test('a second fall respawn leaves clearance for a player already at spawn', async () => {
  await physicsReady;
  const previous = me.body;
  const peer = makePlayerBody(true);
  try {
    const first = makePlayerBody(false);
    me.body = first;
    teleport(first, 40, -30, 20);
    fallRespawn();

    teleport(peer, first.position.x, first.position.y, first.position.z);
    addBody(peer);
    const second = makePlayerBody(false);
    me.body = second;
    teleport(second, 55, -30, 10);
    fallRespawn();
    assert.ok(
      Math.hypot(second.position.x - peer.position.x, second.position.z - peer.position.z) >= 2 * PLAYER_R,
      'both accepted fall respawns selected the same position',
    );
  } finally {
    removeBody(peer);
    me.body = previous;
  }
});
