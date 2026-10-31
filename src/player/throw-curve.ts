// The numbers of a throw, pure (no three.js) so a test can pin them: how long a throw charges, how hard each kind of
// thing flies, and the launch velocity. src/player/throw.ts reads the camera and the hand and calls these. Serves
// DESIGN.md 10 (slapstick: every throw feels the same, whatever you hold).
//
//   flight   'ball' the beach ball's own physics body (src/physics/ball.js), 'plain' an ordinary thing and 'glide' the
//            frisbee, both scripted flights (src/physics/flight.js)
export type Profile = {
  power0: number; // m/s at no charge
  powerK: number; // extra m/s at full charge
  aimUp: number; // added to the aim's y before it is normalized: a throw is aimed a little high
  lift: number; // m/s added upward
  inherit: number; // share of your own horizontal velocity the thing keeps
  flight: 'ball' | 'plain' | 'glide';
};

export const PROFILES: Record<'ball' | 'item' | 'frisbee', Profile> = {
  ball: { power0: 8, powerK: 20, aimUp: 0.12, lift: 1.5, inherit: 0.5, flight: 'ball' },
  item: { power0: 8, powerK: 20, aimUp: 0.12, lift: 1.5, inherit: 0.5, flight: 'plain' },
  frisbee: { power0: 9, powerK: 15, aimUp: 0.03, lift: 0.5, inherit: 0.5, flight: 'glide' },
};

export const CHARGE_MS = 900; // a full charge
export const AIM_DIST = 30; // metres ahead of the camera that a throw is aimed at

type V3 = { x: number; y: number; z: number };

export const chargeOf = (heldMs: number) => Math.min(1, Math.max(0, heldMs / CHARGE_MS));
export const power = (profile: Profile, c: number) => profile.power0 + c * profile.powerK;
export const profileFor = (id: string | null | undefined): Profile =>
  id === 'ball' ? PROFILES.ball : id === 'frisbee' ? PROFILES.frisbee : PROFILES.item;

// dir: the unit direction from the hand to the aim point; bodyV: your own velocity.
export function launchVelocity(profile: Profile, c: number, dir: V3, bodyV: V3): V3 {
  const y = dir.y + profile.aimUp;
  const len = Math.sqrt(dir.x * dir.x + y * y + dir.z * dir.z) || 1;
  const pw = power(profile, c);
  return {
    x: (dir.x / len) * pw + bodyV.x * profile.inherit,
    y: (y / len) * pw + profile.lift,
    z: (dir.z / len) * pw + bodyV.z * profile.inherit,
  };
}
