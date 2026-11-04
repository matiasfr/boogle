// Local input ownership only. This leaf loads no Dev tools and changes no avatar or room state.
export const devInput = { camera: false, dock: false, cursor: false };
export const devInputBlocked = () => devInput.camera || devInput.dock;
export const devCursorFree = () => devInputBlocked() || devInput.cursor;
