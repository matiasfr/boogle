// Two people in one building: `BOOGLE_QUERY='proto=place&coop=1' npm run look -- --room proto-place-coop --players 2 --eval dev/look/evals/place-town-coop.ts --warm 34`
// Both go into the shop. One talks to Button; the other tries on and takes a hat, then walks out and stands by the door. Each
// says what it sees. Cameras, cutaways, talks and what you've taken should be your own; the buildings and the money are shared.
const q = new URLSearchParams(location.search);
const who = q.get('player');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const place = window.__place as any;
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const hands = (await import('/src/player/hands.ts' as string)) as typeof import('../../../src/player/hands.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(100);
await wait(4000);
setInterval(() => window.__debugCam?.clear(), 1000); // the harness frames the first page: both follow their player
const say = (what: string) => {
  const t = place.town;
  const r = t.rooms.shop;
  console.log(
    `COOP ${who} ${what}: others ${window.boogle.remotes.size}, path ${place.lines[0].open}, shop ${r.site.state}, in ${t.indoors.room?.id ?? '-'}, roof ${r.t.roof.toFixed(2)}, talking ${t.talking()?.name ?? '-'}, kept [${place.giftState.bought.join()}], $${place.money()}, yaw ${cam.yaw.toFixed(2)}`,
  );
};
const stand = (lx: number, lz: number, fx: number, fz: number) => {
  const r = place.town.rooms.shop;
  const world = (x: number, z: number) => ({
    x: r.x + x * Math.cos(r.yaw) + z * Math.sin(r.yaw),
    z: r.z - x * Math.sin(r.yaw) + z * Math.cos(r.yaw),
  });
  const at = world(lx, lz),
    to = world(fx, fz);
  teleport(me.body!, at.x, place.H(at.x, at.z) + 1, at.z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(-(to.x - at.x), -(to.z - at.z));
};
const press = () => {
  hands.interactDown();
  hands.interactUp();
};
void (async () => {
  say('start');
  if (who === '1') place.skipPath();
  const r = place.town.rooms.shop;
  while (r.site.state !== 'done') await wait(200);
  await wait(1500);
  say('the shop stands');
  if (who === '1') stand(-3, -1.2, -3, -3.3);
  else stand(2.3, -1.9, 3.8, -1.9);
  await wait(1500);
  say('both inside');
  press(); // Talk, or Try on
  await wait(1200);
  say('talking, or trying on');
  if (who === '2') {
    press(); // Take it
    await wait(1200);
    say('took it');
    stand(0, 7, 0, 0);
    await wait(2500);
    say('outside by the door');
  } else {
    await wait(4000);
    say('still talking');
  }
})();
export {};
