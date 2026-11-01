// Cosmetic splashes and ripple rings (src/render/splash.ts).
import { onFrame } from '../loop.ts';
import { updateSplash } from '../render/splash.ts';
import { ball } from '../physics/ball.ts';
import { me } from '../player/player.ts';
import { remotes } from '../netplay/net.ts';

onFrame(({ dt, elapsed }) => updateSplash(dt, elapsed, ball, me, remotes), { order: 10 });
