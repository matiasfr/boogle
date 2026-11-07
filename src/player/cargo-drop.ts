// One control declaration shared by the mutually exclusive place and railway owners.
import { registerAction } from './controls.ts';

let activeDrop: (() => boolean) | null = null;
let installed = false;

export function bindCargoDrop(drop: () => boolean) {
  if (!installed) {
    installed = true;
    registerAction('place-drop', {
      pad: 'r3',
      keys: ['Mouse2'],
      mouse: 2,
      label: 'Drop one thing off your back',
      touch: { label: 'Drop', className: 'place-drop-btn' },
      group: 'hands',
      order: 3,
      down: () => {
        activeDrop?.();
      },
    });
  }
  activeDrop = drop;
  return () => {
    if (activeDrop === drop) activeDrop = null;
  };
}
