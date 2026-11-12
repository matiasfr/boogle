// npm run look -- --real --query 'pause=0&keys=Down,Right,Right&settle=1500' --eval dev/look/evals/pause-wardrobe.ts --action dev/look/evals/pause-wardrobe-act.ts --video --seconds 4 --hud --name wardrobe-keys
// Real key presses on the pause view's You page (dev/look/evals/pause-wardrobe.ts sets it open): Down moves from Resume
// to Hat, then Right steps the hat. Keyboard events on the window, as the menu key handler sees them.
//   settle=1500   (query) ms to wait after the presses, so the camera has swung
//   keys=Down,Right,Right   (query) the presses, in order; Esc, Enter, Left and Up are the others
const keys = (new URLSearchParams(location.search).get('keys') ?? 'Down,Right').split(',');
const code: Record<string, string> = {
  Down: 'ArrowDown',
  Up: 'ArrowUp',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  Enter: 'Enter',
  Esc: 'Escape',
};
const query = new URLSearchParams(location.search);
// look.ts parks a debug camera for its pose: hand the camera back, so the follow camera (and the page's swing) shows.
window.__debugCam?.clear();
await new Promise((resolve) => setTimeout(resolve, 600));
if (!query.get('chosen') || query.get('player') === query.get('chosen'))
  for (const name of keys) {
    const key = code[name] ?? name;
    dispatchEvent(new KeyboardEvent('keydown', { code: key, key, bubbles: true, cancelable: true }));
    dispatchEvent(new KeyboardEvent('keyup', { code: key, key, bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
await new Promise((resolve) => setTimeout(resolve, Number(query.get('settle') ?? 1500)));
const { partnerWearing, wardrobe } = (await import(
  '/src/entities/wardrobe/state.ts' as string
)) as typeof import('../../../src/entities/wardrobe/state.ts');
const { remotes } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const body = document.querySelector<HTMLElement>('.pause-body');
const card = document.querySelector<HTMLElement>('.pause-card')?.getBoundingClientRect();
const seen = [...remotes.keys()].map((peer) => partnerWearing(peer));
console.log(
  `PAUSE keys=${keys.join(',')} player=${query.get('player') ?? 1} mine=${JSON.stringify(wardrobe()?.wearing())} partners=${JSON.stringify(seen)} scroll=${body ? body.scrollHeight - body.clientHeight : -1} card=${card ? `${Math.round(card.top)}-${Math.round(card.bottom)}` : ''} focus=${(document.activeElement as HTMLElement | null)?.className ?? ''}`,
);
export {};
