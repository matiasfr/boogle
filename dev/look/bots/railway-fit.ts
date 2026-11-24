// Garage step 4's choice through ordinary inputs (docs/plans/garage-step4.md, step 4): at Home's Roundhouse, Interact
// at the garage post opens the garage, a click on a line's chip brings its copy to the table (rail.bring), a click on
// the Quick or Strong boiler selects it, and Interact held installs it (rail.install, parts 5 and 6) as
// ./railway-steel.ts holds the longer boiler's. ./railway-legs.ts calls it when the page's `railFit=quick|strong`
// asks; with none asked the bot never visits the post. Inspection observes; it never seeds a world, calls the adapter or moves a player.
import type { Bot } from '../bot.ts';
import { line, railAt, rw, shed, upgradePool } from '../rail-read.ts';
import { tradeOpen } from '../../../src/sim/railway-queries-route.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { triggerAction } from '../../../src/player/controls.ts';
import { garageRow, polarAt } from '../../../src/entities/railway/garage-geo.ts';
import { garage } from '../../../src/entities/railway/garage-state.ts';
import { TRADE_ROW } from '../../../src/entities/railway/garage-data.ts';

export type Fit = keyof typeof TRADE_ROW;

type Tools = {
  bot: Bot;
  until: (fn: () => unknown, beat: string, ms?: number) => Promise<void>;
  check: (ok: unknown, beat: string) => void;
  face: (x: number, z: number) => void;
};

/** Walk to the garage post and fit `fit` on trade line `l` (the room pays its first fit's 1 steel). The caller stands
 * at Home. Returns false, doing nothing, if the line already wears the row. */
export async function fitAtPost({ bot, until, check, face }: Tools, l: number, fit: Fit) {
  const row = TRADE_ROW[fit];
  if (line(rw(), l).boiler === row) return false;
  check(tradeOpen(rw(), l), `line ${l}'s trade is open for the ${fit} fit`);
  check(
    line(rw(), l).boiler > 0 || upgradePool(rw()) >= 1,
    `the room can pay the ${fit} fit: the steel pool holds ${upgradePool(rw())}`,
  );
  const untilTicks = async (fn: () => unknown, beat: string, ticks: number) => {
    const end = railAt() + ticks;
    while (!fn() && railAt() < end) await bot.wait(100);
    check(fn(), beat);
  };
  const { geo, table } = garageRow();
  const post = polarAt(table, geo.post);
  // Beside the lever and inside the server's reach, as the steel bot stands for the longer boiler.
  const stood = polarAt(table, { bearing: geo.post.bearing + 6, r: geo.post.r - 0.6 });
  check(await bot.walk(stood.x, stood.z, 0.3), 'walked to the garage post');
  face(post.x, post.z);
  await until(() => interactTarget()?.id === 'railway-garage', 'the garage is offered at the post', 20000);
  const t = interactTarget()!;
  check(t.run && !t.blocked, `the garage opens, not blocked "${t.blocked ?? ''}"`);
  bot.press();
  await until(() => garage.api?.snap().open, 'the garage opened', 8000);
  await bot.wait(700); // the camera's glide
  const snap = () => garage.api!.snap();
  const click = async (selector: string, what: string) => {
    let el: HTMLElement | null = null;
    await until(() => (el = document.querySelector<HTMLElement>(selector)), `${what} on screen`, 8000);
    el!.click();
  };
  try {
    // The chip: wait for the table to be free (the chips undimmed), then click the line's.
    if (shed(rw()).tableLine !== l) {
      await until(
        () => {
          const s = snap();
          return !s.facts.held && !s.facts.tableBusy && !s.bringing && s.phase === 'idle';
        },
        'the table free for a bring',
        60000,
      );
      await click(`.g-chips [data-line="${l}"]`, `line ${l}'s chip`);
      await untilTicks(
        () => shed(rw()).tableLine === l,
        `the chip brought line ${l}'s copy (rail.bring accepted)`,
        300,
      );
      console.log(`RAILWAY FIT ${JSON.stringify({ tick: railAt(), brought: l, bringRev: shed(rw()).bringRev })}`);
    }
    // The boiler: its tile clicked, then Install held once the table's hold is over.
    await click(`.g-parts [data-part="${fit}"]`, `the ${fit} boiler`);
    await until(() => snap().sel === fit, `the ${fit} boiler selected`, 8000);
    await until(() => snap().canInstall, `the ${fit} boiler installable (the table's hold over)`, 60000);
    const pool = upgradePool(rw());
    triggerAction('interact', 'down');
    try {
      await untilTicks(() => line(rw(), l).boiler === row, `line ${l} on row ${row} after the hold`, 600);
    } finally {
      triggerAction('interact', 'up');
    }
    console.log(
      `RAILWAY FIT ${JSON.stringify({ tick: railAt(), line: l, fit, part: fit === 'quick' ? 5 : 6, row, rev: line(rw(), l).rev, pool: [pool, upgradePool(rw())] })}`,
    );
    await until(() => snap().phase === 'idle', 'the install moment ran to its end', 15000);
  } finally {
    garage.api?.close();
  }
  return true;
}
