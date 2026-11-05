// Retry only an explicit temporary HTTP failure. Successful loads have no timer or extra request.
// Shared by the WASM loader and service worker; never changes physics ownership or module URLs.
export const RETRY_DELAYS = [500, 1500] as const;

export function isChunkFetchError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
      error.message,
    )
  );
}

export async function fetchAsset(input: RequestInfo | URL): Promise<Response> {
  let response = await fetch(input);
  for (const delay of RETRY_DELAYS) {
    if (response.status !== 503) break;
    await response.body?.cancel();
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    response = await fetch(input, { cache: 'reload' });
  }
  return response;
}

export class AssetDownloadError extends Error {
  constructor(status: number) {
    super(`Boogle couldn't download its physics engine (HTTP ${status}). Please reload to try again.`);
    this.name = 'AssetDownloadError';
  }
}

// Called before instantiateStreaming: never compile an HTTP error page as WASM.
export async function fetchWasm(url: string): Promise<Response> {
  const response = await fetchAsset(url);
  if (!response.ok) throw new AssetDownloadError(response.status);
  return response;
}
