// Focused setup for the existing look/playthrough harness. Only staging teleports; every measured gap uses real input.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { JUMP_COURSE, JUMP_RECOVERY } = (await import(
  '/src/proto/place/tech-layout.ts' as string
)) as typeof import('../../../src/proto/place/tech-layout.ts');
const { ORIGIN } = (await import(
  '/src/proto/place/layout.ts' as string
)) as typeof import('../../../src/proto/place/layout.ts');
const { press, gettingItem } = (await import(
  '/src/proto/place/got.ts' as string
)) as typeof import('../../../src/proto/place/got.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { runDoubleJumpCourse, crossJumpGap, onJumpPad } = (await import(
  '/dev/look/bots/double-jump.ts' as string
)) as typeof import('../bots/double-jump.ts');
// The prototype's documented staging API; no production authority changes.
const place = window.__place as {
  skipPath: () => void;
  tech: typeof import('../../../src/proto/place/tech.ts').techApi;
  day: { hold: boolean; u: number };
};
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
place.skipPath();
await wait(1500);
place.tech.take('jump');
await wait(1200);
// Main's anticipation/reveal is deliberately longer now. Finish the show before staging measured inputs.
for (let attempt = 0; gettingItem() && attempt < 100; attempt++) {
  press();
  await wait(100);
}
if (gettingItem()) throw new Error('The jump reward did not dismiss before staging');
await wait(2000); // the scheduled automatic demonstration finishes before the setup teleport
const body = me.body!;
const start = JUMP_COURSE[0]!;
const stage = async () => {
  teleport(body, start.x + ORIGIN.x, start.top + 0.46, start.z);
  body.velocity.set(0, 0, 0);
  await wait(400);
};
await stage();
place.day.hold = true;
place.day.u = 0.36;
const bot = makeBot();
// Console/report retains every assertion; keep the course unobscured in the image.
for (const el of document.querySelectorAll<HTMLElement>('div[style*="9999"]')) el.style.display = 'none';
const mode = new URLSearchParams(location.search).get('jumpcheck') ?? 'course';
const focus = new URLSearchParams(location.search).get('framing') ?? 'overview';
setTimeout(() => {
  if (focus === 'overview') {
    window.__debugCam!.set(
      [start.x + ORIGIN.x + 25, start.top + 66, start.z + 76],
      [start.x + ORIGIN.x - 32, start.top - 1, start.z + 15],
      48,
    );
  } else {
    window.__debugCam!.set(
      [start.x + ORIGIN.x - 8, start.top + 8, start.z + 17],
      [start.x + ORIGIN.x - 9, start.top + 0.5, start.z],
      48,
    );
  }
}, 600);
const run = async () => {
  const dismiss = setInterval(() => {
    if (gettingItem()) press();
  }, 1000);
  try {
    if (mode === 'course') {
      await runDoubleJumpCourse(bot);
      await bot.until(() => place.tech.found.has('block'), 3000, 'lamp-cap reward at course end');
    } else if (mode === 'recovery') {
      // Deliberately miss the first gap, then walk the lower ribbon and its ramp without a reset.
      await crossJumpGap(bot, start, JUMP_COURSE[1]!, 'single');
      await wait(900);
      bot.check(
        'dry catch floor after a miss',
        !me.swimming && Math.abs(body.position.y - 0.45 - JUMP_RECOVERY.top) < 0.2,
      );
      const t = bot.now();
      await bot.straight(JUMP_RECOVERY.returnX + ORIGIN.x, start.z, 0.4, 8000);
      await bot.straight(JUMP_RECOVERY.returnX + ORIGIN.x, start.z + 10.2, 0.4, 5000);
      await bot.straight(JUMP_RECOVERY.ramp.x + ORIGIN.x, start.z + 10.2, 0.4, 5000);
      await bot.straight(start.x + ORIGIN.x, start.z, 0.4, 5000);
      bot.check('walked back to the start without reset', onJumpPad(start));
      bot.note(`recovery ${(bot.now() - t).toFixed(1)} s`);
    } else {
      for (const kind of ['single', 'sprint', 'double'] as const) {
        await stage();
        const landed = await crossJumpGap(bot, start, JUMP_COURSE[1]!, kind);
        bot.check(`${kind} gap result`, landed === (kind === 'double'));
        await wait(700);
      }
      for (const offset of [0.25, 0.65, 1.05, 1.35]) {
        await stage();
        const landed = await crossJumpGap(bot, start, JUMP_COURSE[1]!, 'sprint', offset);
        bot.check(`late/coyote sprint at edge ${offset} cannot cross`, !landed);
        await wait(700);
      }
    }
    bot.finish(`double-jump ${mode}`);
  } finally {
    clearInterval(dismiss);
  }
};
(window as unknown as { __doubleJumpRun: () => Promise<void> }).__doubleJumpRun = run;
export {};
