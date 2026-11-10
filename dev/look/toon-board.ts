// Toon-shading boards (docs/research/toon-shading.md): the same four poses under today's look and each ?toon= candidate,
// stitched into one board per pose and one overview. One local stack, one seeded room, one page per candidate.
//   node dev/look/toon-board.ts [--seed crossing-done] [--modes base,a,b,c] [--poses home,square,pier,works]
//     [--size 800x500] [--name toon] [--query 'toonEdge=0.3'] [--have base,a]
// Stills are live frames, not frozen: trains, residents and the sea move between candidates. Cells are native pixels.
import fs from 'node:fs';
import path from 'node:path';
import { startStack, launch, Game, reportGfxErrors, sleep, type Stack } from './lib.ts';
import { writeRailSeed } from './rail-seed.ts';
import type { Browser } from 'playwright';

const argv = process.argv.slice(2);
const opt = (name: string, fallback: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1]! : fallback);
const seed = opt('--seed', 'crossing-done');
const modes = opt('--modes', 'base,a,b,c').split(',');
const poseNames = opt('--poses', 'home,square,pier,works').split(',');
const size = opt('--size', '800x500').split('x').map(Number) as [number, number];
const name = opt('--name', 'toon');
const extra = opt('--query', '');
const out = path.resolve('.look', name);
const LABELS: Record<string, string> = {
  base: 'Today (baseline)',
  a: 'A · ramp on characters',
  b: 'B · ramp on characters + world, soft rim',
  c: 'C · B + ink hull on characters',
};

// Page code: stand Buddy, frame the debug camera. `sun` cameras sit across the sun so the terminator shows.
const POSE = (pose: string) => `
const { me, cam } = await import('/src/player/player.ts');
const { teleport } = await import('/src/physics/engine.ts');
const { railwayRead } = await import('/src/entities/railway/state.ts');
const { SUN_DIR } = await import('/src/render/sun-dir.ts');
const { H } = await import('/src/proto/place/land.ts');
const layout = await import('/src/proto/place/layout.ts');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const end = performance.now() + 30000;
while ((!railwayRead()?.ready || !me.body) && performance.now() < end) await wait(50);
if (!me.body) throw new Error('no player body');
const door = (id) => {
  const p = layout.ROOM_PLOTS[id];
  const x = layout.toWorld(p.x), s = Math.sin(p.yaw), c = Math.cos(p.yaw);
  return { x: x + (p.d / 2) * s, z: p.z + (p.d / 2) * c, cx: x, cz: p.z };
};
let body, eye, look, fov = 60;
const pose = ${JSON.stringify(pose)};
if (pose === 'home') {
  // Buddy close at Home, side-lit: the camera stands square to the sun's azimuth, so lit and shade halves both show.
  const x = 899, z = 22, y = H(x, z);
  body = [x, y + 0.9, z];
  const sx = SUN_DIR.x, sz = SUN_DIR.z, l = Math.hypot(sx, sz);
  const px = -sz / l, pz = sx / l; // perpendicular to the sun, on the ground
  eye = [x + px * 3.0 - (sx / l) * 0.9, y + 1.5, z + pz * 3.0 - (sz / l) * 0.9];
  look = [x, y + 0.75, z];
  fov = 40;
} else if (pose === 'square') {
  const h = door('house'), s = door('shop'), m = door('museum');
  const mid = { x: (h.x + s.x + m.x) / 3 + 7, z: (h.z + s.z + m.z) / 3 };
  const y = H(mid.x, mid.z);
  body = [mid.x, y + 0.9, mid.z];
  look = [(h.cx + s.cx + m.cx) / 3, y + 1.5, (h.cz + s.cz + m.cz) / 3];
  eye = [mid.x + 9, y + 7, mid.z + 2];
} else if (pose === 'pier') {
  body = [1399.7, 26, -356];
  eye = [1416, 31, -360];
  look = [1403, 23, -376];
  fov = 62;
} else if (pose === 'works') {
  // Inside the Split-rock Works' bowl, by the kiln, looking back at the throat (railway-works-at.ts poses).
  body = [1124, H(1124, 86) + 0.9, 86];
  eye = [1131.5, H(1124, 86) + 3.2, 93];
  look = [1124, H(1124, 86) + 0.8, 86];
  fov = 55;
} else if (pose === 'bowl') {
  body = [1124, H(1124, 86) + 0.9, 86];
  eye = [1141, 35, 104];
  look = [1119, 25, 82];
  fov = 62;
} else if (pose === 'stall') {
  body = [903, H(903, 14) + 0.9, 14];
  eye = [901, 23, 11];
  look = [909.5, 20, 18.5];
  fov = 62;
} else throw new Error('pose ' + pose);
teleport(me.body, body[0], body[1], body[2]);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-(eye[0] - body[0]), -(eye[2] - body[2]));
const frame = () => window.__debugCam.set(eye, look, fov);
frame();
const hold = setInterval(frame, 200);
setTimeout(() => clearInterval(hold), 5000);
return { pose, body, eye, look };
`;

