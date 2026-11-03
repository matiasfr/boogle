// Opt-in only, including on the classic island. No module, meter or output change without a recognized tone.
const tone = new URLSearchParams(location.search).get('tone');
if (tone === 'neutral' || tone === 'agx' || tone === 'agx-sat' || tone === 'aces')
  void import('../proto/tone.ts').then(({ installTone }) => installTone(tone));
