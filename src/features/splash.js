// Cosmetic splashes and ripple rings (src/render/splash.js).
import { onFrame } from '../loop.js';
import { updateSplash } from '../render/splash.js';
import { ball } from '../physics/ball.js';
import { me } from '../player/player.js';
import { remotes } from '../netplay/net.ts';

onFrame(({ dt, elapsed }) => updateSplash(dt, elapsed, ball, me, remotes), { order: 10 });
