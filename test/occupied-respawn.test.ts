import '../dev/sim/hooks.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

const { me } = await import('../src/player/state.ts');
const { fallRespawn } = await import('../src/entities/player/state.ts');
const { makePlayerBody } = await import('../src/physics/physics.ts');
const { physicsReady, teleport, addBody, removeBody } = await import('../src/physics/engine.ts');
const { PLAYER_R, SPAWN } = await import('../src/constants.ts');

test('a second fall respawn leaves clearance for a player already at spawn', async () => {
  await physicsReady;
  const previous = me.body;
  const peer = makePlayerBody(true);
  try {
    const first = makePlayerBody(false);
    me.body = first;
    teleport(first, 40, -30, 20);
    fallRespawn();

    assert.deepEqual([first.position.x, first.position.z], [SPAWN.x, SPAWN.z]);
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

test('a full spawn ring falls back to the original spawn', async () => {
  await physicsReady;
  const previous = me.body;
  const peers: ReturnType<typeof makePlayerBody>[] = [];
  try {
    const player = makePlayerBody(false);
    me.body = player;
    for (let k = 0; k < 7; k++) {
      teleport(player, 55, -30, 10);
      fallRespawn();
      const peer = makePlayerBody(true);
      const { x, y, z } = player.position;
      assert.ok(peers.every((other) => Math.hypot(x - other.position.x, z - other.position.z) >= 2 * PLAYER_R));
      teleport(peer, x, y, z);
      addBody(peer);
      peers.push(peer);
    }
    teleport(player, 55, -30, 10);
    fallRespawn();
    assert.deepEqual([player.position.x, player.position.z], [SPAWN.x, SPAWN.z]);
  } finally {
    for (const peer of peers) removeBody(peer);
    me.body = previous;
  }
});
