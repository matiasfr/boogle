// npm run look -- --real --production --query 'uiTalk=1' --eval dev/look/evals/replay-pause-talk.ts --action dev/look/evals/replay-pause-bottom.ts --name pause-bottom
// needs: node .look/see-client.ts look --production (see replay-pause-talk.ts); landscape phone size, e.g. --size 844x390
// --action after replay-pause-talk.ts: inspect the bottom of landscape Pause without leaving the island.
const body = document.querySelector<HTMLElement>('.pause-body')!;
body.scrollTop = body.scrollHeight;
await new Promise((resolve) => setTimeout(resolve, 300));
const clip = body.getBoundingClientRect();
for (const act of ['more', 'leave']) {
  const button = body.querySelector<HTMLElement>(`[data-act="${act}"]`)!;
  const box = button.getBoundingClientRect();
  if (!button.checkVisibility() || box.top < clip.top || box.bottom > clip.bottom || box.bottom > innerHeight)
    throw new Error('Landscape Pause clips ' + act + ' after scrolling');
}
console.log('REPLAY PAUSE lower buttons visible at scrollTop=' + body.scrollTop);
export {};
