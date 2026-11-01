// Cosmetic splashes and ripple rings (src/render/splash.js).
import { onFrame } from '../loop.ts';
import { updateSplash } from '../render/splash.js';
import { ball } from '../physics/ball.ts';
import { me } from '../player/player.ts';
import { remotes } from '../netplay/net.ts';

onFrame(({ dt, elapsed }) => updateSplash(dt, elapsed, ball, me, remotes), { order: 10 });
