// The garage's Steel car tile (docs/plans/fourth-car.md, V2): the action half of garage-open.ts. Hands the camera back
// to the garage, opens Cargo, waits, then picks the Steel car as a click on its tile does, and prints what the garage
// says about it.
//   npm run look -- --rail-seed boiler-long --hud --eval dev/look/evals/garage-open.ts \
//     --action dev/look/evals/steel-car-garage.ts --name cargo-after      (`steel-home` for before; `--size 440x796`)
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
window.__debugCam?.clear();
const api = garage.api!;
api.choose('cargo');
await wait(700);
api.choose('cargo', 'steelcar');
await wait(300);
const snap = api.snap();
const tiles = [...document.querySelectorAll<HTMLElement>('.garage-ui *')]
  .filter((e) => e.children.length === 0 && e.innerText.trim())
  .map((e) => e.innerText.trim());
console.log(`GARAGE cargo: chosen ${snap.cat}/${snap.sel}; text ${JSON.stringify(tiles)}`);
export {};
