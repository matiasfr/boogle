// The roster (src/player/hud.ts renderPeople) follows the room: alone, the room stays quiet (my own 20 Hz presence
// sends don't call onPeers, src/net/peer-table.ts), and a friend's join, rename and leave each show. Serves DESIGN.md
// "Small and readable".
import type { Page } from 'playwright';

type Game = {
  page: Page;
  eval: (code: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  close: () => Promise<void>;
};
type Run = {
  open: (o: { name: string; room: string; size?: number[] }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => boolean;
  sleep: (ms: number) => Promise<void>;
};

const ROSTER = `document.getElementById('roster').textContent`;

export default {
  about: 'alone the room calls onPeers no more; a join, rename and leave each update the roster',
  timeout: 180000,
  async run(t: Run) {
    const room = ('roster-' + Date.now().toString(36)).slice(0, 32);
    const size = [480, 300];
    const A = await t.open({ name: 'Alice', room, size });
    await A.waitFor(`window.boogle.net.state === 'live'`, { timeout: 60000 });
    await A.eval(`window.__peerCalls = 0; window.boogle.net.room.onPeers(() => window.__peerCalls++); return 0;`);
    await t.sleep(3000);
    const calls = (await A.eval(`return window.__peerCalls;`)) as number;
    t.check('alone, onPeers is called once (on subscribe), not 20 times a second', calls <= 1, `${calls} calls in 3 s`);

    const B = await t.open({ name: 'Bob', room, size });
    const joined = await A.waitFor(`${ROSTER}.includes('Bob')`, { timeout: 60000 });
    t.check('a friend who joins shows in the roster', joined >= 0, `${joined} ms`);

    await B.eval(`window.boogle.me.name = 'Bobby'; return 0;`);
    const renamed = await A.waitFor(`${ROSTER}.includes('Bobby')`, { timeout: 20000 });
    t.check('a rename shows in the roster', renamed >= 0, `${renamed} ms`);

    await B.close();
    const left = await A.waitFor(`!${ROSTER}.includes('Bob')`, { timeout: 30000 });
    t.check('a friend who leaves drops off the roster', left >= 0, `${left} ms`);
  },
};