async function capture(browser: Browser, stack: Stack, mode: string) {
  const query = [mode === 'base' ? '' : `toon=${mode}`, extra].filter(Boolean).join('&');
  const g = await Game.open(browser, stack, {
    room: 'look-rail',
    query,
    size,
    out,
    warp: true,
    // The same Buddy colour on every page (look.ts does the same for comparable pictures).
    init: "localStorage.setItem('boogle.color', '1');",
  });
  g.page.on('console', (m) => /^[A-Z]{3,} /.test(m.text()) && console.log(m.text()));
  const shots: Record<string, string> = {};
  try {
    for (const pose of poseNames) {
      await g.page.evaluate(() => window.__warp?.go(Infinity));
      console.log(mode, JSON.stringify(await g.eval(POSE(pose))));
      await g.warp({ seconds: 4 });
      await sleep(400);
      if (g.errors.length) throw new Error(g.healthErrors().join('\n'));
      shots[pose] = await g.still(`${mode}-${pose}`);
    }
    if (mode !== 'base') {
      const state = await g.eval(`const m = await import('/src/debug/toon-shading.ts');
        const { scene } = await import('/src/render/scene.ts');
        let characters = 0, inks = 0, skinned = 0;
        scene.traverse((o) => {
          if (o.userData.toonCharacter) characters++;
          if (o.userData.toonInk) { inks++; if (o.isSkinnedMesh) skinned++; }
        });
        return { mode: m.toonInstalled(), characters, inks, skinned };`);
      console.log(`TOON ${JSON.stringify(state)}`);
      if (state.mode !== mode) throw new Error(`toon ${mode} did not install (${state.mode})`);
    }
  } finally {
    reportGfxErrors([g]);
    await g.close();
  }
  return shots;
}

// One board: cells in a grid, a label over each, native pixels, lossless PNG (drawn in a blank page's canvas).
async function board(
  browser: Browser,
  file: string,
  title: string,
  cells: { label: string; image: string }[],
  cols: number,
) {
  const page = await (await browser.newContext()).newPage();
  const data = cells.map((c) => ({
    label: c.label,
    src: 'data:image/png;base64,' + fs.readFileSync(c.image).toString('base64'),
  }));
  const png = await page.evaluate(
    async ({ data, cols, w, h, title }) => {
      const head = 56,
        band = 34,
        rows = Math.ceil(data.length / cols);
      const canvas = document.createElement('canvas');
      canvas.width = cols * w;
      canvas.height = head + rows * (h + band);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(title, 14, 38);
      for (let i = 0; i < data.length; i++) {
        const im = new Image();
        im.src = data[i]!.src;
        await im.decode();
        const x = (i % cols) * w,
          y = head + Math.floor(i / cols) * (h + band);
        ctx.font = 'bold 22px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(data[i]!.label, x + 10, y + 25);
        ctx.drawImage(im, x, y + band, w, h);
      }
      return canvas.toDataURL('image/png');
    },
    { data, cols, w: size[0], h: size[1], title },
  );
  fs.writeFileSync(file, Buffer.from(png.split(',')[1]!, 'base64'));
  await page.context().close();
  return file;
}

let stack: Stack | undefined, browser: Browser | undefined;
try {
  fs.mkdirSync(out, { recursive: true });
  stack = await startStack();
  await writeRailSeed(stack.dataDir!, 'look-rail', seed);
  browser = await launch();
  const results: Record<string, Record<string, string>> = {};
  // --have base,a: reuse those modes' stills already in this --name's folder (a rerun after one page failed to load).
  const have = opt('--have', '').split(',').filter(Boolean);
  for (const mode of modes)
    results[mode] = have.includes(mode)
      ? Object.fromEntries(poseNames.map((pose) => [pose, path.join(out, `${mode}-${pose}-still.png`)]))
      : await capture(browser, stack, mode);
  const files: string[] = [];
  for (const pose of poseNames)
    files.push(
      await board(
        browser,
        path.join(out, `board-${pose}.png`),
        `Toon candidates · ${pose} · seed ${seed}${extra ? ' · ' + extra : ''}`,
        modes.map((m) => ({ label: LABELS[m] ?? m, image: results[m]![pose]! })),
        2,
      ),
    );
  files.push(
    await board(
      browser,
      path.join(out, 'board-all.png'),
      `Toon candidates · rows: ${poseNames.join(', ')} · columns: ${modes.map((m) => LABELS[m] ?? m).join(' | ')}`,
      poseNames.flatMap((pose) => modes.map((m) => ({ label: `${m} · ${pose}`, image: results[m]![pose]! }))),
      modes.length,
    ),
  );
  console.log('boards:\n' + files.join('\n'));
} finally {
  await browser?.close();
  await stack?.close();
}
