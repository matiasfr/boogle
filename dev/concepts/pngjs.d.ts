// The slice of pngjs that generate.ts uses (pngjs ships no types; this saves a dependency on @types/pngjs).
declare module 'pngjs' {
  export class PNG {
    constructor(opts: { width: number; height: number });
    width: number;
    height: number;
    data: Buffer;
    static sync: { read(buf: Buffer): PNG; write(png: PNG): Buffer };
  }
}
