// Local playtest bookmark: no world change, typed note or on-screen acknowledgement.
import { registerAction } from '../../player/controls.ts';
import { me } from '../../player/player.ts';
import { carry } from '../../physics/platforms.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { hookActivity, playMark } from '../mark.ts';
import { back } from './chop.ts';

registerAction('place-flag', {
  key: 'KeyM',
  pad: 'right',
  label: 'Flag',
  group: 'menu',
  down: () => {
    if (!me.entered || !me.body) return;
    const p = me.body.position;
    const moving = me.wish.lengthSq() > 0;
    const loaded = me.holding || back.logs + back.rails + back.stone > 0 || back.big !== null;
    playMark('flag', {
      y: Math.round(p.y * 10) / 10,
      activity:
        hookActivity() ??
        (carry.on ? 'riding' : me.swimming ? 'swimming' : loaded ? 'carrying' : moving ? 'walking' : 'idle'),
      logs: back.logs,
      rails: back.rails,
      stone: back.stone,
      big: back.big,
      ridden: carry.on ? (carry.on.id ?? 'unnamed platform') : null,
    });
    uiSound('tick');
  },
});
