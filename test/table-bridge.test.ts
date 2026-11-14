// The turntable's bridge as shared geometry (review of rotunda step 1b): the handle's one pose for the view that draws
// it and the cue that points at it, and the rule that keeps the deck's collider from returning through a player.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PLAYER_R } from '../src/constants.ts';
import { TABLE } from '../src/place/home-station.ts';
import { BRIDGE, bridgeHandle, clearOfBridge, tableYaws } from '../src/entities/railway/table-bridge.ts';

const table = { x: TABLE.x, z: TABLE.z },
  top = 18.4;

test('the handle stands on the bridge, at its far end, for both of the table’s stops', () => {
  for (const yaw of tableYaws()) {
    const h = bridgeHandle(table, TABLE.r, yaw),
      dx = h.x - table.x,
      dz = h.z - table.z;
    const along = dx * Math.sin(yaw) + dz * Math.cos(yaw),
      across = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    assert.ok(Math.abs(across) < BRIDGE.w / 2, `the handle is ${across.toFixed(2)} m across a ${BRIDGE.w} m deck`);
    assert.ok(along > TABLE.r - 1.5 && along < TABLE.r, `the handle is ${along.toFixed(2)} m along`);
  }
});

test('the turn cue and the turn prompt read the drawn handle’s pose, not the old rim', () => {
  for (const file of ['src/entities/railway/works-view.ts', 'src/entities/railway/roundhouse-view.ts']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /bridgeHandle\(/, `${file} places the handle with bridgeHandle`);
    assert.doesNotMatch(source, /Math\.PI \/ 2\) \* \((home\.TABLE\.r|R) - 0\.4\)/, `${file} still uses the rim`);
  }
});

test('the deck’s collider waits for a player standing in its volume', () => {
  const yaw = tableYaws()[0];
  const onDisc = { x: table.x, y: 18.06 + PLAYER_R, z: table.z };
  assert.equal(clearOfBridge(table, TABLE.r, yaw, top, onDisc), false, 'a rider dropped onto the disc is in the way');
  assert.equal(clearOfBridge(table, TABLE.r, yaw, top, { ...onDisc, y: top + PLAYER_R }), true, 'standing on the deck');
  assert.equal(clearOfBridge(table, TABLE.r, yaw, top, null), true, 'no player in the world');
  // Beside the deck: clear only once the player's own radius is off it.
  const beside = (across: number) => ({
    x: table.x + Math.cos(yaw) * across,
    y: onDisc.y,
    z: table.z - Math.sin(yaw) * across,
  });
  assert.equal(clearOfBridge(table, TABLE.r, yaw, top, beside(BRIDGE.w / 2 + PLAYER_R - 0.05)), false);
  assert.equal(clearOfBridge(table, TABLE.r, yaw, top, beside(BRIDGE.w / 2 + PLAYER_R + 0.05)), true);
  // Past the deck's end, on the disc's rim side.
  const ahead = { x: table.x + Math.sin(yaw) * (TABLE.r + 1), y: onDisc.y, z: table.z + Math.cos(yaw) * (TABLE.r + 1) };
  assert.equal(clearOfBridge(table, TABLE.r, yaw, top, ahead), true);
});
