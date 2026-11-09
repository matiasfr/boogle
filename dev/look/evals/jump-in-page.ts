// Diagnostic for docs/plans/playtest-jump-in.md step 7: open Pause → More and, when listed, the Jump in page (PAGE lines
// on the console). `pagewant=none` asserts More has no Jump in.
//   npm run look -- --query dev=1 --eval dev/look/evals/jump-in-page.ts --until window.__pageDone --hud --name jump-page
const { openPause } = (await import('/src/features/pause.ts' as string)) as {
  openPause: () => void;
};
const query = new URLSearchParams(location.search);
const wait = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = window as Window & { __pageDone?: boolean };
const until = performance.now() + 20000;
while (!document.querySelector('canvas') && performance.now() < until) await wait(100);
await wait(6000); // the room seed and the arrival line
openPause();
await wait();
document.querySelector<HTMLButtonElement>('[data-act="more"]')!.click();
await wait();
const buttons = [...document.querySelectorAll<HTMLButtonElement>('.pause-body button')];
const entry = buttons.find((b) => b.textContent?.trim() === 'Jump in');
console.log(`PAGE more: ${buttons.map((b) => b.textContent?.trim()).join(' | ')}`);
if (query.get('pagewant') === 'none') {
  if (entry) throw new Error('jump page: More lists Jump in without Dev');
} else {
  if (!entry) throw new Error('jump page: More has no Jump in');
  entry.click();
  await wait(800);
  const body = document.querySelector('.pause-body');
  console.log(`PAGE body: ${body?.textContent?.replace(/\s+/g, ' ').slice(0, 600)}`);
}
shot.__pageDone = true;
export {};
