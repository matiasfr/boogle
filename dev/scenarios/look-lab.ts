// The look lab (?proto=look, src/debug/look-lab.ts; write-up docs/proposals/visual-target.md): stills of every preset
// from the same views, and the cost of a frame for each preset and each layer on its own. Not in CI or the nightly run:
// it is a measuring tool for a Mac's GPU (software WebGPU would take minutes and measure nothing).
//   npm run scenario -- look-lab                      stills + bench
//   LOOKLAB=stills npm run scenario -- look-lab       stills only (LOOKLAB=bench: bench only)
// Bench: a 1210x834 page at pixel ratio 2 (2420x1668, the M4 iPad Pro 11" panel), ms per frame from batches
// rendered back to back (lookLab.bench), median of 7. Writes bench.json next to the images. Serves DESIGN.md "Understandable at
// a glance" (the visual target is measured, not guessed).
import fs from 'node:fs';
import path from 'node:path';

type Game = {
  eval: (body: string) => Promise<unknown>;
  view: (v: string | { cam: number[]; look: number[] }) => Promise<void>;
  still: (label: string) => Promise<string>;
  errors: string[];
  gfxErrors: string[];
  close: () => Promise<void>;
};
type Run = {
  out: string;
  open: (o: { name: string; room?: string; hud?: boolean; query?: string; size?: number[] }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};
type Bench = {
  ms: { median: number; min: number; max: number };
  cpuMs: number;
  calls: number;
  tris: number;
  px: string;
};

const PRESETS = ['today', 'mid', 'ipad', 'high', 'toon', 'diorama', 'toybox', 'miniature', 'ultra'];
const LAYERS = [
  'haze',
  'skyfog',
  'soft',
  'csm',
  'detail',
  'sway',
  'grass',
  'ao',
  'ssgi',
  'taa',
  'bloom',
  'grade',
  'outline',
  'softline',
  'toon',
  'paint',
  'rim',
  'plastic',
  'tilt',
];
const VIEWS = ['court', 'shore', 'overview'];
const NOON = 0.3, // time of day (src/sim/sky-clock.ts: 0 sunrise, 0.6 sunset), pinned so shadows match
  SUNSET = 0.55,
  NIGHT = 0.8;
const ERA = ['today', 'diorama']; // also shot on the steam palette row (&era=steam)
const mode = process.env.LOOKLAB || 'all';
const lab = 'window.boogle.lookLab';

export default {
  about: 'look lab: stills per preset and view, ms a frame per preset and per layer',
  timeout: 1200000,
  async run(t: Run) {
    const room = 'looklab' + Math.random().toString(36).slice(2, 6);
    // A fresh page per configuration: cascaded shadows only switch at load, and nothing from one layer's programs
    // lingers into the next measurement.
    let k = 0;
    const page = async (query: string, size?: number[]) => {
      const g = await t.open({ name: 'Look' + k++, room: room + k, query: `proto=look&lookpanel=0&${query}`, size });
      await g.eval(`window.boogle.sky.preview(${NOON})`); // the same sun for every page
      await t.sleep(3000); // pipelines build, TRAA settles
      return g;
    };
    const clean = (g: Game, what: string) => {
      t.check(`${what}: no graphics errors`, g.gfxErrors.length === 0, g.gfxErrors.slice(0, 3).join(' | '));
      t.check(`${what}: no page errors`, g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
    };
    if (mode !== 'bench') {
      for (const p of PRESETS) {
        const A = await page(`look=${p}`);
        for (const v of VIEWS) {
          await A.view(v);
          await t.sleep(2000);
          await A.still(`${p}-${v}`);
        }
        await A.eval(`window.boogle.sky.preview(${SUNSET})`); // low sun: bloom and the haze's sun-side glow
        await A.view('shore');
        await t.sleep(2500);
        await A.still(`${p}-sunset`);
        await A.eval(`window.boogle.sky.preview(${NIGHT})`);
        await A.view('court');
        await t.sleep(2500);
        await A.still(`${p}-night`);
        clean(A, p);
        await A.close();
      }
      for (const p of ERA) {
        const A = await page(`look=${p}&era=steam`);
        for (const v of ['court', 'overview']) {
          await A.view(v);
          await t.sleep(2000);
          await A.still(`${p}-steam-${v}`);
        }
        clean(A, p + ' steam');
        await A.close();
      }
    }
    if (mode !== 'stills') {
      const rows: Record<string, Record<string, Bench | null>> = {};
      const bench = async (label: string, query: string) => {
        const B = await page(query, [1210, 834]);
        rows[label] = {};
        for (const v of ['court', 'overview']) {
          await B.view(v);
          rows[label][v] = (await B.eval(`return ${lab}.bench({ dpr: 2 })`)) as Bench | null;
        }
        const r = rows[label];
        console.log(
          `  ${label.padEnd(10)} ` +
            ['court', 'overview']
              .map((v) => `${v} ${r[v]?.ms.median} ms (cpu ${r[v]?.cpuMs}, ${r[v]?.calls} calls, ${r[v]?.tris} tris)`)
              .join('  '),
        );
        clean(B, label);
        await B.close();
      };
      await bench('today', 'look=today');
      for (const l of LAYERS) await bench('+' + l, `look=today&fx=${l}`);
      for (const p of PRESETS.slice(1)) await bench(p, `look=${p}`);
      await bench('diorama+steam', 'look=diorama&era=steam');
      await bench('today again', 'look=today'); // drift on a shared GPU shows here
      fs.writeFileSync(path.join(t.out, 'bench.json'), JSON.stringify(rows, null, 2));
      t.check('the bench measured', !!rows.today?.court, path.join(t.out, 'bench.json'));
    }
  },
};
