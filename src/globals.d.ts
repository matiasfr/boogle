// Globals the game puts on window.
import type * as THREE from 'three/webgpu';
import type { ball } from './entities/ball/state.ts';
import type { inspect } from './entity/inspect.ts';
import type { SyncHandle } from './features/debug-handle.ts';
import type { prof } from './loop.ts';
import type { net, remotes } from './netplay/net.ts';
import type { me } from './player/state.ts';
import type { camera, scene } from './render/scene.ts';

/**
 * The debug handle for the console and the look and scenario harness (src/main.ts). What's commonly read is typed. The
 * rest is a grab bag from the features' onStart hooks: new code asks `inspect()`, and a read moves over when someone
 * touches it (docs/agents/tests.md, "Tests", required by AGENTS.md).
 */
export interface BoogleHandle {
  /** The way to look at entities: every kind, its phases, entities, positions, state and cost (src/entity/inspect.ts). */
  inspect: typeof inspect;
  THREE: typeof THREE;
  scene: typeof scene;
  camera: typeof camera;
  me: typeof me;
  ball: typeof ball;
  net: typeof net;
  remotes: typeof remotes;
  // Added by features' onStart hooks (src/features/debug-handle.ts, prof.ts), so these are there once a page is in a room.
  sync: SyncHandle;
  prof: typeof prof;
  gfx: 'webgpu' | null;
  dev?: import('./debug/dev/types.ts').DevApi;
  [more: string]: any; // oxlint-disable-line typescript/no-explicit-any -- the grab bag, as above
}

declare global {
  interface Window {
    boogle: BoogleHandle;
    /** Critter state for scenarios (src/features/critter-*.ts). */
    __fish?: unknown;
    __gulls?: unknown;
    __feel?: unknown; // src/features/feel.ts tuning, for scenarios
    __carry?: unknown; // src/physics/platforms.ts tuning and state
    __warp?: { go(speed: number): void }; // dev/look/warp.ts, in the harness only
    __crossing?: unknown; // src/proto/crossing/index.ts (?proto=crossing) tuning and state
    __debugCam?: { set(pos: number[], look: number[], fov?: number): void; clear(): void }; // src/debug/debug-cam.ts
  }
}
export {};
