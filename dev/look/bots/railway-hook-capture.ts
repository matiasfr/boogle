// Reuse the production route and its ordinary input helpers; no restored progress or body relocation.
import { play, aimHook, hookTo, returnFromTower } from './railway.ts';
import { hideBotNotes as hideNotes, makeBot } from '../bot.ts';
import { background } from '../../../src/async.ts';
import { me, cam } from '../../../src/player/player.ts';
import { triggerAction } from '../../../src/player/controls.ts';
import { inspectRailway } from '../../../src/entities/railway/state.ts';

const shot = window as Window & { __railStop?: string; __placeDone?: boolean };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let started = false;
export function start() {
  if (started) return;
  started = true;
  const url = new URL(location.href),
    mode = url.searchParams.get('hookCapture') ?? 'sequence',
    beat = mode === 'summit' ? 'needle bell summit' : mode === 'before' ? 'Q2 laid' : 'hook taken';
  url.searchParams.set('railStop', beat);
  history.replaceState(null, '', url);
  background(play(), 'played hook capture');
  background(
    (async () => {
      if (url.searchParams.get('player') === '2') {
        // The helper waits at the quarry gate rather than visiting the leader's tower checkpoint.
        while (!inspectRailway()?.hookShot.owned) await wait(100);
        window.__debugCam!.set([1018, 35, 25], [1000, 32, 5], 65);
        hideNotes();
        shot.__placeDone = true;
        return;
      }
      while (!shot.__railStop) await wait(100);
      if (shot.__railStop !== beat) throw new Error(`Hook capture missed ${beat}`);
      if (mode === 'summit') window.__debugCam!.set([1040, 117, 3], [1014, 102.4, -6], 65);
      else if (mode === 'before') window.__debugCam!.set([1016, 30, 42], [1008, 62, -10], 65);
      else {
        window.__debugCam!.clear();
        aimHook('t1');
        if (mode === 'touch') {
          document.body.classList.remove('gamepad');
          document.body.classList.add('touch');
        } else if (mode === 'pad') {
          document.body.classList.remove('touch');
          document.body.classList.add('gamepad');
        }
      }
      hideNotes();
      await wait(600);
      console.log(`HOOK CAPTURE ready ${mode}: ${JSON.stringify(inspectRailway()?.hookShot)}`);
      shot.__placeDone = true;
    })(),
    'frame the played hook capture',
  );
}

let acted = false;
export function act() {
  if (acted) return;
  acted = true;
  background(
    (async () => {
      const bot = makeBot({
        recover: () => {
          throw new Error('Hook capture required recovery');
        },
      });
      hideNotes();
      console.log(`HOOK CAPTURE press ${performance.now()}`);
      await hookTo(bot, 't1');
      cam.yaw = me.yaw += Math.PI;
      cam.pitch = -0.1;
      await wait(250);
      if (inspectRailway()?.hookShot.pick) throw new Error('Denied capture still has a picked ring');
      const before = inspectRailway()!.hookShot.denied;
      console.log(`HOOK CAPTURE denied ${performance.now()}`);
      triggerAction('hook', 'down');
      triggerAction('hook', 'up');
      if (inspectRailway()!.hookShot.denied !== before + 1 || inspectRailway()!.hookShot.pulling)
        throw new Error('Denied capture moved or did not answer');
      await wait(400);
      console.log(`HOOK CAPTURE descent ${performance.now()}`);
      await returnFromTower(bot, ['t0']);
      if (inspectRailway()!.hookShot.chip) throw new Error('Hook chip remained after three pulls');
      console.log(`HOOK CAPTURE complete ${performance.now()}`);
    })(),
    'record hook press denial and descent',
  );
}
