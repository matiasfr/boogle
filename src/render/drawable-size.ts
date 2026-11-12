// No GPU texture is ever sized to zero. A first load into a canvas with no box yet (a browser pane opened at 0x0, a
// hidden container) used to size the drawing buffer and the scene pass 0x0: WebGPU rejects the empty texture, every
// draw that uses it fails, and after 60 the game showed "The graphics stopped". scene.ts sizes the buffer from
// drawableBox() and holds the first scene frame until there is one; the canvas target keeps at least one device pixel
// whatever the pixel ratio (atLeastOneDevicePixel), and scaled screen targets (the scene pass at a lower
// resolution, water bloom's 1/64 level) go through clampTargetSize, since a scale floors a small size to 0.

/** The canvas's CSS box, or the window's when the canvas box isn't laid out; null while neither has an area. */
export function drawableBox(clientW: number, clientH: number, innerW: number, innerH: number) {
  const w = clientW > 1 ? clientW : innerW,
    h = clientH > 1 ? clientH : innerH;
  return w >= 1 && h >= 1 ? { w, h } : null;
}

/** A render target dimension: whole pixels, never under one. */
export const atLeastOnePixel = (n: number) => (n >= 1 ? Math.floor(n) : 1);

/** A canvas dimension in CSS pixels whose drawing buffer, floor(css * pixelRatio), is at least one pixel (a lowered
 * resolution's pixel ratio is under 1 on a 1x screen). */
export function atLeastOneDevicePixel(css: number, pixelRatio: number) {
  if (Math.floor(css * pixelRatio) >= 1) return css;
  const min = Math.ceil(1 / pixelRatio);
  return Math.floor(min * pixelRatio) >= 1 ? min : min + 1;
}

/** Every later resize of this target (three's own, on a resize, a resolution change or a new graphics setting) stays at
 * least 1x1. */
export function clampTargetSize(target: { setSize(width: number, height: number, depth?: number): unknown }) {
  const setSize = target.setSize.bind(target);
  target.setSize = (width, height, depth) => setSize(atLeastOnePixel(width), atLeastOnePixel(height), depth);
}
