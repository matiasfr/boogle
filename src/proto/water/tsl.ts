// TSL, untyped, for this prototype's shaders: three's typings can't follow a node through swizzles and chains, and the
// surface is hundreds of them. Everything here is still checked when WGSL is built.
import * as tsl from 'three/tsl';

// oxlint-disable-next-line typescript/no-explicit-any
export type N = any;
// oxlint-disable-next-line typescript/no-explicit-any
export const TSL = tsl as unknown as Record<string, any>;
