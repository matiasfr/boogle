// Which move has the body each fixed step, in one place (docs/brainstorms/glider-placement.md, call 5): the hook beats the
// glide (a pull closes the canopy), and the glide beats the jump (Jump in the air opens the canopy only once no air jump
// is left, and an air jump while it's open re-arms it to catch you again). Runs at the railway kind's fixedPre (43),
// after the controller; the glide's own velocity note runs before it (railway-glide, 23).
type Hook = { fixedPre: () => boolean };
type AirJump = { fixedPre: () => boolean };
type Glide = { close: () => void; fixedPre: (airJumped: boolean) => void };
export function stepMoves(hook: Hook, jump: AirJump, glide: Glide) {
  if (hook.fixedPre()) return glide.close();
  glide.fixedPre(jump.fixedPre());
}
