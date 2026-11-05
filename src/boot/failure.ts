// The existing lobby failure route, also available when the game chunk never evaluated.
import { splashDone } from './splash.ts';
import { AssetDownloadError } from './asset-fetch.ts';
import { bootMark } from './timeline.ts';

export function bootFailed(error: unknown) {
  if (error instanceof AssetDownloadError) bootMark('world-failed');
  console.error('[boot] startup failed:', error);
  const sub = document.getElementById('lobby-sub');
  if (sub)
    sub.textContent =
      error instanceof AssetDownloadError
        ? error.message
        : "Boogle couldn't load the island. Please reload to try again.";
  document.getElementById('lobby')?.removeAttribute('hidden');
  const enter = document.getElementById('enter') as HTMLButtonElement | null;
  if (enter) {
    enter.textContent = "Couldn't load the island";
    enter.disabled = true;
  }
  splashDone(true);
}
