// Focused regression requested for the P2 "recovery loop in water" (session mw9prlct, 7:30): one fall, one recovery.
// The traces are the swim-flag edges measured at (1004, 28) in the running game: a float bobs out of the swim
// threshold for about 0.07 s every 0.6 s, and a swim jump leaves it for about 0.43 s. No three.js or physics.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECOVER_S, stepWaterEpisode, waterEpisode, type WaterEdge } from '../src/proto/playdata/water-episode.ts';

const FRAME = 1000 / 60;
type Span = { ms: number; swimming: boolean; standing: boolean };

function play(spans: Span[]) {
  const e = waterEpisode();
  const edges: NonNullable<WaterEdge>[] = [];
  const starts: number[] = []; // the first frame of each span
  let t = 0;
  for (const s of spans) {
    starts.push(t);
    for (const end = t + s.ms; t < end; t += FRAME) {
      const edge = stepWaterEpisode(e, s.swimming, s.standing, t);
      if (edge) edges.push(edge);
    }
  }
  return Object.assign(edges, { starts });
}
const swim = (ms: number): Span => ({ ms, swimming: true, standing: false });
const air = (ms: number): Span => ({ ms, swimming: false, standing: false });
const stand = (ms: number): Span => ({ ms, swimming: false, standing: true });

test('a float that bobs across the swim threshold, then swim jumps, then a walk out: one fall, one recovery', () => {
  const spans: Span[] = [air(300)];
  for (let i = 0; i < 8; i++) spans.push(swim(470), air(70)); // passive bob, as measured
  for (let i = 0; i < 8; i++) spans.push(swim(70), air(430)); // jump presses every half second
  spans.push(swim(2000), stand(1000));
  const edges = play(spans);
  assert.deepEqual(
    edges.map((e) => e.kind),
    ['fell', 'recovered'],
  );
  const recovered = edges[1]!;
  assert.ok(recovered.kind === 'recovered');
  // Timed from the first moment on your feet, not from when the recorder was sure.
  const fellAt = edges.starts[1]!,
    stoodAt = edges.starts.at(-1)!;
  assert.equal(recovered.at, stoodAt);
  assert.equal(recovered.seconds, (stoodAt - fellAt) / 1000);
});

test('touching the bed between bobs is not getting out; standing for RECOVER_S is', () => {
  const touch = RECOVER_S * 1000 - 100;
  const edges = play([swim(500), stand(touch), swim(300), stand(touch), swim(300), stand(RECOVER_S * 1000 + 50)]);
  assert.deepEqual(
    edges.map((e) => e.kind),
    ['fell', 'recovered'],
  );
});

test('falling in again after getting out is a second fall', () => {
  const edges = play([swim(500), stand(800), air(200), swim(500), stand(800)]);
  assert.deepEqual(
    edges.map((e) => e.kind),
    ['fell', 'recovered', 'fell', 'recovered'],
  );
});
