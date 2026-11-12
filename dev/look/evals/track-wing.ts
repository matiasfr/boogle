// The track machine's wing (?layer=wing; docs/brainstorms/track-layers-double.md) on the production entry, framed in
// the flatbed's own frame from a stage's accepted server save:
//   npm run look -- --rail-seed awake --query 'layer=wing&wingView=park' --eval dev/look/evals/track-wing.ts \
//     --until window.__wingReady --question "..."
// wingView: sheet (eye height, ~13 m off the front quarter on the down side), park, out, cross, side (far). Line 2's wing:
// a line-2 stage (`--rail-seed trains-on`). The model alone, its fold and both hands: /character/?asset=track-wing.
const q = new URLSearchParams(location.search);
const view = q.get('wingView') ?? 'sheet';
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let wing = scene.getObjectByName('wing');
for (let n = 0; !wing && n < 600; n++) {
  await wait(100);
  wing = scene.getObjectByName('wing');
}
if (!wing?.parent) throw new Error('track-wing: no wing in the scene (is &layer=wing in the query?)');
const flatbed = wing.parent;
const post = wing.getObjectByName('wing-post')!;
const mirror = wing.getObjectByName('wing-arm-mirror')!;
const camera = () => {
  // The post foot stands on the up rail's top: rail level in the flatbed's frame. The mirror's x scale is the side.
  const rail = post.position.y;
  const side = Math.sign(mirror.scale.x) || 1;
  const eyes: Record<string, [number, number, number]> = {
    sheet: [-side * 9.5, rail + 1.6, 9.5],
    park: [-side * 7, rail + 1.7, 7],
    out: [side * 11, rail + 1.7, 5],
    cross: [-side * 7, rail + 9, -7],
    side: [-side * 50, rail + 14, 2],
  };
  const eyeAt = eyes[view] ?? eyes.sheet!;
  const target: [number, number, number] =
    view === 'side'
      ? [side * 2.5, rail + 1.8, 0]
      : view === 'cross'
        ? [side * 1.5, rail, 9]
        : view === 'park' || view === 'out'
          ? [side * 2.5, rail + 2.4, 3]
          : [side * 2.5, rail + 2.2, 3.2];
  flatbed.updateWorldMatrix(true, false);
  const eye = flatbed.localToWorld(post.position.clone().set(...eyeAt));
  const look = flatbed.localToWorld(post.position.clone().set(...target));
  window.__debugCam!.set(
    [eye.x, eye.y, eye.z],
    [look.x, look.y, look.z],
    view === 'side' ? 20 : view === 'sheet' ? 38 : 55,
  );
  return side;
};
const side = camera();
setInterval(camera, 30);
const foot = post.getWorldPosition(post.position.clone());
console.log(
  'WING ' +
    JSON.stringify({
      view,
      side,
      post: [post.position.x, post.position.y, post.position.z].map((n) => +n.toFixed(2)),
      foot: [foot.x, foot.y, foot.z].map((n) => +n.toFixed(1)),
    }),
);
(window as unknown as { __wingReady: boolean }).__wingReady = true;
export {};
