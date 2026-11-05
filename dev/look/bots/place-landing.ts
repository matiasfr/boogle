// Live-room failure evidence. Recovery probes happen only after the route has failed and never make it pass.
import { entityKinds } from '../../../src/entity/entity.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import {
  forEachContact,
  forEachStatic,
  getMask,
  rayHit,
  raycastClosest,
  teleport,
  type Body,
} from '../../../src/physics/engine.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import { GROUP } from '../../../src/physics/physics.ts';
import { input } from '../../../src/player/input.ts';
import { cam, me } from '../../../src/player/player.ts';
import { H } from '../../../src/proto/place/land.ts';
import { giftState } from '../../../src/proto/place/gifts.ts';
import { lines, forgeFrame } from '../../../src/proto/place/lines.ts';
import { stationColliders, FRAME_D } from '../../../src/proto/place/spatial-station.ts';
import type { Bot } from '../bot.ts';

type Point = { x: number; y: number; z: number };
const point = (p: Point) => ({ x: p.x, y: p.y, z: p.z });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function landingEvidence() {
  const body = me.body!;
  const statics = new Map<Body, { name: string; position: Point; shapes: unknown[] }>();
  const stations = [...lines.flatMap((l) => l.stations), forgeFrame];
  const authored = stations.flatMap((st) => {
    const at = { ...st, lx: (st.x - st.feederStart.x) / (FRAME_D / 2), lz: (st.z - st.feederStart.z) / (FRAME_D / 2) };
    const solids = stationColliders(at, st.y, !!st.spec.rails);
    return [...solids.frame, solids.feeder, ...(solids.rails ? [solids.rails] : [])].map((s) => ({
      ...s,
      name: `${st.spec.id}/${s.id}`,
    }));
  });
  forEachStatic(-1, (b, shapes) => {
    const solid = authored.find((s) => distance(s.position, b.position) < 0.01);
    const stock = stations.find((s) => Math.hypot(s.x - b.position.x, s.z - b.position.z) < 0.01);
    statics.set(b, {
      name: solid?.name ?? (stock ? `${stock.spec.id}/stock-or-base` : `static/${shapes.map((s) => s.kind).join('+')}`),
      position: point(b.position),
      shapes: shapes.map((s) => (s.kind === 'box' ? { kind: s.kind, hx: s.hx, hy: s.hy, hz: s.hz } : { kind: s.kind })),
    });
  });
  const describe = (b: Body) => {
    for (const { kind, entities } of entityKinds())
      for (const e of entities)
        if (e.alive && e.bodies?.includes(b)) return { name: `${kind}/${e.id}`, position: point(b.position) };
    return statics.get(b) ?? { name: `unregistered/mask-${getMask(b)}`, position: point(b.position) };
  };
  const contacts: unknown[] = [];
  forEachContact(body, (nx, ny, nz, other) => {
    contacts.push({ ...describe(other), normal: { x: nx, y: ny, z: nz } });
  });
  const players: unknown[] = [];
  for (const { kind, entities } of entityKinds())
    if (kind.includes('player'))
      for (const e of entities)
        for (const b of e.bodies ?? [])
          if (e.alive) players.push({ ...describe(b), distance: distance(b.position, body.position) });
  const down = rayHit();
  const support = raycastClosest(
    body.position,
    { ...point(body.position), y: body.position.y - 3 },
    { mask: getMask(body) & ~GROUP.DEFAULT },
    down,
  )
    ? { point: point(down.hitPointWorld), normal: point(down.hitNormalWorld), footGap: down.distance - PLAYER_R }
    : null;
  return {
    position: point(body.position),
    velocity: point(body.velocity),
    coyote: me.coyote,
    swimming: me.swimming,
    terrainY: H(body.position.x, body.position.z),
    contacts,
    players,
    support,
    // Reward crates have no physics bodies; distinguish their live locations from solid station stock.
    rewardCrates: giftState.crates().filter((c) => distance(c, body.position) < 5),
    nearbyStatics: [...statics.values()].filter((s) => distance(s.position, body.position) < 5),
    stations: stations
      .filter((s) => Math.hypot(s.x - body.position.x, s.z - body.position.z) < 10)
      .map((s) => ({ id: s.spec.id, x: s.x, y: s.y, z: s.z, have: { ...s.have }, shown: { ...s.shown } })),
  };
}

export async function diagnoseLanding(bot: Bot) {
  const failed = landingEvidence();
  console.log(`LANDING FAILED ${JSON.stringify(failed)}`);
  // First try a stationary jump, then ordinary walking in four directions. No teleport or route recovery.
  const start = point(me.body!.position);
  let peak = start.y;
  pressJump();
  for (let k = 0; k < 10; k++) {
    await bot.wait(60);
    peak = Math.max(peak, me.body!.position.y);
  }
  releaseJump();
  await bot.wait(600);
  const jump = { rise: peak - start.y, after: landingEvidence() };
  const walks = [];
  const yaw = cam.yaw;
  try {
    for (let k = 0; k < 4; k++) {
      const before = point(me.body!.position);
      cam.yaw = yaw + (k * Math.PI) / 2;
      input.keys.add('KeyW');
      await bot.wait(700);
      input.keys.delete('KeyW');
      await bot.wait(300);
      walks.push({ yaw: cam.yaw, metres: distance(before, me.body!.position), after: landingEvidence() });
      if (me.coyote > 0 && distance(start, me.body!.position) > 1) break;
    }
  } finally {
    input.keys.delete('KeyW');
    cam.yaw = yaw;
  }
  // Return only this failed player's pose for a separate recovery probe; the completed room stays live.
  // If settling no longer reproduces the wedge, this is only a nearby recovery test.
  teleport(me.body!, start.x, start.y, start.z);
  me.body!.velocity.set(0, 0, 0);
  await bot.wait(600);
  const reset = landingEvidence();
  // Exercise the same recovery function as the menu. This cannot turn the failed route into a pass.
  const beforeUnstuck = point(me.body!.position);
  const { getUnstuck } = await import('../../../src/proto/place/index.ts');
  getUnstuck();
  await bot.wait(1200);
  const unstuck = { metres: distance(beforeUnstuck, me.body!.position), after: landingEvidence() };
  const result = { failed, jump, walks, reset, unstuck };
  console.log(`LANDING PROBES ${JSON.stringify(result)}`);
  return result;
}
