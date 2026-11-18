// One still per scene (docs/plans/remote-device-tests.md, step 3): right after a scene's sample ends, the next frame that
// drew is copied from the game canvas into a 960 px wide 2D canvas, encoded as a JPEG at quality 0.7 and uploaded to
// POST /device/runs/<run id>/still/<scene> (server/src/device.ts; the run id is the credential). The copy is taken in
// the microtask after the game's render, before the browser presents the frame, as the report tool's screenshot does
// (src/debug/dev/report.ts). It never throws: the scene row records what happened (`still`). Local, debug only.
import { canvas, renderer } from '../../render/scene.ts';
import { nextFrame } from './frames.ts';

export type StillResult = 'ok' | 'unavailable' | 'offline' | `refused ${number}` | 'failed';
const WIDTH = 960;
const QUALITY = 0.7;
const MAX_BYTES = 400 * 1024; // the endpoint's cap
const TRIES = 10; // frames to wait for one that drew (a frame limit skips some)

// A copy that is one flat colour (an unreadable or cleared drawing buffer reads as transparent black) is no still.
function blank(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const px = ctx.getImageData(0, 0, w, h).data;
  const stride = 4 * 997;
  for (let i = stride; i < px.length; i += stride) for (let c = 0; c < 4; c++) if (px[i + c] !== px[c]) return false;
  return true;
}

async function copyFrame(): Promise<HTMLCanvasElement | null> {
  for (let i = 0; i < TRIES; i++) {
    await nextFrame(); // resumes in the microtask after this frame's render
    if (renderer.info.render.drawCalls <= 0 || !canvas.width) continue;
    const out = document.createElement('canvas');
    out.width = WIDTH;
    out.height = Math.max(1, Math.round((canvas.height / canvas.width) * WIDTH));
    const ctx = out.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    return blank(ctx, out.width, out.height) ? null : out;
  }
  return null;
}

/** Copies, encodes and uploads this scene's still. */
export async function sendStill(runId: string, scene: string): Promise<StillResult> {
  const server = import.meta.env.VITE_BOOGLE_SERVER;
  if (!server) return 'offline';
  let blob: Blob | null = null;
  try {
    const frame = await copyFrame();
    if (frame) blob = await new Promise<Blob | null>((r) => frame.toBlob(r, 'image/jpeg', QUALITY));
  } catch {
    blob = null; // a tainted or lost canvas
  }
  if (!blob || !blob.size || blob.size > MAX_BYTES) return 'unavailable';
  try {
    const r = await fetch(new URL(`/device/runs/${runId}/still/${encodeURIComponent(scene)}`, server), {
      method: 'POST',
      headers: { 'content-type': 'image/jpeg' },
      body: blob,
      signal: AbortSignal.timeout(20_000),
    });
    return r.ok ? 'ok' : `refused ${r.status}`;
  } catch {
    return 'failed';
  }
}
