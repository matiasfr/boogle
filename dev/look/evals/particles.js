// 200 long-lived soft particles beside the court, for checking particle size and softness.
const { emit } = await import('/src/render/particles.ts');
const C = window.boogle.THREE.Color;
for (let k = 0; k < 200; k++)
  emit({
    x: 11 + Math.random() * 3,
    y: 1 + Math.random() * 2,
    z: 22 + Math.random() * 3,
    life: 60,
    size: 0.25 + Math.random() * 0.3,
    color: new C('#f4fbff'),
    alpha: 0.85,
  });
