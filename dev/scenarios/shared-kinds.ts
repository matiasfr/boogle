// Owner and Host state across two tabs: remote players and the ball (Owner, presence fields) and The Boogler (Host,
// addHostField) reach the other tab through the snapshot buffers in src/netplay/snaps.ts. Each check compares, inside one tab,
// the latest value it heard with where it draws the thing, so slow headless frames don't skew it across tabs.
import type { T } from './run.ts';
import type { Game } from '../look/lib.ts';

type Kind = 'player' | 'ball' | 'boogler';
export default {
  about: 'two players: each draws the other, the ball and the Boogler where the latest presence puts them',
  async run(t: T) {
    const room = 'sc' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'Alice', room, size: [192, 120] });
    const B = await t.open({ name: 'Bob', room, size: [192, 120] });
    const ready = `[...window.boogle.remotes.values()].some((r) => r.avatar)`;
    const connected = await B.waitFor(`window.boogle.net.room && ${ready}`, { timeout: 30000 });
    t.check('the players see each other', connected >= 0 && (await A.waitFor(ready, { timeout: 15000 })) >= 0);
    const hostA = await A.eval(`return window.boogle.net.room.isLead();`); // the lead runs the Boogler
    const [host, client] = hostA ? [A, B] : [B, A];

    // Distance between what the latest presence from the other tab says and where this tab draws it.
    const gap = `const { boogler } = await import('/src/boogler/boogler.ts');
      const b = window.boogle;
      const other = b.net.room.peers().find((p) => !p.sameTab);
      const pr = other?.presence || {};
      const r = b.remotes.get(other?.peer);
      const d = (x1, z1, x2, z2) => Math.hypot(x1 - x2, z1 - z2);
      return {
        player: pr.p && r?.avatar ? d(pr.p[0], pr.p[2], r.target.x, r.target.z) : null,
        ball: pr.b && !b.ball.mine ? d(pr.b.p[0], pr.b.p[2], b.ball.disp.p.x, b.ball.disp.p.z) : null,
        boogler: pr.g ? d(pr.g.p[0], pr.g.p[1], boogler.center.x, boogler.center.z) : null,
        g: pr.g?.p ?? null,
      };`;
    const worst = { player: 0, ball: 0, boogler: 0 };
    const heard = { player: 0, ball: 0, boogler: 0 };
    let walked = 0,
      last = null;
    // Keep sampling (capped) until the client has seen him walk 2 m: an idle Boogler tests no Host interpolation.
    for (let k = 0; k < 8 || (walked < 2 && k < 40); k++) {
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
    // A tab that walked him itself (stale host) would drift metres from the host's path within a few seconds, but only
    // if he moved, so the Host check also requires that he walked.
    const ok = (key: Kind) => heard[key] > 0 && worst[key] < 1.5;
    const say = (key: Kind) => `${worst[key].toFixed(2)} m over ${heard[key]} samples`;
    t.check('each tab draws the other player where its presence says (Owner)', ok('player'), say('player'));
    t.check("the ball shows where its owner's presence says (Owner)", ok('ball'), say('ball'));
    t.check(
      'the client draws the Boogler where the host field says (Host)',
      ok('boogler') && walked >= 2,
      `${say('boogler')}; he walked ${walked.toFixed(1)} m`,
    );
  },
};
