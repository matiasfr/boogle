// node dev/look/home-coach-capture.ts — matched stills through the existing look browser owner.
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { startStack, launch, Game, reportGfxErrors } from './lib.ts';
import { writeRailSeed } from './rail-seed.ts';
const out = 'docs/world/home-coach-train';
fs.mkdirSync(out, { recursive: true });
const stack = await startStack({});
const browser = await launch();
const results = [];
try {
  for (const mode of ['before', 'after']) {
    const room = `home-coach-${mode}`;
    await writeRailSeed(stack.dataDir!, room, 'boiler-long');
    const g = await Game.open(browser, stack, {
      sourceImports: true,
      out,
      size: [1200, 800],
      room,
      query: mode === 'after' ? 'coachAfter=1' : '',
      warp: true,
      init: "localStorage.setItem('boogle.color','1');",
    });
    g.page.on('console', (m) => {
      if (m.text().startsWith('HOME COACH ')) console.log(m.text());
    });
    try {
      const code = stripTypeScriptTypes(fs.readFileSync('dev/look/evals/home-coach-train.ts', 'utf8')).replace(
        /^export \{\};.*$/m,
        '',
      );
      await g.eval(code);
      await g.warp({ seconds: 1, until: 'window.__placeDone' });
      for (const camera of ['square', 'island', 'table', 'top', 'player', 'coach']) {
        await g.eval(`window.__homeCoachCamera('${camera}');`);
        await g.wait(0.4);
        const path = await g.still(`${mode}-${camera}`);
        const fps = await g.fps();
        const errors = g.healthErrors();
        if (fps <= 0 || errors.length || g.gfxErrors.length)
          throw new Error(JSON.stringify({ fps, errors, gfx: g.gfxErrors }));
        results.push({ mode, camera, path, fps, backend: g.gfx });
        console.log(path);
      }
      reportGfxErrors([g]);
    } finally {
      await g.close();
    }
  }
  fs.writeFileSync(`${out}/capture.json`, JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  await stack.close();
}
