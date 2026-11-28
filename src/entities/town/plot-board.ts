import type { SignBoard } from '../../render/sign-board.ts';

// Placeholder words for The Boogler; icons and counts follow the depot boards. Paint only: instantiate owns signs.
export function paintBoard({ g, cw, ch }: Pick<SignBoard, 'g' | 'cw' | 'ch'>, lines: readonly string[]) {
  g.fillStyle = '#493522';
  g.fillRect(0, 0, cw, ch);
  g.strokeStyle = '#edcf8c';
  g.lineWidth = ch * 0.025;
  g.strokeRect(ch * 0.04, ch * 0.04, cw - ch * 0.08, ch - ch * 0.08);
  if (lines.length === 4) {
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.font = `900 ${ch * 0.19}px Figtree, system-ui, sans-serif`;
    for (let i = 0; i < lines.length; i++) {
      const y = ch * (0.15 + i * 0.235);
      g.fillStyle = i === 1 ? '#edcf8c' : '#fff5dc';
      g.fillText(lines[i]!, cw * 0.18, y, cw * 0.77);
      if (i === 1 && lines[1] === 'Every train') {
        // The rack's grooved footing silhouette, in the same place as the house's rider.
        g.fillRect(cw * 0.065, y - ch * 0.025, cw * 0.07, ch * 0.075);
        g.fillRect(cw * 0.065, y - ch * 0.055, cw * 0.025, ch * 0.04);
        g.fillRect(cw * 0.11, y - ch * 0.055, cw * 0.025, ch * 0.04);
      } else if (i === 1) {
        // one rider silhouette, no font-dependent icon
        g.beginPath();
        g.arc(cw * 0.1, y - ch * 0.04, ch * 0.035, 0, Math.PI * 2);
        g.fill();
        g.fillRect(cw * 0.1 - ch * 0.035, y + ch * 0.005, ch * 0.07, ch * 0.065);
      } else if (i > 1) {
        g.beginPath();
        g.arc(cw * 0.1, y, ch * 0.045, 0, Math.PI * 2);
        g.stroke();
      }
    }
    return;
  }
  const timberOnly = lines.length === 2;
  g.fillStyle = '#fff5dc';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 ${ch * (timberOnly ? 0.3 : 0.24)}px Figtree, system-ui, sans-serif`;
  g.fillText(lines[0]!, cw / 2, ch * (timberOnly ? 0.28 : 0.2));
  lines.slice(1).forEach((line, i) => {
    const y = ch * (timberOnly ? 0.7 : i === 0 ? 0.51 : 0.8),
      r = ch * 0.055;
    g.fillStyle = i === 0 ? '#eac28a' : '#a9b9c1';
    if (i === 0) {
      for (const [x, dy] of [
        [cw * 0.1, r],
        [cw * 0.1 + r * 2.1, r],
        [cw * 0.1 + r, -r],
      ]) {
        g.beginPath();
        g.arc(x!, y + dy!, r, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.beginPath();
      g.moveTo(cw * 0.08, y + r);
      g.lineTo(cw * 0.09, y - r);
      g.lineTo(cw * 0.15, y - r * 1.4);
      g.lineTo(cw * 0.18, y + r);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#fff5dc';
    g.textAlign = 'left';
    g.font = `900 ${ch * (timberOnly ? 0.26 : 0.22)}px Figtree, system-ui, sans-serif`;
    g.fillText(line, cw * 0.23, y, cw * 0.71);
  });
}
