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
  reference?: Tile;
  grid?: { rows: string[]; columns: string[]; baseline: string; legend?: string };
};

export function composition(board: Board) {
  const embed = (tile: Tile) => ({
    ...tile,
    image: tile.image ? 'data:image/png;base64,' + fs.readFileSync(tile.image).toString('base64') : undefined,
  });
  return `await (${paint.toString()})(${JSON.stringify({ ...board, tiles: board.tiles.map(embed), strips: board.strips.map(embed) })});\nexport {};\n`;
}

/** Frozen comparisons retain every source pixel; wedges use matched rows/columns. */
export async function paintNative(board: Board, name = 'board.png') {
  const images = await Promise.all(
    board.tiles.map(async (tile) => {
      const im = new Image();
      im.src = tile.image!;
      await im.decode();
      return im;
    }),
  );
  const columnWidth = Math.max(480, ...images.map((im) => im.width)) + 32;
  let reference: HTMLImageElement | undefined;
  if (board.reference?.image) {
    reference = new Image();
    reference.src = board.reference.image;
    await reference.decode();
  }
  const emit = (canvas: HTMLCanvasElement) => {
    const data = canvas.toDataURL('image/png').split(',')[1]!;
    console.log(`SHOTS BEGIN ${name} ${data.length}`);
    for (let i = 0; i < data.length; i += 16000) console.log('SHOTS DATA ' + data.slice(i, i + 16000));
    console.log('SHOTS END');
  };
  if (board.grid) {
    const grid = board.grid;
    if (images.length !== grid.rows.length * grid.columns.length || !images.length)
      throw new Error('Grid axes must match the captured cells');
    const w = images[0]!.width,
      h = images[0]!.height;
    if (images.some((im) => im.width !== w || im.height !== h))
      throw new Error('Grid cells must have equal dimensions');
    const pad = 24,
      gap = 20,
      caption = 40,
      left = 176,
      top = 160;
    const gridWidth = grid.columns.length * (w + gap) - gap;
    const referenceX = left + gridWidth + 48;
    const canvas = document.createElement('canvas');
    canvas.width = reference ? referenceX + w + pad : left + gridWidth + pad;
    canvas.height = top + grid.rows.length * (h + caption + gap) + pad;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#15202b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#eaf0f6';
    ctx.font = '32px system-ui';
    ctx.fillText(board.title, pad, 42);
    ctx.font = '24px system-ui';
    if (grid.legend) ctx.fillText(grid.legend, pad, 80);
    ctx.fillStyle = '#a7bacb';
    ctx.fillText('Native pixels · full settings in manifest.json · frozen stills only', pad, 112);
    ctx.fillStyle = '#eaf0f6';
    ctx.font = '30px system-ui';
    ctx.textAlign = 'center';
    grid.columns.forEach((label, col) => ctx.fillText(label, left + col * (w + gap) + w / 2, top - 16));
    grid.rows.forEach((label, row) => {
      ctx.textAlign = 'right';
      ctx.fillText(label, left - 20, top + row * (h + caption + gap) + h / 2);
    });
    images.forEach((im, i) => {
      const x = left + (i % grid.columns.length) * (w + gap);
      const y = top + Math.floor(i / grid.columns.length) * (h + caption + gap);
      ctx.drawImage(im, x, y);
      if (board.tiles[i]!.label === grid.baseline) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 6;
        ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
      }
      ctx.textAlign = 'center';
      ctx.fillText(board.tiles[i]!.label, x + w / 2, y + h + 32);
    });
    if (reference) {
      const y = top + Math.floor(grid.rows.length / 2) * (h + caption + gap);
      ctx.textAlign = 'left';
      ctx.fillText('Reference', referenceX, y - 16);
      // Fit the same cell-sized viewport, once; matching-size captures remain at native scale.
      const scale = Math.min(w / reference.width, h / reference.height);
      ctx.drawImage(
        reference,
        referenceX + (w - reference.width * scale) / 2,
        y,
        reference.width * scale,
        reference.height * scale,
      );
      ctx.font = '22px system-ui';
      let line = '',
        lineY = y + h + 32;
      for (const word of board.reference!.label.split(/\s+/)) {
        if (ctx.measureText(line + ' ' + word).width > w && line) {
          ctx.fillText(line, referenceX, lineY);
          lineY += 28;
          line = '';
        }
        line += (line ? ' ' : '') + word;
      }
      ctx.fillText(line, referenceX, lineY);
    }
    emit(canvas);
    return;
  }
  const width = columnWidth * (reference ? 2 : 1);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  const ctx = canvas.getContext('2d')!;
  const font = Math.ceil(columnWidth / 24);
  const wrap = (value: string) => {
    ctx.font = `${font}px system-ui`;
    const lines = [''];
    for (const word of value.split(/\s+/)) {
      const i = lines.length - 1;
      if (ctx.measureText(lines[i] + ' ' + word).width > columnWidth - 32) lines.push(word);
      else lines[i] += (lines[i] ? ' ' : '') + word;
    }
    return lines;
  };
  const heading = [board.title, board.subtitle, ...board.notices].flatMap(wrap);
  const labels = board.tiles.map((tile) => [tile.label, tile.note ?? ''].flatMap(wrap));
  // Integer origins preserve the source pixels; fractional image placement would interpolate rows.
  const lineHeight = Math.ceil(font * 1.35);
  canvas.height = Math.ceil(
    32 +
      heading.length * lineHeight +
      images.reduce((n, im, i) => n + im.height + labels[i]!.length * lineHeight + 32, 0),
  );
  ctx.fillStyle = '#15202b';
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.font = `${font}px system-ui`;
  ctx.fillStyle = '#eaf0f6';
  let y = 16;
  const text = (line: string) => {
    y += lineHeight;
    ctx.fillText(line, 16, y);
  };
  heading.forEach(text);
  images.forEach((im, i) => {
    y += 16;
    labels[i]!.forEach(text);
    y += 8;
    ctx.drawImage(im, 16, y);
    if (reference) {
      ctx.fillText(board.reference!.label, columnWidth + 16, y - 8, columnWidth - 32);
      const scale = Math.min(1, (columnWidth - 32) / reference.width, im.height / reference.height);
      ctx.drawImage(reference, columnWidth + 16, y, reference.width * scale, reference.height * scale);
    }
    y += im.height + 8;
  });
  emit(canvas);
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
