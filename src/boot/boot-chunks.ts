// The boot's lazy chunks, preloaded at once when the game's own modules are in (main.ts). Without it they arrive as a
// chain: the railway's view imports each of its parts only after the one before has loaded, about twenty round trips in
// a row, 12 s on a slow phone link (docs/research/cold-start.md). The build lists them in the page's
// `boogle-boot-chunks` meta tag (vite.config.ts); modulepreload fetches and compiles them but runs nothing, so every
// module still evaluates when, and in the order, its importer asks for it. No list (the dev server): nothing to do.
export function preloadBootChunks() {
  const list = document.querySelector('meta[name="boogle-boot-chunks"]')?.getAttribute('content');
  if (!list) return;
  for (const file of list.split(' ')) {
    const href = import.meta.env.BASE_URL + file; // the form Vite's own preloads use, so neither doubles the other
    if (document.querySelector(`link[href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.crossOrigin = '';
    link.setAttribute('href', href);
    document.head.append(link);
  }
}
