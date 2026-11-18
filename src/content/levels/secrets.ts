// Where the secrets' fixed things stand (src/entities/finds/secrets-place.ts resolves them on load; the artifact holds
// these operands, not their product). In level order, which is the order they are drawn and made solid.
//
// - `on` says what `pos` is measured from, in Place's frame (src/place/layout.ts: x from ORIGIN, z as is): `pad:<id>`
//   the middle of that pad's top (src/place/tech-layout.ts PADS), `secret:<id>` where that secret's box stands
//   (SECRETS: its y, or the ground there). `edge: [ex, ez]` moves it ex and ez of the pad's half-widths out.
// - `ground`: pos's y is from the ground under the thing instead.
// - `fit` sizes a thing from its pad: `slab` (both widths, `thick` deep, its top at pos), `block` (both widths less
//   `inset`, from half a metre into the ground up to pos), `column` (from half a metre into the ground, or a metre
//   under pos if that is lower, up to pos).
// - `face`: a clue turns to point its +x back at what it is measured from; otherwise `yaw` turns it.
// - `holds`: the secret whose box stands on it (at its `box` point), instead of at SECRETS' spot.
// - `tilt` pitches it, in fractions of a whole turn.
import { defineLevel, type JsonObject, type Placement, type PrefabKey } from '../../prefab/types.ts';

const thing = (id: string, prefab: PrefabKey, on: string, pos: [number, number, number], params: JsonObject = {}) =>
  ({ id, prefab, pos, params: { on, ...params } }) satisfies Placement;

export const levels = [
  defineLevel({
    place: 'secrets',
    placements: [
      // The helmet's way down the sea stack: from its south edge, inclined 45 degrees into the sea.
      thing('helmet-escape', 'railway.sea-ladder', 'pad:stack', [0, 0.1, 0], { edge: [0, 1], tilt: 0.125 }),
      // The ledges no ring serves (the lookout's, the balcony's, the stack's): Place's pads, stone 1.2 m or wood 0.4 m.
      thing('lookout-pad', 'secrets.stone-pad', 'pad:lookout', [0, 0, 0], { fit: 'slab', thick: 1.2 }),
      thing('stack-pad', 'secrets.stone-pad', 'pad:stack', [0, 0, 0], { fit: 'slab', thick: 1.2 }),
      thing('balcony-ledge', 'secrets.ledge', 'pad:balcony', [0, 0, 0], { fit: 'slab', thick: 0.4 }),
      // Solid all the way down: under the lookout's pad, and the loft's rock under its slab (the hook view's, 0.9 m, as
      // every ring's slab).
      thing('lookout-block', 'secrets.support', 'pad:lookout', [0, -1.2, 0], { fit: 'block', inset: 0.1 }),
      thing('loft-rock', 'secrets.support', 'pad:loft', [0, -0.9, 0], { fit: 'block', inset: 0.1 }),
      thing('balcony-column', 'secrets.balcony-column', 'pad:balcony', [0, -0.4, 0], { fit: 'column' }),
      thing('stack-column', 'secrets.stack-column', 'pad:stack', [0, -1.2, 0], { fit: 'column' }),
      // The tower's boxes stand a metre up on plinths. The first stands on t0's east edge, not Place's north one:
      // that's where you walk off back down to p2, and its plinth stood in the way (builder default, F2;
      // docs/agent-calls.md). Both of t0's pulls leave from the west.
      thing('firstpull-plinth', 'secrets.plinth', 'pad:t0', [2.1, 0.5, 0], { holds: 'firstpull' }),
      thing('nook-plinth', 'secrets.plinth', 'secret:nook', [0, -0.5, 0], { holds: 'nook' }),
      // The yard sits behind the cottage: laundry and its gift invite a detour, leaving the shore-to-town approach
      // clear. The fence keeps its opening on the east.
      thing('yard-laundry', 'secrets.laundry', 'secret:yard', [-2.5, 0, -3.5], { yaw: 0.25 }),
      { ...thing('yard-fence-west', 'secrets.fence', 'secret:yard', [-3.1, 0.5, 0.5]), scale: [0.14, 1, 8] },
      { ...thing('yard-fence-south', 'secrets.fence', 'secret:yard', [0, 0.5, 4.7]), scale: [6.2, 1, 0.14] },
      // The lookout: a scarf caught on a dead branch, over the shelf you'd pass under.
      thing('lookout-scarf', 'secrets.scarf-branch', 'pad:lookout', [-1.6, 0, 1.6], { yaw: 0.6 }),
      // The bell: a little bell under a bracket on the bank, under the trestle. You hear it as you cross the footbridge.
      // The post stands on the dry bank east of the crate, on its own ground height, with the bracket reaching back over
      // the crate; west of the crate the bank drops into the river.
      thing('bell-post', 'secrets.bell-post', 'secret:bell', [1.7, 0, 0.9], { ground: true, face: true }),
      // The loft: a yellow hard hat's worth of colour up on the rock.
      thing('loft-hat', 'secrets.hard-hat', 'pad:loft', [1.5, 0, 1.8], { yaw: 0.3 }),
      // The balcony: a canopy-shaped weather vane, seen from the first steps of the game.
      thing('balcony-vane', 'secrets.weather-vane', 'pad:balcony', [-2, 0, -2], { yaw: 0.5 }),
      // The stack: a bright flag, off the side of the sea trestle.
      thing('stack-flag', 'secrets.flag', 'pad:stack', [2, 0, -2], { yaw: 1 }),
    ],
  }),
];
