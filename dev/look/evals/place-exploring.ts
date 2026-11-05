// Browser-side assertions shared by look's two-player eval and the fresh-profile scenario.
import { addPresenceField, net, onRemotePresence } from '../../../src/netplay/net.ts';
import { me } from '../../../src/player/player.ts';
import { actionById } from '../../../src/player/controls.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { scene } from '../../../src/render/scene.ts';
import { job } from '../../../src/proto/place/job.ts';
import { ORIGIN } from '../../../src/proto/place/layout.ts';
import { coop } from '../../../src/proto/place/coop.ts';
import { COOP_IDENTITY } from '../../../src/proto/place/coop-identity.ts';
import { techApi, snapTech } from '../../../src/proto/place/tech.ts';
import { snapHooks } from '../../../src/proto/place/run.ts';
import { giftState, openCrate } from '../../../src/proto/place/gifts.ts';

declare global {
  interface Window {
    __placeExplore?: { done: boolean; error: string | null; checks: string[] };
  }
}

export async function explore(who: string | null) {
  const result = (window.__placeExplore = { done: false, error: null, checks: [] } as NonNullable<
    Window['__placeExplore']
  >);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const check = (label: string, ok: unknown) => {
    if (!ok) throw new Error(label);
    result.checks.push(label);
    console.log(`COOP ${who} PASS ${label}`);
  };
  const until = async (label: string, fn: () => unknown, timeout = 15000) => {
    const end = performance.now() + timeout;
    while (!fn() && performance.now() < end) await wait(50);
    check(label, fn());
  };
  const allShared = () => Object.values(job.tech).every(Boolean) && Object.values(job.gate).every(Boolean);
  const slabsDown = () =>
    Object.values(techApi.GATES).every((g) =>
      scene.children.some(
        (o) =>
          Math.abs(o.position.x - (g.x + ORIGIN.x)) < 0.01 &&
          Math.abs(o.position.z - g.z) < 0.01 &&
          o.children.some((c) => c.name === 'seam') &&
          o.position.y < g.y - 5,
      ),
    );
  try {
    await until('player body ready', () => me.body);
    if (who === '3') {
      await until('newcomer inherits all abilities and gates', allShared);
      await until('newcomer sees both slabs lowered', slabsDown);
      check('newcomer has hook and glide controls', actionById('hook') && actionById('glide'));
      check('newcomer inherits no personal prizes', techApi.found.size === 0 && giftState.got.length === 0);
      result.done = true;
      return;
    }

    let stage = 0,
      partnerStage = 0,
      snaps = 0;
    let partnerMove: unknown = null;
    const received = new Set<string>();
    snapHooks.push(() => snaps++);
    addPresenceField('placeEval', () => stage);
    onRemotePresence((_r, pr) => {
      const p = pr as { placeEval?: unknown; placeMove?: unknown };
      if (typeof p.placeEval === 'number') partnerStage = p.placeEval;
      partnerMove = p.placeMove;
    });
    await until('co-op partner ready', () => coop.debug().peers.length === 1 && net.room);
    net.room!.onMessage((raw) => {
      const m = raw as { t?: unknown; k?: unknown; what?: unknown };
      if (m?.t === COOP_IDENTITY && m.k === 'tech' && typeof m.what === 'string') received.add(m.what);
    });
    const barrier = async () => {
      stage++;
      await until(`partner reached step ${stage}`, () => partnerStage >= stage);
    };
    check(
      'fresh abilities and gates',
      !Object.values(job.tech).some(Boolean) && !Object.values(job.gate).some(Boolean),
    );
    teleport(me.body!, who === '1' ? 900 : 903, 20, 14);
    me.body!.velocity.set(0, 0, 0);
    for (const [id, actor] of [
      ['jump', '1'],
      ['hook', '2'],
      ['quarry', '2'],
      ['glide', '1'],
    ] as const) {
      await barrier();
      const before = snaps;
      if (who === actor) {
        if (id === 'quarry') techApi.open(id);
        else techApi.take(id);
      }
      await until(`${id} reaches both players`, () => (id === 'quarry' ? job.gate.quarry : job.tech[id]));
      if (who !== actor) {
        check(`${id} arrived through coop.tech`, received.has(id));
        check(`${id} did not wait for snapshot repair`, snaps === before);
      }
    }
    await until('glider also opens sea gate', allShared);
    await until('both slabs finish lowering', slabsDown);
    await barrier();

    const secret = techApi.SECRETS[0]!;
    if (who === '1') {
      const c = giftState.crates().find((c) => c.content === secret.gift);
      check('secret crate exists', c);
      openCrate(c!);
      check('prizeHooks.found records the opened secret', techApi.found.has(secret.id));
      check('opened secret grants its cosmetic', giftState.got.includes(secret.gift as (typeof giftState.got)[number]));
    }
    await barrier();
    check('secret stays personal', techApi.found.has(secret.id) === (who === '1'));

    // Break the follower's local view deliberately: periodic shared state must invoke snapHooks and repair it.
    const before = snaps;
    if (coop.follower()) {
      job.tech.jump = false;
      job.gate.quarry = false;
      snapTech();
      await until('snapshot repairs abilities and gate', allShared);
      check('snapshot invoked snapHooks', snaps > before);
      await until('snapshot repairs slab view', slabsDown);
      check('snapshot preserves personal finds', techApi.found.has(secret.id) === (who === '1'));
    }
    await barrier();

    if (who === '2') {
      teleport(me.body!, 903, 150, 14);
      me.body!.velocity.set(0, 0, 0);
      await until('glider actor airborne', () => me.coyote <= 0);
      techApi.toggleGlide();
      check('glider opened', techApi.move.open);
    } else {
      await until('placeMove shows partner gliding', () => Array.isArray(partnerMove) && partnerMove[0] === 1);
    }
    await barrier();
    if (who === '2') {
      techApi.toggleGlide();
      check('glider closed', !techApi.move.open);
    } else await until('placeMove clears after closing', () => partnerMove == null);
    await barrier();
    check('shared state remains intact', allShared());
    result.done = true;
  } catch (e) {
    result.error = String(e);
    console.error(`COOP ${who} FAIL ${result.error}`);
  }
}
