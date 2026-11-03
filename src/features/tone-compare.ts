// Opt-in only, including on the classic island. No module, meter or output change without a recognized tone.
import { newWaterEnabled } from '../render/water/flags.ts';
const tone = new URLSearchParams(location.search).get('tone');
if (!newWaterEnabled && (tone === 'neutral' || tone === 'agx' || tone === 'agx-sat' || tone === 'aces'))
  void import('../proto/tone.ts').then(({ installTone }) => installTone(tone));
