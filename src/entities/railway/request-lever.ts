// Record-authored lever, retaining the owning view's animation and request provider.
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { haltKitPlacements } from '../../prefab/catalogue.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { leverControl } from '../../prefab/builders/halt-lever.ts';
export type { RequestLever } from '../../prefab/builders/halt-lever.ts';
export function createRequestLever(owner: OwnedView, id: string, targets: () => Interactable[]) {
  const p = haltKitPlacements.find((p) => p.id === id);
  if (!p) throw new Error(`halt lever: missing placement ${id}`);
  const instance = instantiate(p.prefab, p, { owner, handlers: { 'railway.request-stop': targets } });
  instance.setEnabled(true);
  const control = leverControl(instance.root.children[0]!);
  return { ...control, targets: instance.targets };
}
