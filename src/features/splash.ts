// Cosmetic splashes and ripple rings (src/render/splash.ts).
import { onFrame } from '../loop.ts';
import { updateSplash } from '../render/splash.ts';
import { ball } from '../entities/ball/state.ts';
import { ballMesh } from '../entities/ball/view.ts';
import { me } from '../player/player.ts';
import { remotes } from '../netplay/net.ts';

onFrame(({ dt, elapsed }) => updateSplash(dt, elapsed, ballMesh.position, ball, me, remotes), { order: 10 });
