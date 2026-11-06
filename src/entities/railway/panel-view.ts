// Local panel choreography. Only the verified integer cursor commits track, collision and stock.
import * as THREE from 'three/webgpu';
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
  const rest = new THREE.Matrix4(),
    local = new THREE.Matrix4();
  const target = new THREE.Vector3(),
    rotation = new THREE.Quaternion(),
    scale = new THREE.Vector3();
  let returning = 1;
  function pose(index: number, phase: number, stock = state().panelStock) {
    const rig = machine.panel.panelRig;
    rig.root.updateWorldMatrix(true, false);
    track.panelFrame(index, rest);
    local.copy(rig.root.matrixWorld).invert().multiply(rest);
    local.decompose(target, rotation, scale);
    const yaw = Math.atan2(local.elements[8]!, local.elements[10]!);
    return rig.pose(phase, stock, target, yaw);
  }
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
      track.presentPanel(index, pose(index, phase));
    } else {
      returning = Math.min(1, returning + dt / 0.65);
      machine.panel.panelRig.pose(returning, current.panelStock, target, 0, true);
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
