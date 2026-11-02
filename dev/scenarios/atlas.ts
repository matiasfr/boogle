// The atlas (/atlas/, atlas/ and docs/atlas/): stills of every view in light and dark, every story to its last step,
// and no page errors. Stale chips are reported, not failed: the daily atlas agent fixes those.
import path from 'node:path';
import type { Page } from 'playwright';

// The part of the harness (dev/scenarios/run.ts) this scenario uses.
type Run = {
  page: (pathname: string, o?: { colorScheme?: 'light' | 'dark' }) => Promise<Page>;
  check: (label: string, ok: boolean, detail?: string) => void;
  out: string;
};

export default {
  about: 'the atlas page: every view and every story, light and dark, no page errors',
  async run(t: Run) {
    for (const scheme of ['light', 'dark'] as const) {
      const page = await t.page('atlas/', { colorScheme: scheme });
      await page.waitForSelector('.diagram svg', { timeout: 15000 });
      const shot = (name: string) => page.screenshot({ path: path.join(t.out, `${scheme}-${name}.png`) });
      const click = (sel: string) => page.locator(sel).first().click();

      await shot('how');

      await click('[data-story="mush"]');
      await click('[data-nav="1"]');
      await click('[data-nav="1"]');
      t.check(
        `${scheme}: mush story at step 3`,
        (await page.locator('.cap-top span').first().innerText()).includes('Step 3 of'),
      );
      await shot('how-mush-step3');

      const stories = await page
        .locator('[data-story]')
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.story));
      t.check(`${scheme}: stories load`, stories.length >= 6, stories.join(', '));
      for (const id of stories) {
        await click(`[data-story="${id}"]`);
        let last = false;
        for (let i = 0; i < 12 && !last; i++) {
          const text = await page.locator('.cap-top span').first().innerText();
          const [, n, total] = /Step (\d+) of (\d+)/.exec(text) ?? [];
          last = n === total;
          if (!last) await click('[data-nav="1"]');
        }
        const caption = await page.locator('.caption p').first().innerText();
        t.check(`${scheme}: story ${id} reaches its last step`, last && caption.length > 0);
        await click(`[data-story="${id}"]`); // clicking the active story closes it
      }
      const stale = await page.locator('.chip.stale').count();
      t.check(`${scheme}: stale chips (informational)`, true, `${stale} on this page`);

      for (const style of ['layers', 'pack', 'treemap']) {
        await click('[data-view="map"]');
        await click(`[data-style="${style}"]`);
        await page.waitForSelector(style === 'layers' ? '.layers' : '.canvas svg');
        await shot(`map-${style}`);
      }
      for (const view of ['focus', 'flow', 'frame']) {
        await click(`[data-view="${view}"]`);
        await page.waitForSelector(view === 'frame' ? '.flame' : '.canvas svg');
        await shot(view);
      }
      await click('[data-changes]');
      await shot('changes');
      t.check(`${scheme}: changes panel has entries`, (await page.locator('.change').count()) > 0);
    }
  },
};
