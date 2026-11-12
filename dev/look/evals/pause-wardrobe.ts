// npm run look -- --query 'own=strawhat,scarf&wear=strawhat' --eval dev/look/evals/pause-wardrobe.ts --hud --name wardrobe
//  (pause=0 leaves Pause for dev/look/evals/pause-wardrobe-act.ts as --action; chosen=1 and --players 2 for the partner view)
// The pause view's You page (src/entities/wardrobe/menu.ts) on the production railway: give this capture's player some
// wearables, then open Pause the way a press does. Personal wardrobe only; nothing shared is written.
//   own=strawhat,scarf     what to grant (default: a hat, a second hat, a scarf, glasses, a raincoat and the stowaway);
//                          own= (empty) grants nothing, for a new player's first pause
//   wear=strawhat          put these on first (the rest stay owned, unworn)
//   pause=0                leave Pause shut (the action opens it); pause=controls opens that page
//   chosen=1               for --players 2: only player 1 gets the grant and the open; the partner just watches
//   inset=21               a notch's bottom inset (px) on the pause dialog, with 47 px at the sides, to prove nothing scrolls
// The --action half is dev/look/evals/pause-wardrobe-act.ts (real key presses on the page).
const { wardrobe } = (await import(
  '/src/entities/wardrobe/state.ts' as string
)) as typeof import('../../../src/entities/wardrobe/state.ts');
const { pauseNavigation } = (await import(
  '/src/player/pause-pages.ts' as string
)) as typeof import('../../../src/player/pause-pages.ts');
const { openPause } = (await import(
  '/src/features/pause.ts' as string
)) as typeof import('../../../src/features/pause.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 20000;
while ((!wardrobe() || !me.entered || !me.body) && performance.now() < deadline) await wait(50);
const mine = wardrobe();
if (!mine || !me.body) throw new Error('pause-wardrobe needs the production railway and an entered player');

const query = new URLSearchParams(location.search);
const inset = Number(query.get('inset') ?? 0);
if (inset) {
  const style = document.createElement('style');
  style.textContent = `dialog.pause[open] { padding: max(8px, 0px) 47px ${inset}px 47px !important; }`;
  document.head.append(style);
}
const chosen = !query.get('chosen') || query.get('player') === query.get('chosen');
const own = query.get('own') ?? 'strawhat,beanie,scarf,glasses,raincoat,critter';
if (chosen) {
  for (const id of own.split(',').filter(Boolean)) mine.grant(id, { wear: false });
  for (const id of (query.get('wear') ?? '').split(',').filter(Boolean)) mine.wearOwned(id);
  const page = query.get('pause');
  if (page !== '0') {
    if (page) pauseNavigation.open?.(page);
    else openPause();
  }
}
console.log(`PAUSE setup ${JSON.stringify({ chosen, worn: mine.inspect().worn })}`);
export {};
