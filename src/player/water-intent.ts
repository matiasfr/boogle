// Local input for the owner's existing body. No renderer, DOM or new network state.
// The water feature enables this only on its staged path and the retained water demo.
export const waterIntent = { enabled: false, diving: false };

export function releaseDive() {
  waterIntent.diving = false;
}
