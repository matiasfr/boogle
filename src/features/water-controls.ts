// One swim-down action for keyboard, pad and touch; the player controller owns its force.
import './water-controls.css';
import { defineKind, spawn } from '../entity/entity.ts';
import { onStart } from '../loop.ts';
import { actionById, registerAction } from '../player/controls.ts';
import { inputState } from '../player/input-state.ts';
import { modalOpen } from '../player/modal.ts';
import { me } from '../player/state.ts';
import { releaseDive, waterIntent } from '../player/water-intent.ts';
import { protoOn } from '../proto/flags.ts';
import { newWaterEnabled } from '../render/water/flags.ts';

defineKind('water-controls', { prePhysics: -10, lateUpdate: 10 });
if (newWaterEnabled || protoOn('water')) {
  waterIntent.enabled = true;
  const available = () =>
    me.entered && me.swimming && !me.down && !inputState.held && !inputState.seated && !modalOpen() && !document.hidden;
  onStart(() => {
    registerAction('water-dive', {
      pad: 'right',
      key: 'KeyC',
      touch: { label: 'Dive', className: 'water-dive' },
      label: 'Swim down',
      detail: 'Hold to swim down; release to rise. Jump swims up.',
      group: 'move',
      context: 'swimming',
      down: () => {
        if (available()) waterIntent.diving = true;
      },
      up: releaseDive,
    });
    const button = actionById('water-dive')?.button;
    if (button) {
      button.hidden = true;
      // Keep a held finger's release even when it drifts beyond the button.
      button.addEventListener('pointerdown', (event) => {
        if (event.isTrusted) button.setPointerCapture(event.pointerId);
      });
      button.addEventListener('lostpointercapture', releaseDive);
    }
    addEventListener('blur', releaseDive);
    document.addEventListener('visibilitychange', releaseDive);
    spawn({
      kind: 'water-controls',
      prePhysics() {
        if (!available()) releaseDive();
      },
      lateUpdate() {
        const visible = available();
        if (!visible) releaseDive();
        if (button) button.hidden = !visible;
      },
    });
  });
}
