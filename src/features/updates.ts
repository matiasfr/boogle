// Recover the running room when Pages and its host converge on the next release.
import { onStart } from '../loop.ts';
import { net, closeRoom } from '../netplay/net.ts';
import { watchRelease } from '../boot/release.ts';

onStart(() => watchRelease(closeRoom, () => net.error === 'elsewhere'));
