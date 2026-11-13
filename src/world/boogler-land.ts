// The Boogler's terrain queries, injected by the live client or the server's pinned bake.
// No scenery, physics or rendering dependency belongs in his brain.
export type BooglerDisc = { x: number; z: number; r: number };
export type BooglerLand = {
  height(x: number, z: number): number;
  blocked(x: number, z: number, pad?: number): boolean;
  keepOut: readonly BooglerDisc[];
  mainland: { x: number; z: number; rx: number; rz: number };
};

/** Signed little-endian Int16 centimetres, ordered i*n+j on the shared world grid. */
export type BooglerLandBake = {
  n: number;
  heights: string;
  obstacles: [number, number, number][];
  keepOut: [number, number, number][];
  mainland: BooglerLand['mainland'];
};
