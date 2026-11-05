// Existing look harness: --query 'proto=place&coop=0' --eval this-file --hud --warm 1.
// Disposable fixtures exercise the real save/readers and synchronous mid-reveal claim boundary.
const state = (await import('/src/proto/place/job.ts' as string)) as typeof import('../../../src/proto/place/job.ts');
const gifts = (await import(
  '/src/proto/place/gifts.ts' as string
)) as typeof import('../../../src/proto/place/gifts.ts');
const props = (await import(
  '/src/proto/place/props.ts' as string
)) as typeof import('../../../src/proto/place/props.ts');
const tech = (await import('/src/proto/place/tech.ts' as string)) as typeof import('../../../src/proto/place/tech.ts');
const { toWorld } = (await import(
  '/src/proto/place/layout.ts' as string
)) as typeof import('../../../src/proto/place/layout.ts');
const { H, PATH_SAMPLES } = (await import(
  '/src/proto/place/terrain.ts' as string
)) as typeof import('../../../src/proto/place/terrain.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { getRoomId } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const key = `${state.COOP ? 'boogle-place-coop-v2' : 'boogle-place-v4'}:${getRoomId()}`;
type Personal = Record<string, unknown> & { gifts: { got: string[]; dry: number; crates: { x: number; z: number }[] } };
const read = () => JSON.parse(localStorage.getItem(key)!) as { shared: Record<string, unknown>; personal: Personal };
const failures: string[] = [];
let checks = 0;
const check = (label: string, ok: boolean) => {
  checks++;
  console.log(`SAVES ${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures.push(label);
};
while (!me.body) await new Promise((resolve) => setTimeout(resolve, 50));
const body = me.body;
const path = PATH_SAMPLES[0]!;
const spot = path[Math.floor(path.length * 0.2)]!;
const x = toWorld(spot[0] - 4.5),
  z = spot[1] - 1,
  y = H(x, z);
props.clearFinds();
tech.resetFinds();
gifts.snapGifts([], 0, []);
teleport(body, x, y + 1, z);
props.updateFinds(0);
const secret = tech.techApi.SECRETS[0]!;
tech.techApi.found.add(secret.id);
state.save();
props.clearFinds();
tech.resetFinds();
check('save restores', state.restore());
state.save();
let personal = read().personal;
check('gold discovery survives alongside secret history', JSON.stringify(personal.goldFinds) === '[0]');
check('secret discovery survives alongside gold history', tech.techApi.found.has(secret.id));
check(
  'personal histories stay outside shared snapshots',
  !('goldFinds' in state.captureShared()) && !('secretFinds' in state.captureShared()),
);

// Old saves could retain either shape under the colliding key. Recover only what remains.
const fixture = read();
for (const legacy of [
  [0, 0, 99, -1, 'bad'],
  { found: [secret.id, secret.id, 'bad'], hubbed: [secret.id, 'bad'] },
  null,
]) {
  delete fixture.personal.goldFinds;
  delete fixture.personal.secretFinds;
  fixture.personal.finds = legacy;
  localStorage.setItem(key, JSON.stringify(fixture));
  check('legacy save loads', state.restore());
  state.save();
  personal = read().personal;
  check(
    'legacy gold shape is bounded and isolated',
    JSON.stringify(personal.goldFinds) === (Array.isArray(legacy) ? '[0]' : '[]'),
  );
  check(
    'legacy secret shape is bounded and isolated',
    tech.techApi.found.has(secret.id) === (!!legacy && !Array.isArray(legacy)),
  );
}
fixture.personal.goldFinds = [];
fixture.personal.secretFinds = { found: [], hubbed: [] };
fixture.personal.finds = { found: [secret.id], hubbed: [secret.id] };
localStorage.setItem(key, JSON.stringify(fixture));
state.restore();
check('explicit new empty history wins over legacy', tech.techApi.found.size === 0);

gifts.snapGifts([], 0, []);
gifts.deliver(x + 3, y, z, null);
gifts.deliver(x + 7, y, z, null);
gifts.openCrate({ x: x + 3, z });
// No frame has run: the first box is still shaking when its award has already saved.
personal = read().personal;
check('claim saves its reward immediately', personal.gifts.got.join() === 'hat' && personal.gifts.dry === 1);
check(
  'claim save excludes only the consumed crate',
  personal.gifts.crates.length === 1 && personal.gifts.crates[0]!.x === x + 7,
);
check('mid-reveal save loads', state.restore());
gifts.openCrate({ x: x + 3, z });
check('restored claimed crate cannot award again', gifts.giftState.got.join() === 'hat' && !gifts.showing());
check(
  'unopened crate survives restore',
  gifts.giftState.crates().some((c) => c.x === x + 7),
);
state.save();
check(
  'repeated save retains one reward and one waiting crate',
  read().personal.gifts.got.join() === 'hat' && read().personal.gifts.crates.length === 1,
);
setTimeout(() => window.__debugCam!.set([x + 4, y + 7, z + 13], [x + 3, y + 1, z], 48), 600);
console.log(`SAVES RESULT ${checks - failures.length}/${checks}: ${JSON.stringify(failures)}`);
if (failures.length) throw new Error(`Personal save regressions: ${failures.join('; ')}`);
export {};
