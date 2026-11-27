export function stockGlyphs(g: CanvasRenderingContext2D) {
  const logs = (x: number, y: number, r: number) => {
    for (const [dx, dy] of [
      [-1, -0.83],
      [1, -0.83],
      [0, 0.83],
    ]) {
      g.fillStyle = '#eac28a';
      g.beginPath();
      g.arc(x + dx! * r, y + dy! * r, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#956636';
      g.lineWidth = r / 6;
      g.stroke();
    }
  };
  const rails = (x: number, y: number, length: number, width: number, gap: number, across = false) => {
    g.strokeStyle = '#a3cee2';
    g.lineWidth = width;
    for (const o of [-gap / 2, gap / 2]) {
      g.beginPath();
      if (across) {
        g.moveTo(x - length / 2, y + o);
        g.lineTo(x + length / 2, y + o);
      } else {
        g.moveTo(x + o, y - length / 2);
        g.lineTo(x + o, y + length / 2);
      }
      g.stroke();
    }
  };
  return { logs, rails };
}
