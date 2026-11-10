// Crops the showroom sheet (dev/look/garage-showroom.ts) into its tiles and embeds them, with the Roundhouse context
// still, in docs/world/engine-garage-mock.html as WebP data URIs, so the page stays one self-contained file.
//   node dev/look/garage-mock-images.ts .look/garage-sheet-still.png .look/garage-roundhouse-b-still.png
import fs from 'node:fs';
import sharp from 'sharp';

const [sheet, roundhouse] = process.argv.slice(2);
if (!sheet || !roundhouse) throw new Error('Usage: garage-mock-images.ts <sheet.png> <roundhouse.png>');
// The sheet's tiles, in garage-showroom.ts's TILES order: three columns of 1280×720.
const TILES = [
  'engine-base',
  'engine-longGhost',
  'engine-long',
  'cars-base',
  'looks-base',
  'looks-roofGhost',
  'looks-roof',
  'looks-teal',
  'cargo-base',
  'cargo-wagon2Ghost',
  'cargo-wagon2',
  'whistle-base',
];
const W = 1280,
  H = 720;
const img: Record<string, string> = {};
const uri = (b: Buffer) => 'data:image/webp;base64,' + b.toString('base64');
for (const [k, name] of TILES.entries()) {
  const tile = sharp(sheet).extract({ left: (k % 3) * W, top: Math.floor(k / 3) * H, width: W, height: H });
  img[name] = uri(await tile.webp({ quality: 76, effort: 6 }).toBuffer());
}
img['roundhouse-b'] = uri(await sharp(roundhouse).resize(640, 360).webp({ quality: 68, effort: 6 }).toBuffer());

const page = 'docs/world/engine-garage-mock.html';
const html = fs.readFileSync(page, 'utf8');
const line = /^ {2}const IMG = .*;$/m;
if (!line.test(html)) throw new Error('No IMG line in ' + page);
const out = html.replace(line, () => '  const IMG = ' + JSON.stringify(img) + ';');
fs.writeFileSync(page, out);
console.log(`${page}: ${(Buffer.byteLength(out) / 1024).toFixed(0)} KB`);
