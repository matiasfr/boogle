// One railway line as a minimal strip, drawn into a 2D canvas: its stops as dots spaced by their real distance, the
// laid track solid and the rest dashed, this stop ringed ("you are here"), and the train as a small marker at its live
// position. After the 1 November departures board prototype's line map (`?proto=board`, archived in 26270adb), which
// the owner preferred to a countdown (9 November: "a minimal and you could see the train representation there
// moving"). Each halt's board draws its own line; the Home station's big map will draw one strip per line.
// Pure canvas drawing: callers own the canvas, the texture and when to redraw.

export type LineStrip = {
  /** Stop positions along the line, in order, in any one unit (the trains' centimetres). */
  stops: readonly number[];
  /** Track is laid from the first stop up to here; beyond it shows dashed. */
  laid: number;
  /** Index of the stop this board stands at, ringed; null for none (a map of the whole network). */
  here: number | null;
  /** The train's live position, in the stops' unit; null draws no marker. */
  train: number | null;
  /** The train marker's colour. */
  color: string;
  /** Light the ring: the train's next stop is this one. */
  cue?: boolean;
};

const INK = '#f4efe2',
  DIM = '#4a505b',
  RING = '#c9452f';

/** The strip's left and right ends in a `w`-wide box at `x` (the dots sit inside a margin for the ring and marker). */
function ends(x: number, w: number, h: number) {
  const pad = Math.min(w * 0.15, h * 0.48);
  return [x + pad, x + w - pad] as const;
}

/** Where position `at` falls, in pixels, on a strip drawn into the `w` × `h` box at `x`. */
export function stripX(s: LineStrip, x: number, w: number, h: number, at: number) {
  const [a, b] = ends(x, w, h);
  const first = s.stops[0]!,
    last = s.stops[s.stops.length - 1]!;
  const f = last > first ? (at - first) / (last - first) : 0;
  return a + Math.max(0, Math.min(1, f)) * (b - a);
}

/** Draw `s` into the box (`x`, `y`, `w`, `h`) of `g`; the caller clears the box first. */
export function drawLineStrip(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: LineStrip) {
  const cy = y + h / 2,
    track = Math.max(3, h * 0.13),
    dot = h * 0.16,
    ring = h * 0.36;
  const px = (at: number) => stripX(s, x, w, h, at);
  const first = s.stops[0]!,
    last = s.stops[s.stops.length - 1]!,
    laid = Math.max(first, Math.min(last, s.laid));
  g.save();
  g.lineCap = 'round';
  g.lineWidth = track;
  // The unlaid stretch, dashed and dim.
  if (laid < last) {
    g.strokeStyle = DIM;
    g.setLineDash([track * 1.6, track * 1.8]);
    g.beginPath();
    g.moveTo(px(laid), cy);
    g.lineTo(px(last), cy);
    g.stroke();
    g.setLineDash([]);
  }
  // The laid track, solid.
  if (laid > first) {
    g.strokeStyle = INK;
    g.beginPath();
    g.moveTo(px(first), cy);
    g.lineTo(px(laid), cy);
    g.stroke();
  }
  // Stops: open ones bright, ones beyond the laid track dim.
  s.stops.forEach((at, k) => {
    g.fillStyle = at <= laid ? INK : DIM;
    g.beginPath();
    g.arc(px(at), cy, k === s.here ? dot * 1.25 : dot, 0, Math.PI * 2);
    g.fill();
  });
  // You are here: a red ring, filled faintly while the train is on its way in.
  if (s.here !== null) {
    const hx = px(s.stops[s.here]!);
    if (s.cue) {
      g.fillStyle = 'rgba(201, 69, 47, 0.45)';
      g.beginPath();
      g.arc(hx, cy, ring, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = RING;
    g.lineWidth = Math.max(2, h * 0.09);
    g.beginPath();
    g.arc(hx, cy, ring, 0, Math.PI * 2);
    g.stroke();
  }
  // The train: a rounded block with two windows, riding on the line.
  if (s.train !== null) {
    const tx = px(s.train),
      mw = h * 0.62,
      mh = h * 0.42;
    g.fillStyle = s.color;
    g.strokeStyle = '#16181d';
    g.lineWidth = Math.max(2, h * 0.04);
    g.beginPath();
    g.roundRect(tx - mw / 2, cy - mh / 2, mw, mh, mh * 0.3);
    g.fill();
    g.stroke();
    g.fillStyle = '#16181d';
    const win = mh * 0.32;
    g.fillRect(tx - mw * 0.3, cy - win * 0.9, win, win);
    g.fillRect(tx + mw * 0.3 - win, cy - win * 0.9, win, win);
  }
  g.restore();
}
