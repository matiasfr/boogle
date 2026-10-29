// The hill spring feeds one continuous ribbon of water to the sea, and it reads calm on screen.
export default {
  about: 'spring runs down the hill to the sea as an unbroken, calm stream',
  async run(t) {
    const g = await t.open({ name: 'viewer' });
    await g.view('stream');
    // Let the stream develop (the sim runs in real time, ~10 ticks/s).
    await t.sleep(12000);
    // Connectivity: walk downhill from the spring over wet cells (>= 2 cm, above sea) until reaching the sea.
    const trace = await g.eval(`
      const { water, region, spring } = window.__water; const W = region.w, H = region.h;
      const wet = (c) => water.depth[c] >= 2;
      const sea = (c) => water.terrain[c] + water.depth[c] <= water.seaLevel + 2;
      let c = spring.i * H + spring.j, steps = 0, reachedSea = false; const seen = new Set();
      while (steps++ < 400 && !seen.has(c)) {
        seen.add(c);
        const i = (c / H) | 0, j = c - i * H; let best = -1, bs = water.terrain[c] + water.depth[c];
        for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
          const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= W || b >= H) continue;
          const n = a * H + b; if (!wet(n)) continue;
          const s = water.terrain[n] + water.depth[n]; if (s < bs) { bs = s; best = n; }
        }
        if (best < 0) break; c = best; if (sea(c)) { reachedSea = true; break; }
      }
      return { steps, reachedSea };`);
    t.check('a wet path leads from the spring to the sea', trace.reachedSea, `${trace.steps} cells`);

    await t.sleep(3000);
    const still = await g.still('stream');
    const m = await g.motion('stream', { frames: 8, seconds: 2, region: [0.1, 0.25, 0.8, 0.75] });
    t.check('the stream shows some motion (it flows)', m.score > 0.3, `score ${m.score.toFixed(2)}`);
    t.check(
      'the stream is calm, not frantic',
      m.score < 6,
      `score ${m.score.toFixed(2)} ${m.sheet} ${m.heat} ${still}`,
    );

    await g.view('spring');
    await t.sleep(1500);
    const sp = await g.motion('spring', { frames: 8, seconds: 2 });
    await g.still('spring');
    t.check('the spring is calm', sp.score < 6, `score ${sp.score.toFixed(2)} ${sp.sheet}`);
  },
};
