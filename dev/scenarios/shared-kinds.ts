// Owner and Server state across two tabs: remote players and the ball use presence snapshots; The Boogler uses legs.
// Each check compares, inside one tab,
// the latest value it heard with where it draws the thing, so slow headless frames don't skew it across tabs.
import type { T } from './run.ts';
import type { Game } from '../look/lib.ts';

type Kind = 'player' | 'ball' | 'boogler';
export default {
  about: 'two players: Owner presence and the Server Boogler leg agree with their displayed poses',
  timeout: 300000, // two tabs on the nightly runner's software WebGPU; the default is 120 s
  async run(t: T) {
    const room = 'sc' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'Alice', room, size: [192, 120] });
    const B = await t.open({ name: 'Bob', room, size: [192, 120] });
    const ready = `[...window.boogle.remotes.values()].some((r) => r.avatar)`;
    const connected = await B.waitFor(`window.boogle.net.room && ${ready}`, { timeout: 30000 });
    t.check('the players see each other', connected >= 0 && (await A.waitFor(ready, { timeout: 15000 })) >= 0);
    const [host, client] = [A, B];

    // Distance between what the latest presence from the other tab says and where this tab draws it.
    const gap = `const { boogler } = await import('/src/boogler/boogler.ts');
      const { railwayMirror } = await import('/src/world/game-world.ts');
      const { railwayWorldRead } = await import('/src/entities/railway/state.ts');
      const { booglerPose } = await import('/src/world/boogler-shadow.ts');
      const leg = railwayMirror?.boogler.leg();
      const pose = leg ? booglerPose(leg, railwayWorldRead().tickNow()) : null;
      const b = window.boogle;
      const other = b.net.room.peers().find((p) => !p.sameTab);
      const pr = other?.presence || {};
      const r = b.remotes.get(other?.peer);
      const d = (x1, z1, x2, z2) => Math.hypot(x1 - x2, z1 - z2);
      return {
        player: pr.p && r?.avatar ? d(pr.p[0], pr.p[2], r.target.x, r.target.z) : null,
        ball: pr.b && !b.ball.mine ? d(pr.b.p[0], pr.b.p[2], b.ball.pose.p.x, b.ball.pose.p.z) : null,
        boogler: pose ? d(pose.x, pose.z, boogler.center.x, boogler.center.z) : null,
        g: pose ? [pose.x, pose.z] : null,
      };`;
    const worst = { player: 0, ball: 0, boogler: 0 };
    const heard = { player: 0, ball: 0, boogler: 0 };
    let walked = 0,
      last = null;
    // Keep sampling until the client has seen him walk 2 m: an idle Boogler tests no leg presentation. A slow
    // tab's clock runs far behind real time (the nightly runner: 1 m in 40 samples), so the cap is time, not samples.
    const t0 = Date.now();
    for (let k = 0; k < 8 || (walked < 2 && Date.now() - t0 < 180000); k++) {
      await t.sleep(600);
      for (const [tab, keys] of [
        [host, ['player', 'ball']],
        [client, ['player', 'ball', 'boogler']],
      ] as [Game, Kind[]][]) {
        const g = await tab.eval(gap);
        if (tab === client && g.g) {
          if (last) walked += Math.hypot(g.g[0] - last[0], g.g[1] - last[1]);
          last = g.g;
        }
        for (const key of keys)
          if (g[key] !== null) {
            heard[key]++;
            worst[key] = Math.max(worst[key], g[key]);
          }
      }
    }
    // A client running its own brain would drift from the server's path; require actual travel.
    const ok = (key: Kind) => heard[key] > 0 && worst[key] < 1.5;
    const say = (key: Kind) => `${worst[key].toFixed(2)} m over ${heard[key]} samples`;
    t.check('each tab draws the other player where its presence says (Owner)', ok('player'), say('player'));
    t.check("the ball shows where its owner's presence says (Owner)", ok('ball'), say('ball'));
    t.check(
      'the client draws the Boogler where the server leg says (Server)',
      ok('boogler') && walked >= 2,
      `${say('boogler')}; he walked ${walked.toFixed(1)} m`,
    );
  },
};
