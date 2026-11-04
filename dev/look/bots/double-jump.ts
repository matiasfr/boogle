// Real-input traversal shared by the place bot and its focused look capture. No pose/velocity writes in a crossing.
import { cam, me } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import { ORIGIN } from '../../../src/proto/place/layout.ts';
import { JUMP_COURSE, type Pad } from '../../../src/proto/place/tech-layout.ts';
import type { Bot } from '../bot.ts';

export const onJumpPad = (p: Pad) => {
  const b = me.body!;
  return (
    Math.abs(b.position.x - ORIGIN.x - p.x) < p.hx &&
    Math.abs(b.position.z - p.z) < p.hz &&
    Math.abs(b.position.y - PLAYER_R - p.top) < 0.15 &&
    me.coyote > 0
  );
};

/** Test the same takeoff with a held single, sprint single or sprint double jump. */
export async function crossJumpGap(
  bot: Bot,
  from: Pad,
  to: Pad,
  mode: 'single' | 'sprint' | 'double',
  edgeOffset = -0.2,
) {
  const b = me.body!;
  const dx = to.x - from.x,
    dz = to.z - from.z,
    d = Math.hypot(dx, dz),
    ux = dx / d,
    uz = dz / d;
  // Every leg in this course is axis-aligned.
  const extent = Math.abs(ux) > 0.5 ? from.hx : from.hz;
  await bot.straight(from.x + ORIGIN.x, from.z, 0.3, 2500);
  await bot.wait(180);
  if (!onJumpPad(from)) {
    bot.never(`standing on ${from.id} before crossing`);
    return false;
  }
  cam.yaw = me.yaw = Math.atan2(-ux, -uz);
  input.keys.add('KeyW');
  if (mode !== 'single') input.keys.add('ShiftLeft');
  await bot.until(
    () => (b.position.x - ORIGIN.x - from.x) * ux + (b.position.z - from.z) * uz >= extent + edgeOffset,
    1500,
    `takeoff edge of ${from.id}`,
  );
  const start = performance.now();
  const launch = { x: b.position.x, z: b.position.z };
  pressJump();
  await bot.wait(550);
  if (mode === 'double') {
    releaseJump();
    await bot.wait(25);
    pressJump();
  }
  // Keep the first press held for the full arc in the negative controls (the longest single jump).
  while (performance.now() - start < 2400) {
    const remaining = (to.x + ORIGIN.x - b.position.x) * ux + (to.z - b.position.z) * uz;
    if (remaining < 1.1) input.keys.delete('KeyW');
    if (onJumpPad(to) || b.position.y - PLAYER_R < to.top - 0.8) break;
    await bot.wait(16);
  }
  input.keys.delete('KeyW');
  input.keys.delete('ShiftLeft');
  releaseJump();
  await bot.wait(250);
  const landed = onJumpPad(to);
  bot.note(
    `${mode} (edge ${edgeOffset.toFixed(2)}) ${from.id} -> ${to.id}: ${landed ? 'LANDED' : 'MISSED'}, ` +
      `${((performance.now() - start) / 1000).toFixed(2)} s, ` +
      `${Math.hypot(b.position.x - launch.x, b.position.z - launch.z).toFixed(2)} m from takeoff`,
  );
  return landed;
}

export async function runDoubleJumpCourse(bot: Bot) {
  const start = bot.now();
  bot.note('double-jump course start');
  for (let i = 1; i < JUMP_COURSE.length; i++) {
    const to = JUMP_COURSE[i]!;
    const landed = await crossJumpGap(bot, JUMP_COURSE[i - 1]!, to, 'double');
    bot.check(`double-jump course landing ${i}: ${to.id}`, landed);
    if (!landed) return false;
  }
  bot.note(`double-jump course complete in ${(bot.now() - start).toFixed(1)} s`);
  return true;
}
