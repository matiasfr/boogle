// The boarding checkpoint must restore onto a real deck with a real Sit prompt. Never place or move a train.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const hands = (await import('/src/player/hands.ts' as string)) as typeof import('../../../src/player/hands.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { onATrain } = (await import(
  '/src/proto/place/cargo.ts' as string
)) as typeof import('../../../src/proto/place/cargo.ts');
const { seated } = (await import(
  '/src/proto/place/seat.ts' as string
)) as typeof import('../../../src/proto/place/seat.ts');
if (!me.body || !onATrain() || hands.interactTarget()?.id !== 'place-sit')
  throw new Error('Boarding checkpoint did not restore a usable train seat');
const start = { ...me.body.position };
const platform = carry.on;
let lost = false;
setTimeout(() => {
  hands.interactDown();
  hands.interactUp();
  if (hands.interactTarget()?.id !== 'place-stand') console.error('SHEET real Sit input did not seat the player');
}, 400);
const watch = setInterval(() => {
  if (!seated() || carry.on !== platform || me.swimming) lost = true;
}, 600);
setTimeout(() => {
  clearInterval(watch);
  const p = me.body!.position;
  if (lost || !seated() || carry.on !== platform || Math.hypot(p.x - start.x, p.y - start.y, p.z - start.z) < 2)
    console.error('SHEET train did not carry the player during this capture');
  else console.log('SHEET train carried the seated player');
}, 12000);
export {};
