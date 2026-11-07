// Local panel choreography (rail.ts layPanel). Only the verified integer cursor commits track, collision and stock.
import type { OwnedView } from '../../render/owned-view.ts';

type Rail = typeof import('../../proto/place/rail.ts');
type Machine = ReturnType<Rail['buildMachine']>;
type Track = ReturnType<Rail['buildTrack']>;
/** The accepted facts one line's panel choreography reads: line one's inspection, or line two's projection. */
export type PanelState = { phase: string; activeStation: number; panelStock: number; panelCount: number };
export function createRailwayPanelView(
  machine: Machine,
  track: Track,
  state: () => PanelState,
  head: () => number,
  contact: (end: number) => void,
  owner: OwnedView,
) {
  let returning = 1;
  const pose = (index: number, phase: number, stock = state().panelStock) =>
    machine.layPanel(track, index, phase, stock);
  const frame = (dt: number) => {
    const current = state(),
      index = track.cursor,
      panel = track.panels[index];
    const active = current.phase === 'laying' && panel?.stage === current.activeStation && current.panelStock > 0;
    machine.panelRack(
      track.panels.slice(index).map((p) => p.to - p.from),
      active,
    );
    if (active) {
      returning = 0;
      // Hold the payload just above contact until accepted time reaches this panel's boundary.
      const phase = Math.max(0, Math.min(0.98, (track.u(head()) - panel.from) / (panel.to - panel.from)));
      pose(index, phase);
    } else {
      returning = Math.min(1, returning + dt / 0.65);
      machine.layHome(returning, current.panelStock);
    }
  };
  machine.onPanelFrame = frame;
  owner.cleanup(() => {
    machine.onPanelFrame = () => {};
  });
  return {
    /** The owner hands the machine's panel frame to whichever line it is working. */
    frame,
    restore() {
      const count = state().panelCount;
      track.snapTo(count ? track.panels[count - 1]!.to : track.panels[0]!.from);
      machine.setRack(state().panelStock);
      returning = 1;
    },
    update(dt: number) {
      while (track.cursor < state().panelCount) {
        const index = track.cursor,
          panel = track.panels[index]!;
        pose(index, 1, state().panelStock + state().panelCount - index);
        track.layTo(panel.to);
        contact(panel.end);
      }
      machine.setRack(state().panelStock);
      track.update(dt);
    },
  };
}
