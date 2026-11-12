// What `npm run playthrough` watches from inside the page, on the game's own clock: every line on screen (the DOM, sampled
// twice a game second), every string painted on a canvas (signs and boards in the world), and a save state at each beat.
// Page code: `installObserver` is serialised before the page's own scripts; `WATCH_MARKS` runs once the game's modules exist.

export type SeenLine = { text: string; where: string; first: number; last: number; shown: number; shows: number };
export type PaintedLine = { text: string; first: number; times: number };
export type SaveState = {
  beat: string;
  t: number;
  pose: { x: number; y: number; z: number; yaw: number; pitch: number } | null;
  storage: Record<string, string>;
};
export type Observed = { lines: SeenLine[]; painted: PaintedLine[]; saves: SaveState[] };

/** Not what a player is told: the tester's panels and the name tags and connection pill in the corners. */
const IGNORE = '.place-proto, .hud-tl, .hud-tr, .lobby, .splash, .reticle, [data-tool]';

export function installObserver(ignore: string) {
  const SAMPLE_MS = 500;
  const lines = new Map<string, SeenLine & { on: boolean }>();
  const painted = new Map<string, PaintedLine>();
  let visible: { text: string; where: string }[] = [];
  const template = (s: string) => s.replace(/\d[\d,.]*/g, '#');
  const now = () => performance.now() / 1000;

  // A line as a player reads it: up from the text to the largest box that's still about one thought, so a card's key caps and
  // labels make one line, and the HUD's whole contents don't.
  function textBlock(el: Element) {
    let b = el;
    while (b.parentElement && b.parentElement !== document.body && !b.parentElement.matches('.hud')) {
      const size = (b.parentElement.textContent || '').trim().length;
      if (size > 120) break;
      b = b.parentElement;
    }
    return b as HTMLElement;
  }
  function sample(record = true) {
    visible = [];
    if (!document.body?.classList.contains('playing')) return;
    const seen = new Set<string>();
    const blocks = new Set<HTMLElement>();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.nodeValue?.trim()) continue;
      const parent = n.parentElement;
      if (!parent || parent.closest('script, style') || parent.closest(ignore)) continue;
      if (parent.closest('[style*="z-index:9999"], [style*="z-index: 9999"]')) continue; // an eval's own notes
      blocks.add(textBlock(parent));
    }
    for (const b of blocks) {
      if (!b.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = b.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth)
        continue;
      const text = (b.innerText || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200);
      if (!text) continue;
      visible.push({ text, where: b.className.toString().slice(0, 40) });
      if (!record) continue;
      const key = template(text);
      seen.add(key);
      let l = lines.get(key);
      if (!l) {
        l = {
          text,
          where: b.className.toString().slice(0, 40),
          first: now(),
          last: now(),
          shown: 0,
          shows: 0,
          on: false,
        };
        lines.set(key, l);
      }
      if (!l.on) l.shows++;
      l.on = true;
      l.last = now();
      l.shown += SAMPLE_MS / 1000;
    }
    if (record) for (const [key, l] of lines) if (!seen.has(key)) l.on = false;
  }
  setInterval(sample, SAMPLE_MS);

  const paint = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text: string, ...rest: [number, number, number?]) {
    const s = String(text).trim();
    if (s.length > 1) {
      const key = template(s);
      const p = painted.get(key) ?? { text: s, first: now(), times: 0 };
      p.times++;
      painted.set(key, p);
    }
    return paint.call(this, text, ...rest);
  };

  const saves: SaveState[] = [];
  const named = new Set<string>();
  const w = window as unknown as {
    __observe: {
      take(beat: string, immediate?: boolean, replace?: boolean): void;
      read(): Observed;
      current(): { text: string; where: string }[];
      pose: () => SaveState['pose'];
      lastBeat: number;
    };
  };
  w.__observe = {
    current: () => {
      sample(false);
      return visible;
    },
    pose: () => null, // WATCH_MARKS fills these in, once the player exists
    lastBeat: 0,
    take(beat, immediate = false, replace = false) {
      if (named.has(beat) && !replace) return;
      if (replace) {
        const index = saves.findIndex((save) => save.beat === beat);
        if (index >= 0) saves.splice(index, 1);
      }
      named.add(beat);
      w.__observe.lastBeat = now(); // only what's new: a bot opening one crate forever is stuck, however busy it looks
      const capture = () => {
        const storage: Record<string, string> = {};
        for (let k = 0; k < localStorage.length; k++) {
          const name = localStorage.key(k)!;
          storage[name] = localStorage.getItem(name)!;
        }
        saves.push({ beat, t: now(), pose: w.__observe.pose(), storage });
      };
      if (immediate) capture();
      else setTimeout(capture, 200);
    },
    read: () => ({
      lines: [...lines.values()].map((l) => ({
        text: l.text,
        where: l.where,
        first: l.first,
        last: l.last,
        shown: l.shown,
        shows: l.shows,
      })),
      painted: [...painted.values()],
      saves,
    }),
  };
}
export const IGNORE_TEXT = IGNORE;

/** Page code: names the beats as they happen, and finds the game's own save and the player. */
export const WATCH_MARKS = `
  const o = window.__observe;
  const { me, cam } = await import('/src/player/player.ts');
  o.pose = () => {
    const p = me.body?.position;
    return p ? { x: p.x, y: p.y, z: p.z, yaw: me.yaw, pitch: cam.pitch } : null;
  };
  // Checkpoints hold pose/profile only; the server owns work, so there is no client save to flush.
  const marks = await import('/src/proto/mark.ts');
  if (!marks.watchPlayMarks) return false;
  let line = '';
  marks.watchPlayMarks((name, data) => {
    if (name === 'objective') {
      // It calls in every frame: only new words count as something happening.
      const text = String(data?.text ?? '').replace(/[0-9]+/g, '#').slice(0, 60);
      if (text === line) return;
      line = text;
      return o.take('objective: ' + text);
    }
    const what = data && typeof data.rung === 'string' ? ' ' + data.rung : '';
    o.take(name + what);
  });
  return true;
`;
