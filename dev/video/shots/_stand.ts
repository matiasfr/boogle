// Shared page code for shots (clip.ts skips files starting with _).

// Put the player on the ground at (x, z), still; returns the ground height there.
export const STAND = (x: number, z: number) => `
  const { groundHeight } = await import('/src/island/terrain.ts');
  const b = window.boogle.me.body;
  b.position.set(${x}, groundHeight(${x}, ${z}) + 1, ${z}); b.velocity.set(0, 0, 0);
  return groundHeight(${x}, ${z});`;
