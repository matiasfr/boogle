// Drop is a tap or a hold (docs/brainstorms/station-deposit.md build 0): a tap puts one piece down when you let go; held
// for DROP_HOLD_MS it puts the whole back down in one go, with the throw's charge bar filling toward it (hud.ts). Pure,
// so a test can pin the decision; src/player/cargo-drop.ts feeds it the clock and the control's edges.
export const DROP_HOLD_MS = 400; // the throw's full charge is 900 ms (throw-curve.ts); a drop's commitment is shorter

type Acts = { tap: () => void; all: () => void };

export function createDropHold({ tap, all }: Acts) {
  let since = -1,
    fired = false;
  /** Progress 0..1 while held and not yet fired, else 0. */
  const progress = (now: number) => (since < 0 || fired ? 0 : Math.min(1, (now - since) / DROP_HOLD_MS));
  return {
    /** A press. With `holdable` false there is nothing more than one piece to put down: tap on the spot. */
    down(now: number, holdable: boolean) {
      if (!holdable) return tap();
      since = now;
      fired = false;
    },
    /** Every frame while pressed: the hold fires once at the threshold. */
    tick(now: number) {
      if (since < 0 || fired || now - since < DROP_HOLD_MS) return;
      fired = true;
      all();
    },
    /** A release before the threshold is a tap. */
    up(now: number) {
      if (since >= 0 && !fired && now - since < DROP_HOLD_MS) tap();
      since = -1;
      fired = false;
    },
    cancel() {
      since = -1;
      fired = false;
    },
    /** Whether a press is waiting on the threshold. */
    holding: () => since >= 0 && !fired,
    progress,
  };
}
