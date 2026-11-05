// Real walking inputs, then a controlled camera turn while walking. No teleports or fake game clock.
const { input } = await import('/src/player/input.ts' as string);
const { cam } = await import('/src/player/player.ts' as string);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
void (async () => {
  input.keys.add('KeyW');
  try {
    await wait(1500);
    for (let i = 0; i < 30; i++) {
      cam.yaw += 0.025;
      await wait(33);
    }
    await wait(500);
  } finally {
    input.keys.delete('KeyW');
  }
})();
export {};
