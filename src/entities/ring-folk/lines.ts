// The island folk's copy, verbatim from docs/plans/ring-island-build1.md, "Copy" (drafts for the owner; none of The
// Boogler's). Each line is tied to a fact in shape.ts (`linesFor`); nothing here is invented beyond the table.
//
// Suspect lines for the owner: the two new early-arrival lines (`early`, `swamAcross`), and "The picture only had one
// box" (`coop`) in a room of three or four. "Rivet" now sits beside the prompt "Strike the rivet" (kept, 10 November).
// The Hooter lines are the table's "with the whistle, rotating": barked in a bubble at each whistle (the shift picks
// the line) and also spoken on Talk.

export const RIVET = {
  /** Any time. */
  any: [
    "Don't look at me. Look up. Thank you. Now you can look at me.",
    'We set every bolt a little wrong. Out of respect.',
  ],
  /** After `joined`. */
  joined: 'Your railway bowed on the way in. Good manners.',
  /** New, before `joined`, and only to someone who arrived wet (a swim in the last 60 s; call 38). Suspect. */
  early: "You're early. The railway isn't. Look up while you drip.",
} as const;

export const SQUINT = {
  /** Any time. */
  any: "I've watched the south for the whistling thing my whole life. Also I watched you.",
  /** Only if you glided the gap (local memory). */
  glided: 'You fell out of the sky.',
  /** New: if you swam over and never glided. Suspect. */
  swamAcross: 'I watched you swim the whole way. Very slowly. Very bravely.',
  /** After your first ride over the joint. */
  firstRide: "It was bigger in the picture. It's fine. Pictures are always bigger.",
  /** Co-op: after `joined`, two or more in the room. Suspect in a room of three or four. */
  coop: 'Two of you? The picture only had one box.',
} as const;

/** With the whistle, rotating. */
export const HOOTER = ['Shift change! Eyes up!', 'Nobody blink!', 'Shift change! Same eyes.'] as const;
