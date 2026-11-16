// timeout 360 npm run look -- --rail-seed freight-running --eval dev/look/evals/town-a2.ts --cam 906.08,20.2,12.40 --look 905,19,33 --name town-a2-hall --warm 2 --wall 240 --question 'Do the first stakes and freight pile read from the hall front?'
// timeout 360 npm run look -- --rail-seed freight-running --eval dev/look/evals/town-a2.ts --query plotshot=dock --cam 864.77,20.2,26.917 --look 907,19,33 --size 375x812 --name town-a2-dock --warm 2 --wall 240 --question 'Do stakes and the pile read at 40 m from the dock street on a phone frame?'
// Camera/standing pose only; the freight-running server seed supplies every delivered crate and stake.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');
const { railwayWorldRead } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { townLookOf } = (await import(
  '/src/entities/town/town-read.ts' as string
)) as typeof import('../../../src/entities/town/town-read.ts');
const dock = new URLSearchParams(location.search).get('plotshot') === 'dock';
// Stand behind the inspection camera so Buddy's head cannot fill the motion sheet.
const [x, z] = dock ? [863, 26.65] : [906.3, 10.5];
teleport(me.body!, x!, H(x!, z!) + 0.9, z!);
me.body!.velocity.set(0, 0, 0);
const read = railwayWorldRead();
if (!read) throw new Error('Town A2 proof needs the railway mirror');
console.log('TOWN A2 delivered/staked', JSON.stringify(townLookOf(read.world(), read.tick()).plots));
export {};
