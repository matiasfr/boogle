// Two players on one railway: `BOOGLE_QUERY='proto=place&coop=1' npm run look -- --players 2 --eval dev/look/evals/place-coop.ts`.
// Player 1 wakes the machine; both say what they see. A start to copy for the two-player track; &player= tells them apart.
const q = new URLSearchParams(location.search);
const who = q.get('player');
const place = window.__place as {
  wake: () => void;
  run: { mode: string };
  s: { awake: boolean };
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
await wait(3000);
if (who === '1') place.wake();
void (async () => {
  for (let k = 0; k < 4; k++) {
    await wait(2500);
    console.log(
      `COOP player ${who}: awake ${place.s.awake}, machine ${place.run.mode}, others ${window.boogle.remotes.size}`,
    );
  }
})();
export {};
