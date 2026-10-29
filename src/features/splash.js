// Cosmetic splashes and ripple rings (src/splash.js).
import { onFrame } from '../loop.js';
import { updateSplash } from '../splash.js';
import { ball } from '../ball.js';
import { me } from '../player.js';
import { remotes } from '../net.js';

onFrame(({ dt, elapsed }) => updateSplash(dt, elapsed, ball, me, remotes), { order: 10 });
