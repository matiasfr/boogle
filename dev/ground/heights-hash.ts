// Ground identity: raw height bytes, and each complete collision tile (heights, cell, position).
import { createHash } from 'node:crypto';
import { heights, terrainCollisionTiles } from '../../src/place/terrain.ts';
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
console.log('heights ' + hash(new Uint8Array(heights.buffer, heights.byteOffset, heights.byteLength)));
for (const [i, tile] of terrainCollisionTiles().entries()) console.log('tile ' + i + ' ' + hash(JSON.stringify(tile)));
