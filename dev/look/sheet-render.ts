// Compose existing evidence in the look harness's canvas; no second browser or image dependency.
import fs from 'node:fs';

export type Tile = { label: string; image?: string; note?: string };
export type Board = {
  title: string;
  subtitle: string;
  notices: string[];
  columns: number;
  tiles: Tile[];
  strips: Tile[];
};

export function composition(board: Board) {
  const embed = (tile: Tile) => ({
    ...tile,
    image: tile.image ? 'data:image/png;base64,' + fs.readFileSync(tile.image).toString('base64') : undefined,
  });
  return `await (${paint.toString()})(${JSON.stringify({ ...board, tiles: board.tiles.map(embed), strips: board.strips.map(embed) })});\nexport {};\n`;
}

async function paint(board: Board) {
  const width = 1080,
    pad = 24,
    gap = 12;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const wrap = (text: string, size: number, max: number) => {
    ctx.font = `${size}px system-ui`;
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      if (line && ctx.measureText(line + ' ' + word).width > max) {
        lines.push(line);
        line = '';
      }
      line += (line ? ' ' : '') + word;
    }
    return [...lines, line];
  };
  const images = new Map<Tile, HTMLImageElement>();
  for (const tile of [...board.tiles, ...board.strips]) {
    if (!tile.image) continue;
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Cannot decode sheet image: ' + tile.label));
      image.src = tile.image!;
    });
    images.set(tile, image);
  }
  const notices = board.notices.flatMap((text) => wrap(text, 22, width - pad * 2));
  const top = 150 + notices.length * 28;
  const tileWidth = (width - 2 * pad - (board.columns - 1) * gap) / board.columns;
  const tileHeight = tileWidth * 0.625 + 94;
  const stripHeight = (tile: Tile) => {
    const im = images.get(tile);
    return 100 + (im ? ((width - 2 * pad) * im.height) / im.width : 90);
  };
  canvas.width = width;
  canvas.height = Math.ceil(
    top +
      Math.ceil(board.tiles.length / board.columns) * tileHeight +
      board.strips.reduce((n, t) => n + stripHeight(t), 0) +
      pad,
  );
  ctx.fillStyle = '#15202b';
  ctx.fillRect(0, 0, width, canvas.height);
  const text = (line: string, x: number, y: number, size = 22, color = '#eaf0f6') => {
    ctx.font = `${size}px system-ui`;
    ctx.fillStyle = color;
    ctx.fillText(line, x, y);
  };
  text(board.title, pad, 42, 32);
  text(board.subtitle, pad, 76, 20);
  text(
    'Human evidence only — cannot judge feel, sound, real-time motion or first-time understanding.',
    pad,
    109,
    20,
    '#ffd18a',
  );
  notices.forEach((line, i) => text(line, pad, 145 + i * 28, 22, '#ffd18a'));
  const draw = (tile: Tile, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#233443';
    ctx.fillRect(x, y, w, h - gap);
    wrap(tile.label, 22, w - 16).forEach((line, i) => text(line, x + 8, y + 27 + i * 26));
    const im = images.get(tile);
    if (im) {
      if (tile.note) text(tile.note, x + 8, y + 70, 14, '#ffd18a');
      const scale = Math.min(w / im.width, (h - 88) / im.height);
      ctx.drawImage(im, x + (w - im.width * scale) / 2, y + 78, im.width * scale, im.height * scale);
    } else
      wrap(tile.note ?? 'NOT CAPTURED', 21, w - 20).forEach((line, i) =>
        text(line, x + 10, y + 94 + i * 26, 21, '#ffbaaf'),
      );
  };
  board.tiles.forEach((tile, i) =>
    draw(
      tile,
      pad + (i % board.columns) * (tileWidth + gap),
      top + Math.floor(i / board.columns) * tileHeight,
      tileWidth,
      tileHeight,
    ),
  );
  let y = top + Math.ceil(board.tiles.length / board.columns) * tileHeight;
  for (const strip of board.strips) {
    const h = stripHeight(strip);
    draw(strip, pad, y, width - pad * 2, h);
    y += h;
  }
  // The harness's incidental stills show the composition, not its unused game camera.
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;background:#15202b;z-index:2147483647';
  document.body.append(canvas);
  const data = canvas.toDataURL('image/png').split(',')[1]!;
  console.log('SHEET LENGTH ' + data.length);
  for (let i = 0; i < data.length; i += 16000) console.log('SHEET PNG ' + data.slice(i, i + 16000));
}
