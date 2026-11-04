import type { Object3D } from 'three';
import { makeLabel } from '../../player/avatars.ts';

// Local child visual. The owner supplies text and forwards teardown; nothing is scheduled here.
export function createNameLabel(parent: Object3D) {
  let owner: Object3D | null = parent;
  let label: ReturnType<typeof makeLabel> | null = null;
  let text = '';
  let disposed = false;

  function clear() {
    const old = label;
    label = null;
    if (!old) return;
    old.removeFromParent();
    try {
      old.material.map?.dispose();
    } finally {
      old.material.dispose();
    }
  }

  return {
    setText(key: string, display = key): void {
      if (disposed || key === text) return;
      clear();
      label = makeLabel(display);
      owner!.add(label);
      text = key;
    },
    describe() {
      return { text, attached: !!label?.parent, disposed };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      owner = null;
      clear();
    },
  };
}

export type NameLabel = ReturnType<typeof createNameLabel>;
