// Shared page code for shots (clip.mjs skips files starting with _).

// Put the player on the ground at (x, z), still; returns the ground height there.
export const STAND = (x, z) => `
  const { groundHeight } = await import('/src/adapters/terrain.ts');
  const b = window.boogle.me.body;
  b.position.set(${x}, groundHeight(${x}, ${z}) + 1, ${z}); b.velocity.set(0, 0, 0);
  return groundHeight(${x}, ${z});`;
