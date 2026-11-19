// npm run look -- --rail-seed house-built --eval dev/look/evals/first-house.ts --action dev/look/evals/first-house-talk.ts --query house=talk --hud --warm 4 --seconds 3 --frames 2 --size 1200x750 --name fh-talk --wall 300
// With dev/look/evals/first-house.ts --query house=talk: a real Interact press on the driver's Talk, then what the card
// says. Called after warm-up.
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
if (interactTarget()?.id !== 'place-talk-driver') throw new Error(`wrong target: ${interactTarget()?.id}`);
triggerAction('interact', 'down');
setTimeout(() => triggerAction('interact', 'up'), 120);
setTimeout(
  () =>
    console.log(
      'FIRST HOUSE talk',
      JSON.stringify({
        name: document.querySelector('.place-talk-name')?.textContent,
        say: document.querySelector('.place-talk-say')?.textContent,
        options: [...document.querySelectorAll('.place-talk-opts button')].map((b) => b.textContent),
      }),
    ),
  2500,
);
export {};
