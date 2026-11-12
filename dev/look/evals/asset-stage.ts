// driven by: node dev/look/asset-motion.ts <asset> (it supplies this as --eval with --query stage=<encoded stage>; the /character/ stage, not the game)
// Existing look/broker setup: mount the real same-origin stage, never another browser.
import type { AssetStage } from '../../../character/main.ts';
const query = new URLSearchParams(location.search).get('stage');
if (!query) throw new Error('Missing encoded stage query');
const frame = document.createElement('iframe');
frame.id = 'asset-motion-stage';
frame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647;background:white';
frame.src = '/character/?' + query;
document.body.append(frame);
const until = performance.now() + 60_000;
let stage: AssetStage | undefined;
while (!stage?.ready) {
  if (performance.now() > until) throw new Error('Stage readiness timed out');
  await new Promise((resolve) => setTimeout(resolve, 100));
  stage = (frame.contentWindow as (Window & { assetStage?: AssetStage }) | null)?.assetStage;
}
if (stage.gfx !== 'webgpu') throw new Error('Stage is not WebGPU');
const requested = new URLSearchParams(query);
if (stage.state.asset !== requested.get('asset')) throw new Error('Stage fell back from the requested asset');
if (requested.has('clip') && stage.state.clip !== requested.get('clip'))
  throw new Error('Stage fell back from the requested clip');
const style = frame.contentDocument!.createElement('style');
style.textContent =
  'body{display:block!important}#panel{display:none!important}#view{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}';
frame.contentDocument!.head.append(style);
const before = stage.frames;
await new Promise((resolve) => setTimeout(resolve, 300));
if (stage.frames <= before) throw new Error('Stage has no completed renders');
console.log('STAGE READY ' + JSON.stringify(stage.inspect()));
export {};
