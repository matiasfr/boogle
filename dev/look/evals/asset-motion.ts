// Runs after the existing look harness starts its real-time video.
import type { AssetStage } from '../../../character/main.ts';
const frame = document.getElementById('asset-motion-stage') as HTMLIFrameElement;
const stage = (frame.contentWindow as Window & { assetStage: AssetStage }).assetStage;
const start = stage.motion.start();
if (start.motion === 'none') console.log('STAGE NONE ' + JSON.stringify(start));
else {
  const deadline = performance.now() + 90_000;
  const turning = new URL(frame.src).searchParams.get('diagnosticTurn') === '1';
  const originalCamera = stage.camera.position.clone();
  const originalRotation = stage.camera.quaternion.clone();
  const target = stage.controls.target.clone();
  const offset = originalCamera.clone().sub(target);
  const turnStarted = performance.now();
  const turnSamples: { frame: number; seconds: number; angle: number }[] = [];
  if (turning)
    console.log('STAGE CAMERA DIAGNOSTIC: 0.6 rad/s orbit, 50 ms polling, fixed light; camera smoothness unverified.');
  try {
    while (!stage.motion.result?.complete) {
      if (performance.now() > deadline) throw new Error('Stage motion did not complete');
      if (turning) {
        const seconds = (performance.now() - turnStarted) / 1000;
        const angle = seconds * 0.6;
        const c = Math.cos(angle),
          s = Math.sin(angle);
        stage.camera.position.set(
          target.x + offset.x * c + offset.z * s,
          originalCamera.y,
          target.z + offset.z * c - offset.x * s,
        );
        stage.camera.lookAt(target);
        turnSamples.push({ frame: stage.frames, seconds, angle });
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } finally {
    if (turning) {
      stage.camera.position.copy(originalCamera);
      stage.camera.quaternion.copy(originalRotation);
      for (const sample of turnSamples) console.log('STAGE CAMERA SAMPLE ' + JSON.stringify(sample));
    }
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
