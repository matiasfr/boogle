// Local panel choreography (rail.ts layPanel). Only the verified integer cursor commits track, collision and stock.
import type { RailwayInspection } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';

type Rail = typeof import('../../proto/place/rail.ts');
type Machine = ReturnType<Rail['buildMachine']>;
type Track = ReturnType<Rail['buildTrack']>;
export function createRailwayPanelView(
  machine: Machine,
  track: Track,
  state: () => RailwayInspection,
  head: () => number,
  contact: (end: number) => void,
  owner: OwnedView,
) {
  let returning = 1;
  const pose = (index: number, phase: number, stock = state().panelStock) =>
    machine.layPanel(track, index, phase, stock);
  machine.onPanelFrame = (dt) => {
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
  owner.cleanup(() => {
    machine.onPanelFrame = () => {};
  });
  return {
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
