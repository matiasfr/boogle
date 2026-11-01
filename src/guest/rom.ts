// The guest's animations and the guest's and the dino's textures come from the player's own ROM (native/guest/README.md
// says which); Boogle never ships them. A picked or dropped ROM is checked, those pieces are cut out of it, and
// src/decomp/store.ts keeps them so later visits need no ROM.
import { TEXTURES } from './textures.ts';

export const ROM_SHA1 = '9bef1128717f958171a4afac3ed78ee2bb4e86ce';
export const ROM_EXT = ['.z64', '.n64', '.v64']; // big-endian, word-swapped, byte-swapped
const ROM_SIZE = 8 * 1024 * 1024;
const ANIMS_AT = 0x4ec000;

const be32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

// .z64 is big-endian; .v64 swaps each 16-bit word and .n64 each 32-bit word.
export function toBigEndian(rom: Uint8Array) {
  const swap = (size: number) => {
    const out = new Uint8Array(rom.length);
    for (let i = 0; i < rom.length; i += size) for (let k = 0; k < size; k++) out[i + k] = rom[i + size - 1 - k];
    return out;
  };
  if (rom[0] === 0x37 && rom[1] === 0x80) return swap(2);
  if (rom[0] === 0x40 && rom[1] === 0x12) return swap(4);
  return rom;
}

export function mio0(src: Uint8Array, at: number) {
  const size = be32(src, at + 4);
  let comp = at + be32(src, at + 8),
    raw = at + be32(src, at + 12),
    layout = at + 16,
    bits = 0,
    word = 0,
    n = 0;
  const out = new Uint8Array(size);
  while (n < size) {
    if (bits === 0) {
      word = be32(src, layout);
      layout += 4;
      bits = 32;
    }
    const literal = word & 0x80000000;
    word = (word << 1) >>> 0;
    bits--;
    if (literal) {
      out[n++] = src[raw++];
    } else {
      const v = (src[comp] << 8) | src[comp + 1];
      comp += 2;
      const back = (v & 0xfff) + 1;
      for (let k = (v >> 12) + 3; k > 0 && n < size; k--, n++) out[n] = out[n - back];
    }
  }
  return out;
}

async function sha1(bytes: Uint8Array) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes as Uint8Array<ArrayBuffer>));
  return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// { anims, textures } from a ROM file, or null when it is not the one release that matches ROM_SHA1. `textures` holds every entry of TEXTURES
// back to back, in order.
/** What the game keeps from a ROM (src/decomp/store.ts). */
export type RomPieces = { anims: Uint8Array; textures: Uint8Array };
export async function readRom(file: Blob): Promise<RomPieces | null> {
  const rom = toBigEndian(new Uint8Array(await file.arrayBuffer()));
  if (rom.length !== ROM_SIZE || (await sha1(rom)) !== ROM_SHA1) return null;
  const count = be32(rom, ANIMS_AT);
  let end = 0;
  for (let i = 0; i < count; i++)
    end = Math.max(end, be32(rom, ANIMS_AT + 8 + i * 8) + be32(rom, ANIMS_AT + 12 + i * 8));
  const blocks = new Map<number, Uint8Array>();
  const textures = new Uint8Array(TEXTURES.reduce((n, t) => n + t.w * t.h * 2, 0));
  let n = 0;
  for (const t of TEXTURES) {
    if (!blocks.has(t.block)) blocks.set(t.block, mio0(rom, t.block));
    textures.set(blocks.get(t.block)!.subarray(t.at, t.at + t.w * t.h * 2), n);
    n += t.w * t.h * 2;
  }
  return { anims: rom.slice(ANIMS_AT, ANIMS_AT + end), textures };
}
