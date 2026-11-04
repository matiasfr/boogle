// Decode captures off the room-host thread. The caller admits only one upload/worker at a time.
import { parentPort, workerData } from 'node:worker_threads';
import { PNG } from 'pngjs';
import { inflateSync } from 'node:zlib';

try {
  for (const value of workerData as Uint8Array[]) {
    const bytes = Buffer.from(value);
    if (
      bytes.length < 33 ||
      !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.readUInt32BE(8) !== 13 ||
      bytes.toString('ascii', 12, 16) !== 'IHDR'
    )
      throw new Error('Invalid PNG header');
    const width = bytes.readUInt32BE(16),
      height = bytes.readUInt32BE(20);
    if (
      !width ||
      !height ||
      width > 2048 ||
      height > 2048 ||
      width * height > 2 * 1024 * 1024 ||
      bytes[24] !== 8 ||
      bytes[28] !== 0
    )
      throw new Error('Use non-interlaced 8-bit PNGs, at most 2 megapixels and 2048 pixels per side');
    const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[bytes[25]!];
    if (!channels) throw new Error('Invalid PNG color type');
    const chunks: Buffer[] = [];
    for (let at = 8; at < bytes.length;) {
      if (at + 12 > bytes.length) throw new Error('Truncated PNG chunk');
      const size = bytes.readUInt32BE(at);
      if (at + size + 12 > bytes.length) throw new Error('Truncated PNG chunk');
      if (bytes.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(bytes.subarray(at + 8, at + 8 + size));
      at += size + 12;
    }
    const expected = height * (width * channels + 1);
    if (inflateSync(Buffer.concat(chunks), { maxOutputLength: expected + 1 }).length !== expected)
      throw new Error('PNG pixel stream has the wrong length');
    const decoded = PNG.sync.read(bytes); // CRC, chunks, zlib stream and pixels must all decode.
    if (decoded.width !== width || decoded.height !== height || decoded.data.length !== width * height * 4)
      throw new Error('Invalid PNG pixels');
  }
  parentPort!.postMessage(null);
} catch (error) {
  parentPort!.postMessage(error instanceof Error ? error.message : 'Invalid PNG');
}
