// driven by: node dev/look/asset-motion.ts <asset> (it supplies this as --action with --real --video; its help lists asset, clip, pose and camera options)
// Runs after the existing look harness starts its real-time video.
import type { AssetStage } from '../../../character/main.ts';
const frame = document.getElementById('asset-motion-stage') as HTMLIFrameElement;
const stage = (frame.contentWindow as Window & { assetStage: AssetStage }).assetStage;
const start = stage.motion.start();
if (start.motion === 'none') console.log('STAGE NONE ' + JSON.stringify(start));
else {
  const deadline = performance.now() + 90_000;
  while (!stage.motion.result?.complete) {
    if (performance.now() > deadline) throw new Error('Stage motion did not complete');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  stage.setPlaying(false);
  // Browser console transport truncates large single messages. Keep each below 16 KiB and verify reassembly.
  const payload = JSON.stringify(stage.motion.result);
  const size = 16_000,
    count = Math.ceil(payload.length / size);
  console.log('STAGE DATA ' + JSON.stringify({ length: payload.length, count }));
  for (let i = 0; i < count; i++) console.log(`STAGE CHUNK ${i} ${payload.slice(i * size, (i + 1) * size)}`);
  console.log('STAGE END ' + count);
}
export {};
